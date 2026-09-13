#!/bin/sh
# IdleScreen installer — canonical entry point.
#
#   curl -fsSL https://idlescreen.github.io/install.sh | sh
#
# Thin forwarder: the real installer — and its sha256-pinned module
# bootstrap — lives in the signed package channel where it is versioned.
# All flags (--verify, --verify-self, --plan, ...) pass through to it.
set -eu

INSTALLER_URL="https://idlescreen.github.io/packages/install.sh"

if ! command -v curl >/dev/null 2>&1; then
    echo "install: curl is required" >&2
    exit 1
fi

_dir="$(mktemp -d)"
trap 'rm -rf "$_dir"' EXIT INT TERM
curl -fsSL "$INSTALLER_URL" -o "$_dir/install.sh" \
    || { echo "install: failed to download $INSTALLER_URL" >&2; exit 1; }
sh "$_dir/install.sh" "$@"
