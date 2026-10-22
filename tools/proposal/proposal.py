#!/usr/bin/env python3
"""
Angatu technical proposal (orçamento técnico): from the house template to the delivered PDF.

Three commands, in the order a proposal meets them:

  new <slug>        creates <studio>/<slug>/ from template.html and assets/
  build <slug>      renders proposta.html, prints out/proposta.pdf with Chrome and
                    writes one PNG per page to out/review/ to be looked at
  final <slug>      checks the build is clean and writes the delivery PDF with
                    Angatu's metadata (default: the Desktop)

The studio is ~/Desktop/AngatuSistemas/orcamentos (override with ANGATU_PROPOSALS
or --studio). It keeps the shared caches (_cache/fonts, _cache/icons) and one
folder per proposal, which is never deleted: a revision reopens it.

What the template may use, resolved at build time:
  {{icon:name}}           Lucide icon, fetched once from jsDelivr and cached
  {{brand:name}}          Simple Icons glyph (whatsapp, instagram...)
  {{qr:URL}}              real QR code, vector; {{qr:URL #RRGGBB}} for the colour
  {{page}}                this page's number, from the order of <section class="page">
  {{pageof:id}}           the number of the page whose section has data-id="id"

Lessons this script encodes (each one cost a broken PDF once):
  - Variable fonts are embedded by Chrome as Type3. The build instantiates static
    TrueType files from the OFL sources and the report fails on any Type3 font.
  - CSS background-image SVG and SVG masks are rasterised in the PDF; the template
    uses <img class="bg"> and no masks. The report lists every raster image.
  - [[placeholders]] and the neutral placeholder images must never reach the
    client: `final` refuses while any is left.

Usage:
  python -X utf8 tools/proposal/proposal.py new oficina-silva
  python -X utf8 tools/proposal/proposal.py build oficina-silva [--dpi 110]
  python -X utf8 tools/proposal/proposal.py final oficina-silva [--to C:/path/file.pdf]

Requirements (in a virtual environment, never the global interpreter):
  pip install -r tools/proposal/requirements.txt

@author Angatu Sistemas
"""
from __future__ import annotations

import argparse
import os
import platform
import re
import shutil
import subprocess
import sys
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
TEMPLATE = HERE / "template.html"
ASSETS = HERE / "assets"

LUCIDE = "https://cdn.jsdelivr.net/npm/lucide-static@1.61.0/icons/{}.svg"
SIMPLE_ICONS = "https://cdn.jsdelivr.net/npm/simple-icons@16.35.0/icons/{}.svg"
GOOGLE_FONTS = "https://raw.githubusercontent.com/google/fonts/main/ofl/{}"

# Static instances the template's @font-face rules point to. Variable sources are OFL.
FONT_SOURCES = {
    "inter": "inter/Inter%5Bopsz,wght%5D.ttf",
    "bricolage": "bricolagegrotesque/BricolageGrotesque%5Bopsz,wdth,wght%5D.ttf",
    "archivo": "archivo/Archivo%5Bwdth,wght%5D.ttf",
}
FONT_INSTANCES = [
    ("inter", {"opsz": 14, "wght": 400}, "Inter Doc", "Regular", "inter-400.ttf"),
    ("inter", {"opsz": 14, "wght": 500}, "Inter Doc", "Medium", "inter-500.ttf"),
    ("inter", {"opsz": 14, "wght": 600}, "Inter Doc", "SemiBold", "inter-600.ttf"),
    ("inter", {"opsz": 14, "wght": 700}, "Inter Doc", "Bold", "inter-700.ttf"),
    ("bricolage", {"opsz": 32, "wdth": 100, "wght": 700}, "Bricolage Doc", "Bold", "bricolage-32-700.ttf"),
    ("bricolage", {"opsz": 32, "wdth": 100, "wght": 800}, "Bricolage Doc", "ExtraBold", "bricolage-32-800.ttf"),
    ("bricolage", {"opsz": 16, "wdth": 100, "wght": 600}, "Bricolage Text", "SemiBold", "bricolage-16-600.ttf"),
    ("bricolage", {"opsz": 16, "wdth": 100, "wght": 700}, "Bricolage Text", "Bold", "bricolage-16-700.ttf"),
    ("archivo", {"wdth": 110, "wght": 800}, "Archivo Expanded", "ExtraBold", "archivo-110-800.ttf"),
    ("archivo", {"wdth": 72, "wght": 700}, "Archivo Condensed", "Bold", "archivo-72-700.ttf"),
]

