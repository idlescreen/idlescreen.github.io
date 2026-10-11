#!/usr/bin/env python3
"""tests/test_page_rules.py — validate 16–256 line sizing and directory density (<= 8 files).

Enforces the organization's Page Rule across idlescreen.github.io:
1. Every code file (.js, .css, .sh, .py, partials/*.html) has 16 <= lines <= 256.
2. Every directory contains at most 8 files (ignoring hidden dotfiles and .git).
3. index.html is verified to be in exact synchronization with partials/ via assemble.py.
"""
import os
import subprocess
import sys

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
CODE_EXTENSIONS = {".js", ".css", ".sh", ".py"}
EXCLUDE_DIRS = {".git", ".github"}
EXEMPT_CODE_FILES = {"index.html"}  # index.html is the assembled artifact verified separately


def get_repo_directories():
    """Traverse repository directories, excluding git metadata."""
    dirs_to_check = []
    for root, dirs, _ in os.walk(REPO_ROOT):
        rel = os.path.relpath(root, REPO_ROOT)
        parts = rel.split(os.sep) if rel != "." else []
        if any(p in EXCLUDE_DIRS or p.startswith(".git") for p in parts):
            continue
        dirs_to_check.append(root)
    return sorted(dirs_to_check)


def check_directory_density():
    """Ensure no directory contains more than 8 files."""
    violations = []
    for dirpath in get_repo_directories():
        rel = os.path.relpath(dirpath, REPO_ROOT)
        # Count non-hidden regular files
        files = [
            f for f in os.listdir(dirpath)
            if not f.startswith(".") and os.path.isfile(os.path.join(dirpath, f))
        ]
        count = len(files)
        if count > 8:
            violations.append(f"{rel} has {count} files (limit <= 8): {files}")
    return violations


def get_code_files():
    """Collect all source code files requiring the 16–256 line rule."""
    code_files = []
    for dirpath in get_repo_directories():
        for f in os.listdir(dirpath):
            if f.startswith("."):
                continue
            path = os.path.join(dirpath, f)
            if not os.path.isfile(path):
                continue
            rel = os.path.relpath(path, REPO_ROOT)
            ext = os.path.splitext(f)[1]

            # Include partials/*.html and recognized code extensions
            is_code = ext in CODE_EXTENSIONS or (ext == ".html" and "partials" in rel)
            if is_code and rel not in EXEMPT_CODE_FILES:
                code_files.append(path)
    return sorted(code_files)


def count_lines(path):
    """Count physical lines in file."""
    with open(path, "rb") as f:
        return sum(1 for _ in f)


def check_line_sizing():
    """Assert every code file satisfies 16 <= lines <= 256."""
    violations = []
    for path in get_code_files():
        rel = os.path.relpath(path, REPO_ROOT)
        lines = count_lines(path)
        if lines < 16:
            violations.append(f"{rel}: {lines} lines (floor violation: minimum 16)")
        elif lines > 256:
            violations.append(f"{rel}: {lines} lines (ceiling violation: maximum 256)")
    return violations


def check_assembly_sync():
    """Assert assembled index.html is bit-for-bit in sync with partials/."""
    cmd = [sys.executable, os.path.join(REPO_ROOT, "scripts", "assemble.py"), "--check"]
    res = subprocess.run(cmd, cwd=REPO_ROOT, capture_output=True, text=True)
    if res.returncode != 0:
        return [f"index.html assembly drift:\n{res.stderr.strip()}"]
    return []


def main():
    fails = []

    # 1. Directory Density Check
    print("Checking directory density (<= 8 files per directory)...")
    density_issues = check_directory_density()
    if density_issues:
        for err in density_issues:
            print(f"  FAIL: {err}")
        fails.extend(density_issues)
    else:
        print("  PASS: All directories satisfy <= 8 files.")

    # 2. Sizing Invariant Check (16 <= lines <= 256)
    print("Checking code page sizing (16 <= lines <= 256)...")
    sizing_issues = check_line_sizing()
    if sizing_issues:
        for err in sizing_issues:
            print(f"  FAIL: {err}")
        fails.extend(sizing_issues)
    else:
        code_files = get_code_files()
        print(f"  PASS: All {len(code_files)} code files satisfy 16 <= lines <= 256.")

    # 3. Assembly Check
    print("Checking partials assembly synchronization...")
    assembly_issues = check_assembly_sync()
    if assembly_issues:
        for err in assembly_issues:
            print(f"  FAIL: {err}")
        fails.extend(assembly_issues)
    else:
        print("  PASS: index.html is fully synchronized with partials/.")

    if fails:
        print(f"\nResult: FAILED with {len(fails)} violation(s).", file=sys.stderr)
        sys.exit(1)
    else:
        print("\nResult: All page rules and directory density checks PASSED.")
        sys.exit(0)


if __name__ == "__main__":
    main()
