#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Shared launcher for the headless-Chrome verification suites.

Every suite drives the real page in headless Chrome over the DevTools
protocol. Two things made the launch unreliable on a cold CI runner:

- A fixed sleep before connecting to the debugging port. Chrome needs
  longer than that to open the port on a cold runner, and the suite then
  failed with "connection refused" for a reason that had nothing to do
  with the page.
- A shared default profile directory. The three suites would race each
  other for the same profile lock.

This module waits for the debugging port to actually answer, gives each
suite its own profile directory, and surfaces Chrome's own stderr when
the launch fails.
"""

import json
import os
import shutil
import socket
import subprocess
import tempfile
import time
import urllib.error
import urllib.request

#: How long to wait for Chrome to open its debugging port.
CDP_READY_TIMEOUT_SECONDS = 45.0

#: How long to wait for the local static file server to answer.
HTTP_READY_TIMEOUT_SECONDS = 15.0


class LaunchError(RuntimeError):
    """Raised when Chrome or the static server never became reachable."""


def wait_for_http(url, timeout=HTTP_READY_TIMEOUT_SECONDS):
    """Block until `url` answers, or raise LaunchError."""
    deadline = time.monotonic() + timeout
    last_error = None
    while time.monotonic() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=2) as response:
                response.read()
            return
        except (urllib.error.URLError, OSError) as error:
            last_error = error
            time.sleep(0.2)
    raise LaunchError(f"{url} never answered within {timeout}s: {last_error}")


def wait_for_cdp(port, timeout=CDP_READY_TIMEOUT_SECONDS):
    """Block until the DevTools endpoint answers, or raise LaunchError."""
    deadline = time.monotonic() + timeout
    last_error = None
    while time.monotonic() < deadline:
        try:
            with urllib.request.urlopen(f"http://127.0.0.1:{port}/json", timeout=2) as response:
                return json.loads(response.read().decode())
        except (urllib.error.URLError, OSError, ValueError) as error:
            last_error = error
            time.sleep(0.25)
    raise LaunchError(
        f"Chrome never opened its debugging port {port} within {timeout}s: {last_error}"
    )


def chrome_binary():
    """Locate a Chrome/Chromium binary, or raise LaunchError."""
    for name in ("google-chrome", "google-chrome-stable", "chromium", "chromium-browser"):
        path = shutil.which(name)
        if path:
            return path
    raise LaunchError("no Chrome or Chromium binary found on PATH")


def launch_chrome(port_cdp, page_url, log_path):
    """Start headless Chrome with its own profile and debugging port.

    Returns the process handle. The caller owns terminating it.
    """
    profile = tempfile.mkdtemp(prefix="idlescreen-chrome-")
    log = open(log_path, "wb")
    argv = [
        chrome_binary(),
        "--headless=new",
        f"--remote-debugging-port={port_cdp}",
        f"--user-data-dir={profile}",
        "--no-sandbox",
        "--disable-gpu",
        "--disable-dev-shm-usage",
        "--no-first-run",
        "--no-default-browser-check",
        "--window-size=1200,800",
        page_url,
    ]
    try:
        return subprocess.Popen(argv, stdout=log, stderr=subprocess.STDOUT)
    except OSError as error:
        log.close()
        raise LaunchError(f"could not start Chrome: {error}") from error


def port_is_free(port):
    """True when nothing is listening on `port`."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as probe:
        probe.settimeout(0.2)
        return probe.connect_ex(("127.0.0.1", port)) != 0


def wait_for_ready(evaluate, expected_url=None, ready_selector=None, timeout=30.0):
    """Block until the page is loaded and, optionally, at the expected URL.

    Two things happen after the DevTools socket is up: the page target
    still holds `about:blank` for a moment before Chrome navigates it, and
    the document keeps parsing afterwards. Querying the DOM in that window
    sees a blank document, so the elements under test are simply not there.

    The URL alone is not a reliable signal: Chrome updates `location.href`
    at the start of a navigation, while the document behind it is still the
    old one. A selector that only exists in the real page is what proves the
    new document is the one being inspected.
    """
    deadline = time.monotonic() + timeout
    state = None
    href = None
    while time.monotonic() < deadline:
        try:
            state = evaluate("document.readyState")
            href = evaluate("location.href")
            at_url = expected_url is None or expected_url in (href or "")
            if state == "complete" and at_url:
                if ready_selector is None:
                    return
                probe = f"Boolean(document.querySelector({json.dumps(ready_selector)}))"
                if evaluate(probe):
                    return
        except (OSError, ValueError):
            state = "<error>"
        time.sleep(0.2)
    raise LaunchError(
        "the page never became ready "
        f"(last state: {state}, last url: {href}, expected url: {expected_url}, "
        f"selector: {ready_selector})"
    )


def chrome_stderr_tail(log_path, limit=40):
    """Tail Chrome's log so a launch failure explains itself."""
    try:
        with open(log_path, "r", errors="replace") as handle:
            lines = handle.read().splitlines()
    except OSError:
        return ""
    return "\n".join(lines[-limit:])
