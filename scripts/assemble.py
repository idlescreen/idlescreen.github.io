#!/usr/bin/env python3
"""scripts/assemble.py — assemble index.html from partials/ with zero dependencies.

Validates partial order, concatenates sections, and supports --check mode for CI.
"""
import os
import sys

PARTIALS_DIR = os.path.join(os.path.dirname(__file__), "..", "partials")
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "..", "index.html")

PARTIAL_ORDER = [
    "header.html",
    "hero.html",
    "omarchy.html",
    "matrix.html",
    "ecosystem.html",
    "install.html",
    "footer.html",
]


def assemble():
    existing = {
        f for f in os.listdir(PARTIALS_DIR)
        if not f.startswith(".") and os.path.isfile(os.path.join(PARTIALS_DIR, f))
    }
    missing = set(PARTIAL_ORDER) - existing
    if missing:
        raise FileNotFoundError(f"Missing required partial(s): {sorted(missing)}")
    extra = existing - set(PARTIAL_ORDER)
    if extra:
        raise ValueError(f"Unregistered partial(s) found: {sorted(extra)}. Update PARTIAL_ORDER.")

    parts = []
    for filename in PARTIAL_ORDER:
        path = os.path.join(PARTIALS_DIR, filename)
        with open(path, "r", encoding="utf-8") as f:
            parts.append(f.read())
    return "".join(parts)


def main():
    check_mode = "--check" in sys.argv
    assembled_content = assemble()

    if check_mode:
        if not os.path.exists(OUTPUT_FILE):
            print(f"FAIL: {OUTPUT_FILE} does not exist", file=sys.stderr)
            sys.exit(1)
        with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
            current_content = f.read()
        if current_content != assembled_content:
            print(f"FAIL: {OUTPUT_FILE} is out of sync with partials/.", file=sys.stderr)
            print("Run 'python3 scripts/assemble.py' to regenerate.", file=sys.stderr)
            sys.exit(1)
        print("OK: index.html matches partials/ exactly.")
        sys.exit(0)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write(assembled_content)
    print(f"Successfully assembled {OUTPUT_FILE} from {len(PARTIAL_ORDER)} partials.")


if __name__ == "__main__":
    main()
