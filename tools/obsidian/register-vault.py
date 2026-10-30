#!/usr/bin/env python3
"""
Registers a folder as an Obsidian vault and opens it, so "Obsidian configured"
(R42) never waits for someone to click through the vault picker.

Obsidian keeps its vault list in obsidian.json, in its own config folder, and
writes that file whole when it quits: an entry added while the app runs is gone
at the next exit. So the live file is edited only while Obsidian is closed, and
nothing else in it is touched -- other vaults, window state, settings. A folder
already in the list is left as it is.

The folder is the vault graphify exports for the project (R45):

  python -X utf8 tools/obsidian/register-vault.py graphify-out/obsidian --open

Usage:
  python -X utf8 tools/obsidian/register-vault.py <folder> [--open] [--config <obsidian.json>]

Exit codes: 0 registered or already there, 2 no such folder, 3 Obsidian is
running, 4 the vault could not be opened (Obsidian not installed), 5 the vault
list is not valid JSON and was left untouched.

@author Angatu Sistemas
"""
from __future__ import annotations

import argparse
import json
import os
import secrets
import subprocess
import sys
import time
import urllib.parse
from pathlib import Path

FLATPAK_ID = "md.obsidian.Obsidian"


def succeeds(command: list[str]) -> bool:
    try:
        return subprocess.run(command, capture_output=True).returncode == 0
    except OSError:
        return False


def default_config() -> Path:
    home = Path.home()
    if sys.platform == "win32":
        return Path(os.environ.get("APPDATA") or home / "AppData" / "Roaming") / "obsidian" / "obsidian.json"
    if sys.platform == "darwin":
        return home / "Library" / "Application Support" / "obsidian" / "obsidian.json"
    if succeeds(["flatpak", "info", FLATPAK_ID]):
        return home / ".var" / "app" / FLATPAK_ID / "config" / "obsidian" / "obsidian.json"
    return Path(os.environ.get("XDG_CONFIG_HOME") or home / ".config") / "obsidian" / "obsidian.json"


def obsidian_running() -> bool:
    if sys.platform == "win32":
        try:
            listing = subprocess.run(["tasklist", "/FI", "IMAGENAME eq Obsidian.exe", "/NH"],
                                     capture_output=True, text=True, errors="replace").stdout
        except OSError:
            return False
        return "obsidian.exe" in listing.lower()
    return succeeds(["pgrep", "-i", "-x", "obsidian"])


def same_folder(path: str, folder: Path) -> bool:
    return os.path.normcase(os.path.abspath(path)) == os.path.normcase(str(folder))


def open_vault(folder: Path) -> bool:
    uri = "obsidian://open?path=" + urllib.parse.quote(str(folder), safe="")
    if sys.platform == "win32":
        try:
            os.startfile(uri)
        except OSError:
            return False
        return True
    return succeeds(["open" if sys.platform == "darwin" else "xdg-open", uri])


def main() -> int:
    parser = argparse.ArgumentParser(description="register a folder as an Obsidian vault")
    parser.add_argument("folder", type=Path)
    parser.add_argument("--open", action="store_true", help="open the vault in Obsidian afterwards")
    parser.add_argument("--config", type=Path,
                        help="obsidian.json to edit instead of the app's own, for tests")
    args = parser.parse_args()

    folder = args.folder.resolve()
    if not folder.is_dir():
        print(f"no folder at {folder}: build it first with /graphify . --obsidian", file=sys.stderr)
        return 2
    config = args.config or default_config()
    try:
        settings = json.loads(config.read_text(encoding="utf-8-sig")) if config.is_file() else {}
    except ValueError:
        print(f"{config} is not valid JSON: left untouched, register the vault in the app", file=sys.stderr)
        return 5
    vaults = settings.setdefault("vaults", {})

    if any(entry.get("path") and same_folder(entry["path"], folder) for entry in vaults.values()):
        print(f"already registered: {folder}")
    elif args.config is None and obsidian_running():
        print("Obsidian is running and rewrites its vault list on exit: close it, then run again",
              file=sys.stderr)
        return 3
    else:
        vaults[secrets.token_hex(8)] = {"path": str(folder), "ts": int(time.time() * 1000), "open": True}
        config.parent.mkdir(parents=True, exist_ok=True)
        staged = config.with_name(config.name + ".tmp")
        staged.write_text(json.dumps(settings, separators=(",", ":")), encoding="utf-8")
        os.replace(staged, config)
        print(f"registered: {folder} in {config}")

    if args.open:
        if not open_vault(folder):
            print("nothing answers obsidian:// here: install Obsidian first", file=sys.stderr)
            return 4
        print("opened in Obsidian")
    return 0


if __name__ == "__main__":
    sys.exit(main())
