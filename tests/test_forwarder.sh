#!/bin/sh
# Test idlescreen.github.io/install.sh entry forwarder:
# flags, self-verification, downstream hash verification, and argument passthrough.
set -eu

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT INT TERM

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
SCRIPT="$SCRIPT_DIR/install.sh"
fail=0

# 1. Help flag
if "$SCRIPT" --help >/dev/null 2>&1; then
    echo "ok: --help exits 0"
else
    echo "FAIL: --help exited non-zero"
    fail=$((fail + 1))
fi

# 2. --verify-self with no expected hash: must exit 2
if "$SCRIPT" --verify-self 2>/dev/null; then
    echo "FAIL: --verify-self with no expected should exit 2"
    fail=$((fail + 1))
else
    code=$?
    if [ "$code" -ne 2 ]; then
        echo "FAIL: --verify-self exit code was $code, want 2"
        fail=$((fail + 1))
    else
        echo "ok: --verify-self with no expected exits 2"
    fi
fi

# 3. --verify-self with non-existent path: must exit 1
HASH=$(sha256sum "$SCRIPT" | awk '{print $1}')
if "$SCRIPT" --verify-self "$HASH" "/nonexistent/install.sh" 2>/dev/null; then
    echo "FAIL: --verify-self with non-existent path returned success"
    fail=$((fail + 1))
else
    echo "ok: --verify-self with non-existent path refuses"
fi

# 4. --verify-self with short hash: must exit 1
if "$SCRIPT" --verify-self "deadbeef" "$SCRIPT" 2>/dev/null; then
    echo "FAIL: --verify-self with short hash returned success"
    fail=$((fail + 1))
else
    echo "ok: --verify-self with short hash refuses"
fi

# 5. --verify-self with wrong 64-char hash: must exit 1
if "$SCRIPT" --verify-self "0000000000000000000000000000000000000000000000000000000000000000" "$SCRIPT" 2>/dev/null; then
    echo "FAIL: --verify-self with wrong hash returned success"
    fail=$((fail + 1))
else
    echo "ok: --verify-self with wrong hash refuses"
fi

# 6. --verify-self with real hash: must exit 0
if "$SCRIPT" --verify-self "$HASH" "$SCRIPT" >/dev/null 2>&1; then
    echo "ok: --verify-self with real hash accepts"
else
    echo "FAIL: --verify-self with real hash returned non-zero"
    fail=$((fail + 1))
fi

# 7. Downstream hash verification: tampered downstream installer must fail closed
FAKE_TARGET="$TMP/fake_installer.sh"
echo 'echo "I AM FAKE"' > "$FAKE_TARGET"
BAD_OUT="$TMP/bad.out"
_bad_rc=0
IDLESCREEN_INSTALLER_URL="file://$FAKE_TARGET" "$SCRIPT" > "$BAD_OUT" 2>&1 || _bad_rc=$?

if [ "$_bad_rc" -ne 0 ] && grep -q 'hash mismatch on packages/install.sh' "$BAD_OUT"; then
    echo "ok: tampered downstream installer fails closed with hash mismatch"
else
    echo "FAIL: tampered downstream installer did not fail closed (rc=$_bad_rc)"
    sed 's/^/    /' "$BAD_OUT"
    fail=$((fail + 1))
fi

# 8. Downstream hash verification: valid downstream installer succeeds and receives arguments
GOOD_TARGET="$TMP/good_installer.sh"
cat > "$GOOD_TARGET" <<'EOF'
#!/bin/sh
echo "GOOD_INSTALLER_EXECUTED with args: $*"
exit 0
EOF
GOOD_HASH=$(sha256sum "$GOOD_TARGET" | awk '{print $1}')
GOOD_OUT="$TMP/good.out"
IDLESCREEN_INSTALLER_URL="file://$GOOD_TARGET" \
IDLESCREEN_INSTALLER_HASH="$GOOD_HASH" \
"$SCRIPT" --custom-arg test-value > "$GOOD_OUT" 2>&1

if grep -q 'GOOD_INSTALLER_EXECUTED with args: --custom-arg test-value' "$GOOD_OUT"; then
    echo "ok: valid downstream installer verified and executed with passed arguments"
else
    echo "FAIL: valid downstream installer failed execution:"
    sed 's/^/    /' "$GOOD_OUT"
    fail=$((fail + 1))
fi

# 9. --verify prints forwarder sha256
VERIFY_OUT="$TMP/verify.out"
IDLESCREEN_INSTALLER_URL="file://$GOOD_TARGET" \
IDLESCREEN_INSTALLER_HASH="$GOOD_HASH" \
"$SCRIPT" --verify > "$VERIFY_OUT" 2>&1

if grep -q 'SHA-256 of canonical entry forwarder' "$VERIFY_OUT" && grep -q "$HASH" "$VERIFY_OUT"; then
    echo "ok: --verify prints entry forwarder SHA-256"
else
    echo "FAIL: --verify did not print forwarder hash:"
    sed 's/^/    /' "$VERIFY_OUT"
    fail=$((fail + 1))
fi

if [ "$fail" -eq 0 ]; then
    echo "all forwarder checks passed"
    exit 0
else
    echo "$fail check(s) failed"
    exit 1
fi
