#!/usr/bin/env python3
"""
Registers a folder as an Obsidian vault and opens it, so "Obsidian configured"
(R42) never waits for someone to click through the vault picker -- and takes it
off the list again, so a test vault leaves nothing behind (R46).

Obsidian keeps its vault list in obsidian.json, in its own config folder, and
writes that file whole when it quits: an entry added while the app runs is gone
at the next exit. So the live file is edited only while Obsidian is closed, and
nothing else in it is touched -- other vaults, window state, settings. A folder
already in the list is left as it is.

The folder is the vault graphify exports for the project, under the project's
name, because Obsidian names a vault after its folder (R45):

  graphify export obsidian --dir graphify-out/vault/<project>
  python -X utf8 tools/obsidian/register-vault.py graphify-out/vault/<project> --open

--remove deletes the entry and what Obsidian keeps beside the list for that
vault (<id>.json, Partitions/vault-<id>), as the app's own "Remove from list"
does. The folder itself is deleted afterwards, by whoever made it.

Usage:
  python -X utf8 tools/obsidian/register-vault.py <folder> [--open | --remove] [--config <obsidian.json>]

Exit codes: 0 done (registered, already there, removed, or not listed), 2 no
folder to register, 3 Obsidian is running, 4 the vault could not be opened
(Obsidian not installed), 5 the vault list is not valid JSON and was left
untouched.

@author Angatu Sistemas
"""
from __future__ import annotations

import argparse
import json
import os
import re
import secrets
import shutil
import subprocess
import sys
import time
import urllib.parse
from pathlib import Path

FLATPAK_ID = "md.obsidian.Obsidian"


def succeeds(command: list[str]) -> bool:
    # No pipes: the app xdg-open starts can inherit them, and run() would wait for the app to quit.
    try:
        return subprocess.run(command, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode == 0
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


def link_registered() -> bool:
    import winreg
    try:
        with winreg.OpenKey(winreg.HKEY_CLASSES_ROOT, r"obsidian\shell\open\command"):
            return True
    except OSError:
        return False


def obsidian_exe() -> Path | None:
    """Where the Windows installer puts the app: per user, or per machine with --scope machine."""
    local = Path(os.environ.get("LOCALAPPDATA") or Path.home() / "AppData" / "Local")
    machine = Path(os.environ.get("ProgramFiles") or r"C:\Program Files")
    for exe in (local / "Programs" / "Obsidian" / "Obsidian.exe", machine / "Obsidian" / "Obsidian.exe"):
        if exe.is_file():
            return exe
    return None


def open_vault(folder: Path) -> bool:
    uri = "obsidian://open?path=" + urllib.parse.quote(str(folder), safe="")
    if sys.platform != "win32":
        return succeeds(["open" if sys.platform == "darwin" else "xdg-open", uri])
    # The installer leaves obsidian:// unregistered -- the app registers it on its first run -- so
    # until then the app is started with the link, the way Windows starts it once it is registered.
    if link_registered():
        try:
            os.startfile(uri)
            return True
        except OSError:
            pass
    exe = obsidian_exe()
    if exe is None:
        return False
    subprocess.Popen([str(exe), uri], stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
                     stderr=subprocess.DEVNULL)
    return True


def write_list(config: Path, settings: dict) -> None:
    config.parent.mkdir(parents=True, exist_ok=True)
    staged = config.with_name(config.name + ".tmp")
    staged.write_text(json.dumps(settings, separators=(",", ":")), encoding="utf-8")
    os.replace(staged, config)


def forget(config: Path, key: str) -> None:
    """What the app's own "Remove from list" deletes beside the list, for one vault id."""
    if not re.fullmatch(r"[0-9a-f]{16}", key):
        return  # not an id Obsidian made: never a path built from it
    (config.parent / f"{key}.json").unlink(missing_ok=True)
    shutil.rmtree(config.parent / "Partitions" / f"vault-{key}", ignore_errors=True)


def main() -> int:
    parser = argparse.ArgumentParser(description="register a folder as an Obsidian vault, or take it off")
    parser.add_argument("folder", type=Path)
    action = parser.add_mutually_exclusive_group()
    action.add_argument("--open", action="store_true", help="open the vault in Obsidian afterwards")
    action.add_argument("--remove", action="store_true",
                        help="take the folder off the vault list instead, before the folder is deleted")
    parser.add_argument("--config", type=Path,
                        help="obsidian.json to edit instead of the app's own, for tests")
    args = parser.parse_args()

    folder = args.folder.resolve()
    if not args.remove and not folder.is_dir():
        print(f"no folder at {folder}: export the vault first, graphify export obsidian --dir <folder>",
              file=sys.stderr)
        return 2
    config = args.config or default_config()
    try:
        settings = json.loads(config.read_text(encoding="utf-8-sig")) if config.is_file() else {}
    except ValueError:
        print(f"{config} is not valid JSON: left untouched, manage the vault in the app", file=sys.stderr)
        return 5
    vaults = settings.setdefault("vaults", {})
    listed = [key for key, entry in vaults.items()
              if entry.get("path") and same_folder(entry["path"], folder)]

    if args.remove and not listed:
        print(f"not registered: {folder}")
        return 0
    if listed and not args.remove:
        print(f"already registered: {folder}")
    elif args.config is None and obsidian_running():
        print("Obsidian is running and rewrites its vault list on exit: close it, then run again",
              file=sys.stderr)
        return 3
    elif args.remove:
        for key in listed:
            del vaults[key]
        write_list(config, settings)
        for key in listed:
            forget(config, key)
        print(f"removed: {folder} from {config}")
        return 0
    else:
        vaults[secrets.token_hex(8)] = {"path": str(folder), "ts": int(time.time() * 1000), "open": True}
        write_list(config, settings)
        print(f"registered: {folder} in {config}")

    if args.open:
        if not open_vault(folder):
            print("nothing answers obsidian:// here: install Obsidian first", file=sys.stderr)
            return 4
        print("opened in Obsidian")
    return 0


if __name__ == "__main__":
    sys.exit(main())