PLACEHOLDER_IMAGES = ("assets/photo-placeholder.svg", "assets/logo-placeholder.svg")


def studio(args) -> Path:
    root = args.studio or os.environ.get("ANGATU_PROPOSALS") or Path.home() / "Desktop" / "AngatuSistemas" / "orcamentos"
    return Path(root)


def work_dir(args) -> Path:
    candidate = Path(args.slug)
    folder = candidate if candidate.is_dir() else studio(args) / args.slug
    if not (folder / "proposta.src.html").exists():
        sys.exit(f"no proposta.src.html in {folder} (run `new` first)")
    return folder


def fetch(url: str, target: Path) -> Path:
    if not target.exists():
        target.parent.mkdir(parents=True, exist_ok=True)
        request = urllib.request.Request(url, headers={"User-Agent": "angatu-proposal"})
        with urllib.request.urlopen(request, timeout=60) as response:
            target.write_bytes(response.read())
    return target


# ---------------------------------------------------------------- fonts

def ensure_fonts(cache: Path, folder: Path) -> None:
    from fontTools.ttLib import TTFont
    from fontTools.varLib import instancer

    built = cache / "fonts"
    for source, location, family, style, filename in FONT_INSTANCES:
        out = built / filename
        if not out.exists():
            variable = fetch(GOOGLE_FONTS.format(FONT_SOURCES[source]), cache / "font-sources" / f"{source}.ttf")
            font = instancer.instantiateVariableFont(TTFont(variable), location, inplace=False)
            names = font["name"]
            for record in list(names.names):
                if record.nameID in (16, 17, 21, 22, 25):
                    names.removeNames(nameID=record.nameID)
            postscript = (family + "-" + style).replace(" ", "")
            for platform_id, encoding_id, language_id in ((3, 1, 0x409), (1, 0, 0)):
                names.setName(family, 1, platform_id, encoding_id, language_id)
                names.setName(style, 2, platform_id, encoding_id, language_id)
                names.setName(f"{family} {style}", 4, platform_id, encoding_id, language_id)
                names.setName(postscript, 6, platform_id, encoding_id, language_id)
            out.parent.mkdir(parents=True, exist_ok=True)
            font.save(out)
        target = folder / "fonts" / filename
        if not target.exists():
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(out, target)


# ---------------------------------------------------------------- template tokens

def svg_icon(kind: str, name: str, extra: str, cache: Path) -> str:
    url = (SIMPLE_ICONS if kind == "brand" else LUCIDE).format(name)
    raw = fetch(url, cache / "icons" / kind / f"{name}.svg").read_text(encoding="utf-8")
    raw = re.sub(r"<!--.*?-->|<title>.*?</title>", "", raw, flags=re.S)
    raw = re.sub(r'\s+(class|role)="[^"]*"', "", raw)
    raw = re.sub(r'\s+(width|height)="24"', "", raw)
    raw = re.sub(r"\s+", " ", raw).strip()
    css = ("ic " + extra).strip()
    fill = ' fill="currentColor"' if kind == "brand" else ""
    return raw.replace("<svg ", f'<svg class="{css}"{fill} aria-hidden="true" ', 1)


