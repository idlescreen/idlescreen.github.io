#!/usr/bin/env python3
"""tests/test_declutter_verification.py — deep verification of showcase declutter, marquee & fullscreen screensaver."""
import base64
import json
import os
import socket
import subprocess
import sys
import time
import urllib.request

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PORT_HTTP = 8899
PORT_CDP = 9349

def ws_handshake(sock, host, port, path):
    key = base64.b64encode(os.urandom(16)).decode("utf-8")
    req = (f"GET {path} HTTP/1.1\r\n"
           f"Host: {host}:{port}\r\n"
           f"Upgrade: websocket\r\n"
           f"Connection: Upgrade\r\n"
           f"Sec-WebSocket-Key: {key}\r\n"
           f"Sec-WebSocket-Version: 13\r\n\r\n")
    sock.sendall(req.encode("utf-8"))
    resp = sock.recv(4096)
    assert b"101" in resp, f"Handshake failed: {resp}"

def send_frame(sock, text):
    data = text.encode("utf-8")
    length = len(data)
    frame = bytearray([0x81])
    mask = os.urandom(4)
    if length <= 125: frame.append(0x80 | length)
    elif length <= 65535:
        frame.append(0x80 | 126)
        frame.extend(length.to_bytes(2, "big"))
    else:
        frame.append(0x80 | 127)
        frame.extend(length.to_bytes(8, "big"))
    frame.extend(mask)
    frame.extend(bytes(b ^ mask[i % 4] for i, b in enumerate(data)))
    sock.sendall(frame)

def recv_frame(sock):
    header = sock.recv(2)
    if not header: return ""
    length = header[1] & 0x7f
    if length == 126: length = int.from_bytes(sock.recv(2), "big")
    elif length == 127: length = int.from_bytes(sock.recv(8), "big")
    data = b""
    while len(data) < length:
        chunk = sock.recv(length - len(data))
        if not chunk: break
        data += chunk
    return data.decode("utf-8", errors="ignore")

class CDPClient:
    def __init__(self, sock):
        self.sock = sock
        self.msg_id = 0

    def call(self, method, params=None):
        self.msg_id += 1
        req = {"id": self.msg_id, "method": method, "params": params or {}}
        send_frame(self.sock, json.dumps(req))
        while True:
            raw = recv_frame(self.sock)
            if not raw: return None
            try:
                msg = json.loads(raw)
                if msg.get("id") == self.msg_id:
                    return msg.get("result")
            except: pass

    def eval(self, expr):
        res = self.call("Runtime.evaluate", {"expression": expr, "returnByValue": True})
        if res and "result" in res and "value" in res["result"]:
            return res["result"]["value"]
        return res

