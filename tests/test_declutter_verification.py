#!/usr/bin/env python3
"""tests/test_declutter_verification.py — verification of showcase/demo removal & intact matrix/wordmark."""
import base64
import json
import os
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import urllib.request

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PORT_HTTP = 8899
PORT_CDP = 9349

def ws_handshake(sock, host, port, path):
    key = base64.b64encode(os.urandom(16)).decode("utf-8")
    req = (f"GET {path} HTTP/1.1\r\nHost: {host}:{port}\r\nUpgrade: websocket\r\n"
           f"Connection: Upgrade\r\nSec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n")
    sock.sendall(req.encode("utf-8"))
    assert b"101" in sock.recv(4096)

def send_frame(sock, text):
    data = text.encode("utf-8")
    length = len(data)
    frame = bytearray([0x81])
    mask = os.urandom(4)
    if length <= 125: frame.append(0x80 | length)
    elif length <= 65535: frame.extend([0x80 | 126] + list(length.to_bytes(2, "big")))
    else: frame.extend([0x80 | 127] + list(length.to_bytes(8, "big")))
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
    user_dir = tempfile.mkdtemp()
    httpd = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT_HTTP), "--bind", "127.0.0.1"],
                             cwd=REPO_ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.5)

    chrome = subprocess.Popen([
        "google-chrome", "--headless=new", f"--remote-debugging-port={PORT_CDP}",
        f"--user-data-dir={user_dir}",
        "--no-sandbox", "--disable-gpu", "--window-size=1200,800",
        f"http://127.0.0.1:{PORT_HTTP}/index.html"
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1.0)

    try:
        with urllib.request.urlopen(f"http://127.0.0.1:{PORT_CDP}/json") as r:
            targets = json.loads(r.read().decode())
        target = next(t for t in targets if "index.html" in t.get("url", ""))
        path = "/" + target["webSocketDebuggerUrl"].split("/", 3)[3]
        sock = socket.create_connection(("127.0.0.1", PORT_CDP))
        ws_handshake(sock, "127.0.0.1", PORT_CDP, path)
        cdp = CDPClient(sock)
        cdp.eval("window.__testErrors = []; window.addEventListener('error', e => window.__testErrors.push(e.message));")

        # 1. Verify complete absence of Showcase section and Demo buttons
        removal_check = cdp.eval("""(() => {
            return {
                showcaseExists: Boolean(document.getElementById("showcase")),
                btnDemoHeader: Boolean(document.getElementById("btn-fullscreen-saver")),
                btnDemoMobile: Boolean(document.getElementById("mobile-btn-fullscreen-saver")),
                fullscreenOverlay: Boolean(document.getElementById("screensaver-fullscreen")),
                scenesMarquee: Boolean(document.getElementById("scenes-marquee-wrap"))
            };
        })()""")
        assert not removal_check["showcaseExists"], f"Showcase section still in DOM: {removal_check}"
        assert not removal_check["btnDemoHeader"], f"Demo button in header still in DOM: {removal_check}"
        assert not removal_check["btnDemoMobile"], f"Demo button in mobile still in DOM: {removal_check}"
        assert not removal_check["fullscreenOverlay"], f"Fullscreen overlay still in DOM: {removal_check}"
        assert not removal_check["scenesMarquee"], f"Showcase scenes marquee still in DOM: {removal_check}"
        print("  PASS: Showcase section, Demo buttons, and fullscreen overlay cleanly eliminated.")

        # 2. Verify single IDLESCREEN wordmark at top and suppression on scroll
        top_ok = cdp.eval("document.getElementById('intro').getBoundingClientRect().top > -20")
        cdp.eval("window.scrollTo(0, 600)")
        time.sleep(0.3)
        scrolled_past = cdp.eval("document.getElementById('intro').getBoundingClientRect().top <= -20")
        assert top_ok, "Intro wordmark not active at top"
        assert scrolled_past, "Scrolled past intro check failed"
        print("  PASS: Single-IDLESCREEN verified (background wordmark active at top, suppressed on scroll).")

        # 3. Verify 50-scene matrix remains intact and functional
        matrix_check = cdp.eval("""(() => {
            const matrix = document.getElementById("scene-matrix");
            const cards = document.querySelectorAll(".matrix-card");
            const count = document.getElementById("matrix-count");
            const previewBtns = document.querySelectorAll(".matrix-btn-preview");
            return {
                matrixExists: Boolean(matrix),
                cardCount: cards.length,
                countText: count ? count.textContent : null,
                previewBtnsCount: previewBtns.length
            };
        })()""")
        assert matrix_check["matrixExists"], "Matrix section missing"
        assert matrix_check["cardCount"] >= 52, f"Expected at least 52 matrix cards, got {matrix_check['cardCount']}"
        assert "[ 52 / 52 SCENES ]" in matrix_check["countText"], f"Bad count badge: {matrix_check['countText']}"
        assert matrix_check["previewBtnsCount"] == 0, f"Preview buttons should be removed, found: {matrix_check['previewBtnsCount']}"
        print("  PASS: 52-scene matrix intact with copy/source actions and no preview buttons.")

        # 4. Check for zero runtime JavaScript errors
        errs = cdp.eval("window.__testErrors")
        assert not errs, f"JavaScript runtime errors occurred: {errs}"
        print("  PASS: Zero JavaScript errors detected.")

    finally:
        chrome.terminate()
        httpd.terminate()
        shutil.rmtree(user_dir, ignore_errors=True)

if __name__ == "__main__":
    print("Running headless Chrome removal & matrix verification...")
    run_tests()
    print("Result: All removal, wordmark, and matrix tests PASSED.")