def svg_qr(url: str, colour: str) -> str:
    import segno

    code = segno.make(url, error="m")
    size = code.symbol_size(border=0)[0]
    paths = []
    for y, row in enumerate(code.matrix):
        x = 0
        while x < len(row):
            if row[x]:
                start = x
                while x < len(row) and row[x]:
                    x += 1
                paths.append(f"M{start} {y}h{x - start}v1h-{x - start}z")
            else:
                x += 1
    return (f'<svg class="qr" viewBox="0 0 {size} {size}" shape-rendering="crispEdges" aria-hidden="true">'
            f'<path fill="{colour}" d="{"".join(paths)}"/></svg>')


def number_pages(html: str) -> str:
    starts = [m.start() for m in re.finditer(r'<section class="page\b', html)]
    ids = {}
    for number, start in enumerate(starts, 1):
        found = re.match(r'<section class="page[^"]*"[^>]*data-id="([\w-]+)"', html[start:start + 300])
        if found:
            ids[found.group(1)] = number
    pieces, last = [], 0
    for number, start in enumerate(starts, 1):
        end = starts[number] if number < len(starts) else len(html)
        pieces.append(html[last:start])
        pieces.append(html[start:end].replace("{{page}}", f"{number:02d}"))
        last = end
    pieces.append(html[last:])
    html = "".join(pieces)

    def page_of(match):
        if match.group(1) not in ids:
            sys.exit(f'{{{{pageof:{match.group(1)}}}}} points to no <section data-id="{match.group(1)}">')
        return f"{ids[match.group(1)]:02d}"

    return re.sub(r"\{\{pageof:([\w-]+)\}\}", page_of, html)


def render(source: str, cache: Path) -> str:
    html = re.sub(r"\{\{(icon|brand):([\w-]+)(?:\s+([\w\s-]+))?\}\}",
                  lambda m: svg_icon(m.group(1), m.group(2), m.group(3) or "", cache), source)
    html = re.sub(r"\{\{qr:(\S+?)(?:\s+(#[0-9A-Fa-f]{6}))?\}\}",
                  lambda m: svg_qr(m.group(1), m.group(2) or "#051D38"), html)
    return number_pages(html)


# ---------------------------------------------------------------- chrome

