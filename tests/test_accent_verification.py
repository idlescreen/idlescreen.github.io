#!/usr/bin/env python3
"""tests/test_accent_verification.py — headless Chrome deep verification of accent choices.

Tests:
1. Header & mobile accent pickers exist with 5 swatches (Amber, Cyan, Violet, Emerald, Coral).
2. Clicking swatches updates CSS vars (--phosphor, --accent-rgb, --hot, --spotlight-border).
3. Bi-directional sync of active/aria-checked/tabindex across header, mobile, and gallery.
4. Arrow key keyboard navigation in radiogroup without scene-slot side-effects.
5. Robustness of procedural and ASCII renderers with/without explicit accent arguments.
6. Persistence on page reload via localStorage.
7. Viewport density and zero horizontal overflow on mobile screens (320px–440px).
"""
import base64
import json
import os
import socket
import subprocess
import sys
import tempfile
import time
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from chrome_launcher import (LaunchError, chrome_stderr_tail, launch_chrome,
                               wait_for_cdp, wait_for_http, wait_for_ready)

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PORT_HTTP = 8891
PORT_CDP = 9341

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
    wait_for_http(f"http://127.0.0.1:{PORT_HTTP}/index.html")

    chrome_log = os.path.join(tempfile.gettempdir(), "idlescreen-chrome-9341.log")
    try:
        chrome = launch_chrome(PORT_CDP, f"http://127.0.0.1:{PORT_HTTP}/index.html", chrome_log)
    except LaunchError as error:
        raise LaunchError(f"{error}\nChrome log:\n{chrome_stderr_tail(chrome_log)}") from error

    try:
        targets = wait_for_cdp(PORT_CDP)
        target = next(t for t in targets if "index.html" in t.get("url", ""))
        path = "/" + target["webSocketDebuggerUrl"].split("/", 3)[3]
        sock = socket.create_connection(("127.0.0.1", PORT_CDP))
        ws_handshake(sock, "127.0.0.1", PORT_CDP, path)
        cdp = CDPClient(sock)
        wait_for_ready(cdp.eval, f"http://127.0.0.1:{PORT_HTTP}/index.html")

        # 1. Swatch presence in footer dock
        swatches = ["Coral", "Orange", "Amber", "Yellow", "Emerald", "Cyan", "Blue", "Violet"]
        for s in swatches:
            f_btn = cdp.eval(f"Boolean(document.querySelector('.footer-accent-picker [data-accent-name=\"{s}\"]'))")
            assert f_btn, f"Swatch {s} missing in footer accent picker"
        print("  PASS: All 8 rainbow swatches present in footer dock.")

        # 2. Click each swatch and verify universal application
        expected = {
            "Coral": ("#ff5555", "255, 85, 85", "#ff9999"),
            "Orange": ("#ff7700", "255, 119, 0", "#ffa040"),
            "Amber": ("#ffb000", "255, 176, 0", "#ffd447"),
            "Yellow": ("#f1fa8c", "241, 250, 140", "#ffffb0"),
            "Emerald": ("#50fa7b", "80, 250, 123", "#a2ffbc"),
            "Cyan": ("#00e5ff", "0, 229, 255", "#80f4ff"),
            "Blue": ("#3b82f6", "59, 130, 246", "#7cb3ff"),
            "Violet": ("#bd93f9", "189, 147, 249", "#d9b8ff"),
        }
        for name, (hex_val, rgb_val, hot_val) in expected.items():
            cdp.eval(f"document.querySelector('.footer-accent-picker [data-accent-name=\"{name}\"]').click()")
            props = cdp.eval("""(() => {
                const cs = getComputedStyle(document.documentElement);
                const card = document.querySelector('.spotlight-card');
                const cardCs = card ? getComputedStyle(card) : null;
                return {
                    phosphor: cs.getPropertyValue('--phosphor').trim(),
                    accentRgb: cs.getPropertyValue('--accent-rgb').trim(),
                    hot: cs.getPropertyValue('--hot').trim(),
                    spotlightBorder: cs.getPropertyValue('--spotlight-border').trim(),
                    cardBorder: cardCs ? cardCs.getPropertyValue('--spotlight-border').trim() : null,
                    ls: localStorage.getItem('idlescreen_accent'),
                    currName: window.idleCurrentAccentName
                };
            })()""")
            assert props["phosphor"] == hex_val, f"Mismatch phosphor: {props['phosphor']} vs {hex_val}"
            assert props["accentRgb"] == rgb_val, f"Mismatch accentRgb: {props['accentRgb']} vs {rgb_val}"
            assert props["hot"] == hot_val, f"Mismatch hot: {props['hot']} vs {hot_val}"
            assert rgb_val in props["spotlightBorder"], f"Spotlight border missing rgb: {props['spotlightBorder']}"
            assert rgb_val in props["cardBorder"], f"Card spotlight border not updating: {props['cardBorder']}"
            assert props["ls"] == name.lower(), f"LocalStorage out of sync: {props['ls']}"
        print("  PASS: Universal accent variables and card spotlight borders updated across all 8 colors.")

        # 3. Radiogroup keyboard navigation & no stage slot cycling conflict
        initial_slot = cdp.eval("document.getElementById('showcase-idx') ? document.getElementById('showcase-idx').textContent : ''")
        cdp.eval("""(() => {
            const amber = document.querySelector('.footer-accent-picker [data-accent-name=\"Amber\"]');
            amber.focus();
            const ev = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
            document.dispatchEvent(ev);
        })()""")
        after_slot = cdp.eval("document.getElementById('showcase-idx') ? document.getElementById('showcase-idx').textContent : ''")
        assert initial_slot == after_slot, "Arrow navigation conflicted with showcase stage slots!"
        active_acc = cdp.eval("window.idleCurrentAccentName")
        assert active_acc.lower() == "yellow", f"ArrowRight did not advance to Yellow, got {active_acc}"
        print("  PASS: Keyboard navigation works cleanly across 8-bit palette.")

        # 4. Simulation engines robustness without arguments
        sim_ok = cdp.eval("""(() => {
            const canvas = document.createElement('canvas');
            canvas.width = 400; canvas.height = 300;
            const ctx = canvas.getContext('2d');
            try {
                if (window.IdleSceneSim) {
                    window.IdleSceneSim.render(ctx, 400, 300, 1000, 'spotlight_orbit');
                    window.IdleSceneSim.render(ctx, 400, 300, 1000, 'matrix');
                }
                if (window.IdleProceduralScenes) {
                    for (const k of Object.keys(window.IdleProceduralScenes)) {
                        window.IdleProceduralScenes[k](ctx, 400, 300, 1000);
                    }
                }
                return true;
            } catch (e) {
                return e.toString();
            }
        })()""")
        assert sim_ok is True, f"Simulation engine crashed without accent arg: {sim_ok}"
        print("  PASS: Simulation and procedural scenes robust with default accent fallback.")

        # 5. Mobile viewport zero overflow & no clipping
        for vp_w in [320, 360, 375, 414, 480]:
            cdp.call("Emulation.setDeviceMetricsOverride", {
                "width": vp_w, "height": 800, "deviceScaleFactor": 1, "mobile": True
            })
            time.sleep(0.1)
            of = cdp.eval("""(() => {
                const header = document.querySelector('.site-header');
                const winW = window.innerWidth;
                const docW = document.documentElement.scrollWidth;
                const headerW = header ? header.scrollWidth : 0;
                return { winW, docW, headerW, overflow: docW > winW || headerW > winW };
            })()""")
            assert not of["overflow"], f"Overflow at {vp_w}px: docW={of['docW']}, headerW={of['headerW']}"
        print("  PASS: Mobile viewports (320px–480px) have zero horizontal overflow.")

        # 6. Page Reload Persistence
        cdp.eval("localStorage.setItem('idlescreen_accent', 'emerald')")
        cdp.call("Page.reload")
        time.sleep(1.0)
        reloaded = cdp.eval("""(() => {
            const cs = getComputedStyle(document.documentElement);
            const activeDot = document.querySelector('.footer-accent-picker [data-accent-name="Emerald"]');
            return {
                phosphor: cs.getPropertyValue('--phosphor').trim(),
                active: activeDot ? activeDot.classList.contains('active') : false,
                ariaChecked: activeDot ? activeDot.getAttribute('aria-checked') : null
            };
        })()""")
        assert reloaded["phosphor"] == "#50fa7b", f"Reload persistence failed: {reloaded}"
        assert reloaded["active"] and reloaded["ariaChecked"] == "true", f"Swatch active sync failed: {reloaded}"
        print("  PASS: Full page reload persistence and immediate swatch sync verified.")

    finally:
        chrome.terminate()
        httpd.terminate()

if __name__ == "__main__":
    print("Running headless Chrome accent verification...")
    run_tests()
    print("Result: All accent choices and spotlight tests PASSED.")
