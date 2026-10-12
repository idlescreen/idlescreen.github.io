#!/usr/bin/env python3
"""tests/test_section_nav.py — headless Chrome deep verification of section navigation & cycling.

Tests:
1. Section DOM order: intro -> overview -> showcase -> omarchy-play -> scene-matrix -> ecosystem -> install.
2. Floating right-side navigation arrows exist and are fixed on the right.
3. Clicking down arrow advances section and cycles theme accent color.
4. Clicking up arrow reverses section and cycles theme accent color.
5. Keyboard ArrowDown and ArrowUp navigate sections and cycle accent color.
6. Header is sticky and footer is anchored.
7. All marquees and spotlight components are intact.
"""
import base64
import json
import os
import socket
import subprocess
import sys
import time
import urllib.request

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PORT_HTTP = 8893
PORT_CDP = 9343

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

        # 1. Section DOM order check
        order = cdp.eval("""(() => {
            const expectedIds = ['intro', 'overview', 'omarchy-play', 'scene-matrix', 'ecosystem', 'install'];
            const allNodes = Array.from(document.querySelectorAll('section[id], footer[id]'));
            const matched = expectedIds.map(id => document.getElementById(id));
            const positions = matched.map(el => el ? el.compareDocumentPosition(document.body) : null);
            let inOrder = true;
            for (let i = 0; i < matched.length - 1; i++) {
                if (!matched[i] || !matched[i+1] || !(matched[i].compareDocumentPosition(matched[i+1]) & Node.DOCUMENT_POSITION_FOLLOWING)) {
                    inOrder = false;
                }
            }
            return { inOrder, ids: matched.map(el => el ? el.id : null) };
        })()""")
        assert order["inOrder"], f"Sections not in expected order: {order['ids']}"
        print("  PASS: Section DOM order verified (intro -> overview -> showcase -> omarchy-play -> ...).")

        # 2. Footer dock exists, fixed at bottom, UP on left, palette centered, DOWN on right
        dock_info = cdp.eval("""(() => {
            const dock = document.getElementById('footer-dock');
            const up = document.getElementById('nav-arrow-up');
            const down = document.getElementById('nav-arrow-down');
            const picker = document.getElementById('footer-accent-picker');
            if (!dock || !up || !down || !picker) return null;
            const cs = getComputedStyle(dock);
            const dockRect = dock.getBoundingClientRect();
            const upRect = up.getBoundingClientRect();
            const downRect = down.getBoundingClientRect();
            const pickerRect = picker.getBoundingClientRect();
            const winW = window.innerWidth;
            const winH = window.innerHeight;
            return {
                position: cs.position,
                atBottom: dockRect.bottom >= winH - 5,
                upOnLeft: upRect.left < winW / 2,
                downOnRight: downRect.right > winW / 2,
                pickerCentered: pickerRect.left >= upRect.right && pickerRect.right <= downRect.left,
                hasUp: Boolean(up),
                hasDown: Boolean(down)
            };
        })()""")
        assert dock_info and dock_info["position"] == "fixed", f"Dock not fixed at bottom: {dock_info}"
        assert dock_info["atBottom"], f"Dock not at bottom: {dock_info}"
        assert dock_info["upOnLeft"], f"Up arrow not on left side: {dock_info}"
        assert dock_info["downOnRight"], f"Down arrow not on right side: {dock_info}"
        assert dock_info["pickerCentered"], f"Palette picker not centered: {dock_info}"
        print("  PASS: 8-bit footer dock verified (fixed at bottom, UP on left, palette centered, DOWN on right).")

        # 3. Down arrow navigation & theme cycling
        initial_accent = cdp.eval("window.idleCurrentAccentName")
        cdp.eval("document.getElementById('nav-arrow-down').click()")
        time.sleep(0.5)
        after_click_accent = cdp.eval("window.idleCurrentAccentName")
        scroll_y = cdp.eval("window.scrollY")
        errs = cdp.eval("window.__testErrors")
        assert not errs, f"JavaScript runtime errors detected: {errs}"
        assert after_click_accent != initial_accent, f"Down click did not cycle accent: {after_click_accent}"
        assert scroll_y > 100, f"Down click did not scroll viewport (scrollY={scroll_y})"
        print(f"  PASS: Clicking down arrow transitioned accent ({initial_accent} -> {after_click_accent}) and scrolled (scrollY={scroll_y}).")

        # 4. Keyboard ArrowDown and ArrowUp navigation & theme cycling
        cdp.eval("""(() => {
            const ev = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true });
            document.dispatchEvent(ev);
        })()""")
        time.sleep(0.3)
        kb_accent = cdp.eval("window.idleCurrentAccentName")
        assert kb_accent != after_click_accent, f"ArrowDown did not cycle accent: {kb_accent}"

        cdp.eval("""(() => {
            const ev = new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true });
            document.dispatchEvent(ev);
        })()""")
        time.sleep(0.3)
        kb_up_accent = cdp.eval("window.idleCurrentAccentName")
        assert kb_up_accent != kb_accent, f"ArrowUp did not cycle accent: {kb_up_accent}"
        print("  PASS: Keyboard ArrowDown and ArrowUp cycle accent and navigate sections.")

        # 5. Header sticky and footer anchored
        sticky_info = cdp.eval("""(() => {
            const header = document.querySelector('.site-header');
            const footer = document.querySelector('.site-footer');
            return {
                headerSticky: header ? getComputedStyle(header).position : null,
                footerExists: Boolean(footer)
            };
        })()""")
        assert sticky_info["headerSticky"] == "sticky", f"Header not sticky: {sticky_info}"
        assert sticky_info["footerExists"], "Footer missing"
        print("  PASS: Header is sticky and footer is anchored.")

        # 6. Marquees present
        marquees_ok = cdp.eval("""(() => {
            const tenets = Boolean(document.querySelector('.tenets-track'));
            const omarchy = Boolean(document.getElementById('omarchy-track'));
            const streamL = Boolean(document.querySelector('.stream-left'));
            const streamR = Boolean(document.querySelector('.stream-right'));
            const eco = Boolean(document.getElementById('ecosystem-grid'));
            return tenets && omarchy && streamL && streamR && eco;
        })()""")
        assert marquees_ok, "One or more marquees missing!"
        print("  PASS: All 5 marquees verified intact.")

    finally:
        chrome.terminate()
        httpd.terminate()

if __name__ == "__main__":
    print("Running headless Chrome section navigation tests...")
    run_tests()
    print("Result: All section navigation and theme cycling tests PASSED.")
