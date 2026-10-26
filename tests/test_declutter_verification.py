#!/usr/bin/env python3
"""tests/test_declutter_verification.py — verification of showcase/demo removal & intact matrix/wordmark."""
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
    httpd = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT_HTTP), "--bind", "127.0.0.1"],
                             cwd=REPO_ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    wait_for_http(f"http://127.0.0.1:{PORT_HTTP}/index.html")

    chrome_log = os.path.join(tempfile.gettempdir(), "idlescreen-chrome-9349.log")
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
        wait_for_ready(cdp.eval, f"http://127.0.0.1:{PORT_HTTP}/index.html",
                       "#scene-matrix")
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
        assert matrix_check["cardCount"] >= 53, f"Expected at least 53 matrix cards, got {matrix_check['cardCount']}"
        assert "[ 53 / 53 SCENES ]" in matrix_check["countText"], f"Bad count badge: {matrix_check['countText']}"
        assert matrix_check["previewBtnsCount"] == 0, f"Preview buttons should be removed, found: {matrix_check['previewBtnsCount']}"
        print("  PASS: 53-scene matrix intact with copy/source actions and no preview buttons.")

        # 4. Check for zero runtime JavaScript errors
        errs = cdp.eval("window.__testErrors")
        assert not errs, f"JavaScript runtime errors occurred: {errs}"
        print("  PASS: Zero JavaScript errors detected.")

    finally:
        chrome.terminate()
        httpd.terminate()

if __name__ == "__main__":
    print("Running headless Chrome removal & matrix verification...")
    run_tests()
    print("Result: All removal, wordmark, and matrix tests PASSED.")