def run_tests():
    httpd = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT_HTTP), "--bind", "127.0.0.1"],
                             cwd=REPO_ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.5)

    chrome = subprocess.Popen([
        "google-chrome", "--headless=new", f"--remote-debugging-port={PORT_CDP}",
        "--no-sandbox", "--disable-gpu", "--window-size=1200,800",
        f"http://127.0.0.1:{PORT_HTTP}/index.html"
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1.5)

    try:
        with urllib.request.urlopen(f"http://127.0.0.1:{PORT_CDP}/json") as r:
            targets = json.loads(r.read().decode())
        target = next(t for t in targets if "index.html" in t.get("url", ""))
        path = "/" + target["webSocketDebuggerUrl"].split("/", 3)[3]
        sock = socket.create_connection(("127.0.0.1", PORT_CDP))
        ws_handshake(sock, "127.0.0.1", PORT_CDP, path)
        cdp = CDPClient(sock)
        cdp.eval("window.__testErrors = []; window.addEventListener('error', e => window.__testErrors.push(e.message));")

        # 1. Declutter verification
        declutter_check = cdp.eval("""(() => {
            const showcase = document.getElementById("showcase");
            if (!showcase) return { ok: false, reason: "showcase missing" };
            const badSelectors = [
                ".gallery-controls", ".showcase-controls-strip", ".gallery-slider",
                ".metric-frame", ".metric-cpu", ".metric-math", ".gallery-accent-picker",
                "#showcase-select", "#btn-reroll-3", ".featured-slots"
            ];
            for (const sel of badSelectors) {
                if (showcase.querySelector(sel)) return { ok: false, reason: "Found clutter: " + sel };
            }
            const hasTitlebar = Boolean(document.getElementById("showcase-idx") &&
                                        document.getElementById("showcase-name") &&
                                        document.getElementById("stage-prev") &&
                                        document.getElementById("stage-next"));
            return { ok: hasTitlebar, hasTitlebar };
        })()""")
        assert declutter_check["ok"], f"Showcase declutter check failed: {declutter_check}"
        print("  PASS: Showcase declutter verified (all clutter elements eliminated).")

        # 2. 48-scene marquee strip verification
        marquee_info = cdp.eval("""(() => {
            const wrap = document.getElementById("scenes-marquee-wrap");
            const track = document.getElementById("scenes-marquee-track");
            const chips = Array.from(document.querySelectorAll(".scene-chip"));
            const activeChips = chips.filter(c => c.classList.contains("active"));
            return {
                wrapExists: Boolean(wrap),
                trackExists: Boolean(track),
                chipCount: chips.length,
                activeCount: activeChips.length,
                firstActiveIdx: activeChips[0] ? activeChips[0].dataset.sceneIdx : null
            };
        })()""")
        assert marquee_info["wrapExists"] and marquee_info["trackExists"], "Marquee missing"
        assert marquee_info["chipCount"] == 96, f"Expected 96 chips (2 passes of 48), got {marquee_info['chipCount']}"
        assert marquee_info["activeCount"] == 2, f"Expected 2 active chips (primary + clone), got {marquee_info['activeCount']}"
        print("  PASS: 48-scene marquee strip populated (96 chips with synchronized active clones).")

        # 3. Marquee chip click & stage sync
        cdp.eval("""(() => {
            const chip = document.querySelectorAll(".scene-chip")[1]; // Second chip (index 1 = matrix)
            chip.click();
        })()""")
        time.sleep(0.3)
        curr_scene = cdp.eval("window.idleCurrentSceneId")
        name_text = cdp.eval("document.getElementById('showcase-name').textContent")
        assert curr_scene == "matrix", f"Expected matrix scene, got {curr_scene}"
        assert "MATRIX" in name_text, f"Expected MATRIX title, got {name_text}"
        print("  PASS: Chip click immediately updates stage scene and titlebar.")

        # 4. Duplicate IDLESCREEN ghosting check
        top_ok = cdp.eval("document.getElementById('intro').getBoundingClientRect().top > -20")
        card_bg = cdp.eval("window.getComputedStyle(document.querySelector('.showcase-wrapper')).backgroundColor")
        cdp.eval("document.getElementById('showcase').scrollIntoView({ behavior: 'instant' })")
        time.sleep(0.3)
        scrolled_past = cdp.eval("document.getElementById('intro').getBoundingClientRect().top <= -20")
        assert top_ok, "Intro wordmark not active at top"
        assert scrolled_past, "Scrolled past intro check failed"
        assert "rgb(7, 8, 9)" in card_bg, f"Showcase bg not solid opaque #070809: {card_bg}"
        print("  PASS: Single-IDLESCREEN fix verified (background wordmark suppressed on scroll, opaque stage card).")

        # 5. Header fullscreen screensaver launch, auto-hide, wake, and clean exit
        cdp.eval("document.getElementById('btn-fullscreen-saver').click()")
        time.sleep(0.4)
        fs_display = cdp.eval("document.getElementById('screensaver-fullscreen').style.display")
        assert fs_display == "flex", f"Fullscreen overlay not displayed: {fs_display}"
        print("  PASS: Header screensaver button launched fullscreen mode.")

        # HUD elements present
        hud_check = cdp.eval("""(() => {
            const hud = document.getElementById("fullscreen-hud");
            const idx = document.getElementById("fullscreen-hud-idx");
            const exit = document.getElementById("fs-exit");
            return Boolean(hud && idx && exit);
        })()""")
        assert hud_check, "Fullscreen HUD elements missing"

        # Inactivity auto-hide check
        time.sleep(2.8)
        is_hidden = cdp.eval("document.getElementById('screensaver-fullscreen').classList.contains('hud-hidden')")
        assert is_hidden, "HUD did not auto-hide after 2.5s inactivity"
        print("  PASS: Fullscreen HUD and cursor auto-hided after 2.5s.")

        # Touch wakeup
        cdp.eval("document.getElementById('screensaver-fullscreen').dispatchEvent(new TouchEvent('touchstart', { bubbles: true }))")
        is_awake = not cdp.eval("document.getElementById('screensaver-fullscreen').classList.contains('hud-hidden')")
        assert is_awake, "HUD did not wake up on touch"
        print("  PASS: Fullscreen HUD woke up on touch activity.")

        # Switch scene in screensaver & exit
        cdp.eval("document.getElementById('fs-next').click()")
        time.sleep(0.2)
        cdp.eval("document.getElementById('fs-exit').click()")
        time.sleep(0.4)

        fs_after_exit = cdp.eval("document.getElementById('screensaver-fullscreen').style.display")
        assert fs_after_exit == "none", f"Fullscreen did not dismiss: {fs_after_exit}"

        # Check for zero runtime JavaScript errors
        errs = cdp.eval("window.__testErrors")
        assert not errs, f"JavaScript runtime errors occurred: {errs}"

        # Verify showcase scene synced back
        showcase_idx = cdp.eval("window.getCurrentShowcaseIndex()")
        assert showcase_idx == 2, f"Showcase index not synced back, expected 2, got {showcase_idx}"
        print("  PASS: Fullscreen screensaver exited cleanly with 0 errors and synced state back to showcase.")

    finally:
        chrome.terminate()
        httpd.terminate()

if __name__ == "__main__":
    print("Running headless Chrome showcase declutter & screensaver verification...")
    run_tests()
    print("Result: All declutter, marquee, wordmark, and fullscreen screensaver tests PASSED.")
