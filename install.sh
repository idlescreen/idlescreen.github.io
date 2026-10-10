#!/bin/sh
# IdleScreen installer — canonical entry point.
#
#   curl -fsSL https://idlescreen.github.io/install.sh | sh
#
# Thin forwarder: the real installer — and its sha256-pinned module
# bootstrap — lives in the signed package channel where it is versioned.
# All flags (--verify, --verify-self, --plan, ...) pass through to it.
#
# Trust architecture:
#   1. This script verifies itself on demand (--verify-self).
#   2. It downloads the packages channel installer and verifies its SHA-256
#      against the pinned EXPECTED_INSTALLER_HASH before execution.
#   3. The packages channel installer verifies each downloaded helper module
#      against pinned SHA-256 checksums before sourcing.
#   4. Package manager repository setup verifies GPG keys and repo signatures.
#
# POSIX-safe: no pipefail — runs cleanly when piped into dash / sh.
set -eu

REPO_BASE="${IDLESCREEN_REPO_BASE:-https://idlescreen.github.io/packages}"
INSTALLER_URL="${IDLESCREEN_INSTALLER_URL:-${REPO_BASE}/install.sh}"

# Pinned SHA-256 hash of the packages channel installer.
# Maintained and synchronized by packages/scripts/sync_installer_checksums.sh.
EXPECTED_INSTALLER_HASH="${IDLESCREEN_INSTALLER_HASH:-5dd06c0854efcfe0dcfb4a912d16e90922e65a36c1e4136766b76fcbe9f13c0d}"

# Handle immediate flags (--verify-self, -h, --help) before network calls
case "${1:-}" in
    --verify-self)
        _expected="${2:-}"
        _script_path="${3:-$0}"
        if [ -z "$_expected" ]; then
            echo "verify-self: missing expected sha256" >&2
            echo "usage: $0 --verify-self <hex> [script-path]" >&2
            exit 2
        fi
        if ! command -v sha256sum >/dev/null 2>&1 && ! command -v shasum >/dev/null 2>&1; then
            echo "verify-self: no sha256sum or shasum on PATH" >&2
            exit 1
        fi
        if [ ! -f "$_script_path" ]; then
            echo "verify-self: file not found: $_script_path" >&2
            exit 1
        fi
        if [ "${#_expected}" -ne 64 ]; then
            echo "verify-self: expected 64-character sha256, got ${#_expected}" >&2
            exit 1
        fi
        if command -v sha256sum >/dev/null 2>&1; then
            _actual=$(sha256sum "$_script_path" 2>/dev/null | awk '{print $1}')
        else
            _actual=$(shasum -a 256 "$_script_path" 2>/dev/null | awk '{print $1}')
        fi
        _expected_lower=$(printf '%s' "$_expected" | tr '[:upper:]' '[:lower:]')
        if [ "$_actual" != "$_expected_lower" ]; then
            echo "verify-self: FAIL — expected $_expected, got $_actual" >&2
            exit 1
        fi
        echo "verify-self: OK ($_actual)"
        exit 0
        ;;
    -h|--help)
        cat <<'USAGE'
Usage: install.sh [options]

  (no options)        install / update IdleScreen
  --uninstall         remove IdleScreen, keeping user configuration
  --purge             with --uninstall: also remove user and system config
  --plan | --dry-run  print the install plan and exit
  --verify            print SHA-256 of the installer and its modules
  --verify-self HEX   fail unless this script's SHA-256 matches HEX
USAGE
        exit 0
        ;;
esac

if ! command -v curl >/dev/null 2>&1; then
    echo "install: curl is required" >&2
    exit 1
fi

# Fetch a remote file with retries on transient errors (503, 5xx, 429, network drops)
fetch_file() {
    _url="$1"
    _out="$2"
    if curl --retry-all-errors --help >/dev/null 2>&1; then
        curl -fsSL --retry 5 --retry-delay 2 --retry-all-errors "$_url" -o "$_out"
    elif curl --retry-connrefused --help >/dev/null 2>&1; then
        curl -fsSL --retry 5 --retry-delay 2 --retry-connrefused "$_url" -o "$_out"
    else
        curl -fsSL --retry 5 --retry-delay 2 "$_url" -o "$_out"
    fi
}

_dir="$(mktemp -d)"
cleanup() {
    if [ -n "$_dir" ] && [ -d "$_dir" ]; then
        rm -rf "$_dir"
    fi
}
trap cleanup EXIT INT TERM

fetch_file "$INSTALLER_URL" "$_dir/install.sh" \
    || { echo "install: failed to download $INSTALLER_URL" >&2; exit 1; }

# Cryptographically verify the downstream installer before running
if [ "${IDLESCREEN_SKIP_VERIFY:-0}" != "1" ]; then
    if [ -z "$EXPECTED_INSTALLER_HASH" ] || [ "${#EXPECTED_INSTALLER_HASH}" -ne 64 ]; then
        echo "install: EXPECTED_INSTALLER_HASH is empty or invalid (${EXPECTED_INSTALLER_HASH:-empty})" >&2
        exit 1
    fi

    if command -v sha256sum >/dev/null 2>&1; then
        _dl_hash=$(sha256sum "$_dir/install.sh" | awk '{print $1}')
    elif command -v shasum >/dev/null 2>&1; then
        _dl_hash=$(shasum -a 256 "$_dir/install.sh" | awk '{print $1}')
    else
        echo "install: no sha256sum or shasum available to verify installer" >&2
        exit 1
    fi

    _expected_dl_hash=$(printf '%s' "$EXPECTED_INSTALLER_HASH" | tr '[:upper:]' '[:lower:]')
    if [ "$_dl_hash" != "$_expected_dl_hash" ]; then
        echo "install: hash mismatch on packages/install.sh!" >&2
        echo "install: expected $EXPECTED_INSTALLER_HASH, got $_dl_hash" >&2
        exit 1
    fi
fi

if [ "${1:-}" = "--verify" ] || [ "${1:-}" = "-V" ] || [ "${1:-}" = "verify" ]; then
    _bname="$(basename "$0" 2>/dev/null || echo "")"
    case "$_bname" in
        sh|bash|dash|ash|zsh|-*|"") ;;
        *)
            if [ -f "$0" ]; then
                if command -v sha256sum >/dev/null 2>&1; then
                    _self_hash=$(sha256sum "$0" 2>/dev/null | awk '{print $1}')
                elif command -v shasum >/dev/null 2>&1; then
                    _self_hash=$(shasum -a 256 "$0" 2>/dev/null | awk '{print $1}')
                else
                    _self_hash=""
                fi
                if [ -n "$_self_hash" ]; then
                    echo "=== SHA-256 of canonical entry forwarder ($0) ==="
                    echo "$_self_hash  $0"
                    echo ""
                fi
            fi
            ;;
    esac
fi

sh "$_dir/install.sh" "$@"
