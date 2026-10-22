#!/usr/bin/env python3
"""
Photo crops for a proposal: the three shapes the template uses, at a weight
WhatsApp tolerates.

  4:3   daily photos, before/after, gallery cards, the camera screen   (1200x900)
  1:1   Instagram grid, thumbnails, the "already published" grid       (600x600)
  9:16  reel covers                                                    (720x1280)
  wide  a site hero or any full-width band, given as W:H              (1200 wide)

The box is given in fractions of the original (left top right bottom, 0..1) so
the same numbers survive a re-download at another size; without a box the crop
is centred. Every output is a progressive JPEG at quality 82: about 120 KB for a
4:3 photo, and a proposal with twenty photos stays under 4 MB.

Usage:
  python -X utf8 tools/proposal/crop.py <original> <out.jpg> 4:3 [--box 0 .2 1 .76]
  python -X utf8 tools/proposal/crop.py <original> <out.jpg> 9:16
  python -X utf8 tools/proposal/crop.py <original> <out.jpg> 3:2 --width 1200

@author Angatu Sistemas
"""
from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image

SIZES = {"4:3": (1200, 900), "1:1": (600, 600), "9:16": (720, 1280)}


def centred_box(width: int, height: int, ratio: float) -> tuple[int, int, int, int]:
    if width / height > ratio:
        new_width = round(height * ratio)
        left = (width - new_width) // 2
        return left, 0, left + new_width, height
    new_height = round(width / ratio)
    top = (height - new_height) // 2
    return 0, top, width, top + new_height


def main() -> None:
    parser = argparse.ArgumentParser(description="crop a photo for a proposal")
    parser.add_argument("source", type=Path)
    parser.add_argument("target", type=Path)
    parser.add_argument("shape", help="4:3, 1:1, 9:16 or any W:H")
    parser.add_argument("--box", nargs=4, type=float, metavar=("L", "T", "R", "B"),
                        help="crop box in fractions of the original; its ratio should match the shape")
    parser.add_argument("--width", type=int, default=1200, help="output width for a free W:H shape")
    args = parser.parse_args()

    image = Image.open(args.source).convert("RGB")
    w_ratio, h_ratio = (float(x) for x in args.shape.split(":"))
    ratio = w_ratio / h_ratio
    if args.box:
        left, top, right, bottom = args.box
        box = (round(left * image.width), round(top * image.height),
               round(right * image.width), round(bottom * image.height))
        cropped = image.crop(box)
        cropped = cropped.crop(centred_box(cropped.width, cropped.height, ratio))
    else:
        cropped = image.crop(centred_box(image.width, image.height, ratio))
    size = SIZES.get(args.shape, (args.width, round(args.width / ratio)))
    args.target.parent.mkdir(parents=True, exist_ok=True)
    cropped.resize(size, Image.LANCZOS).save(args.target, quality=82, optimize=True, progressive=True)
    print(f"{args.target}  {size[0]}x{size[1]}  {args.target.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
