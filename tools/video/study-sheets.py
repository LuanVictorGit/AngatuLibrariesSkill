#!/usr/bin/env python3
"""
Study sheets of a reference video: frames at a chosen rate, each labelled with its
time, tiled 10 per row, one sheet per chunk. The motion of an edit lives between
its cuts, so read every sheet.

Usage: python -X utf8 tools/study-sheets.py <video> <out_dir> <fps> <seconds_per_sheet> <start> <end>
       e.g. ... out/reference/ref1.mp4 out/reference/ref1 15 2 0 19.4

@author Angatu Sistemas
"""
import subprocess, sys, tempfile, os, glob
from PIL import Image, ImageDraw
video, outdir, fps, per, start, end = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4]), float(sys.argv[5]), float(sys.argv[6])
os.makedirs(outdir, exist_ok=True)
tmp = tempfile.mkdtemp()
subprocess.run(['ffmpeg', '-v', 'error', '-ss', str(start), '-to', str(end), '-i', video, '-vf', f'fps={fps},scale=144:256', os.path.join(tmp, 'f%04d.png')], check=True)
frames = sorted(glob.glob(os.path.join(tmp, 'f*.png')))
n = int(round(per * fps))
for k in range(0, len(frames), n):
    chunk = frames[k:k + n]
    cols = 10
    rows = (len(chunk) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * 146, rows * 258), (0, 0, 0))
    for i, f in enumerate(chunk):
        im = Image.open(f).convert('RGB')
        d = ImageDraw.Draw(im)
        t = start + (k + i) / fps
        d.rectangle([0, 0, 46, 14], fill=(0, 0, 0))
        d.text((2, 1), f'{t:.2f}', fill=(255, 230, 0))
        sheet.paste(im, ((i % cols) * 146, (i // cols) * 258))
    sheet.save(os.path.join(outdir, f's{start + k / fps:05.2f}.png'))
print(len(frames), 'frames')