def chrome() -> str:
    if os.environ.get("CHROME"):
        return os.environ["CHROME"]
    candidates = {
        "Windows": [r"C:\Program Files\Google\Chrome\Application\chrome.exe",
                    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
                    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"],
        "Darwin": ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"],
    }.get(platform.system(), [])
    found = [c for c in candidates if Path(c).exists()] + [w for w in (shutil.which("google-chrome"), shutil.which("chromium")) if w]
    if not found:
        sys.exit("Chrome not found: set the CHROME environment variable")
    return found[0]


def print_pdf(html_file: Path, pdf: Path) -> None:
    pdf.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run([chrome(), "--headless=new", "--disable-gpu", "--no-pdf-header-footer",
                    "--virtual-time-budget=20000", "--run-all-compositor-stages-before-draw",
                    f"--print-to-pdf={pdf}", html_file.as_uri()], check=True, capture_output=True)


# ---------------------------------------------------------------- report

def report(pdf: Path, html: str) -> list[str]:
    import pymupdf

    problems = []
    document = pymupdf.open(pdf)
    fonts = sorted({(f[2], f[3]) for page in document for f in page.get_fonts(full=True)})
    type3 = [name for kind, name in fonts if kind == "Type3"]
    rasters = sorted({(x[0], x[2], x[3]) for page in document for x in page.get_images(full=True)})
    size = pdf.stat().st_size / 1_048_576
    print(f"pages   {len(document)}")
    print(f"fonts   {', '.join(name.split('+')[-1] for _, name in fonts)}")
    print(f"images  {len(rasters)} raster(s): " + ", ".join(f"{w}x{h}" for _, w, h in rasters))
    print(f"size    {size:.1f} MB")
    if type3:
        problems.append(f"{len(type3)} Type3 font(s): a variable font reached Chrome; use the static instances")
    left = sorted(set(re.findall(r"\[\[[^\]]+\]\]", html)))
    if left:
        problems.append(f"{len(left)} placeholder(s) left: " + "; ".join(left[:8]))
    placeholders = [p for p in PLACEHOLDER_IMAGES if p in html]
    if placeholders:
        problems.append("placeholder image(s) still referenced: " + ", ".join(placeholders))
    if size > 8:
        problems.append(f"{size:.1f} MB: heavy for WhatsApp; resize the photos (1200 px, JPEG ~82)")
    return problems


# ---------------------------------------------------------------- commands

def cmd_new(args) -> None:
    folder = studio(args) / args.slug
    if folder.exists():
        sys.exit(f"{folder} already exists: a revision edits it, it is never recreated")
    (folder / "photos").mkdir(parents=True)
    shutil.copytree(ASSETS, folder / "assets")
    shutil.copy2(TEMPLATE, folder / "proposta.src.html")
    print(f"created {folder}")
    print("next: edit proposta.src.html, put the cropped photos in photos/, then `build`")


def cmd_build(args) -> None:
    folder = work_dir(args)
    cache = studio(args) / "_cache"
    ensure_fonts(cache, folder)
    html = render((folder / "proposta.src.html").read_text(encoding="utf-8"), cache)
    target = folder / "proposta.html"
    target.write_text(html, encoding="utf-8")
    pdf = folder / "out" / "proposta.pdf"
    print_pdf(target, pdf)

    import pymupdf

    review = folder / "out" / "review"
    shutil.rmtree(review, ignore_errors=True)
    review.mkdir(parents=True)
    for number, page in enumerate(pymupdf.open(pdf), 1):
        page.get_pixmap(dpi=args.dpi).save(review / f"p{number:02d}.png")
    problems = report(pdf, html)
    print(f"review  {review}  (look at every page before calling it done)")
    for problem in problems:
        print(f"warn    {problem}")


def cmd_final(args) -> None:
    import pymupdf

    folder = work_dir(args)
    pdf = folder / "out" / "proposta.pdf"
    html_file = folder / "proposta.html"
    if not pdf.exists() or not html_file.exists():
        sys.exit("no build yet: run `build` and look at the pages first")
    if pdf.stat().st_mtime < (folder / "proposta.src.html").stat().st_mtime:
        sys.exit("proposta.src.html changed after the last build: build and review again")
    problems = report(pdf, html_file.read_text(encoding="utf-8"))
    blocking = [p for p in problems if "MB" not in p]
    if blocking:
        for problem in blocking:
            print(f"error   {problem}")
        sys.exit("not delivered")
    client = re.search(r'<p class="eyebrow">Proposta para ([^<]+)</p>', html_file.read_text(encoding="utf-8"))
    name = client.group(1).strip() if client else args.slug
    slug = re.sub(r"[^A-Za-z0-9]+", "-", name.encode("ascii", "ignore").decode()).strip("-")
    target = Path(args.to) if args.to else Path.home() / "Desktop" / f"Orcamento-Tecnico-Angatu-{slug}.pdf"
    document = pymupdf.open(pdf)
    document.set_metadata({"title": f"Orçamento técnico · {name}", "author": "Angatu Sistemas",
                           "subject": f"Proposta para {name}", "creator": "Angatu Sistemas",
                           "producer": "Angatu Sistemas"})
    document.save(target, garbage=4, deflate=True, clean=True)
    print(f"delivered {target} ({target.stat().st_size / 1_048_576:.1f} MB)")


def main() -> None:
    parser = argparse.ArgumentParser(description="Angatu technical proposal PDF")
    parser.add_argument("--studio", help="studio root (default ~/Desktop/AngatuSistemas/orcamentos)")
    commands = parser.add_subparsers(dest="command", required=True)
    for name in ("new", "build", "final"):
        command = commands.add_parser(name)
        command.add_argument("slug", help="folder name inside the studio, or a path")
        if name == "build":
            command.add_argument("--dpi", type=int, default=110)
        if name == "final":
            command.add_argument("--to", help="delivery file (default: Desktop)")
    args = parser.parse_args()
    {"new": cmd_new, "build": cmd_build, "final": cmd_final}[args.command](args)


if __name__ == "__main__":
    main()
