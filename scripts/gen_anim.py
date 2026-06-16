# Stitches AI-generated keyframes into looping exercise demos for the how-to sheet.
# Put numbered frames in assets/exercises/anim_src/<move>/ (01.png, 02.png, ...), in motion order,
# then run:  python scripts/gen_anim.py [move]   (omit <move> to build every folder)
# Output: assets/exercises/anim/<move>.webp — a ping-pong loop (forward then back) so even ~4 frames
# read as a smooth rep. Wire it up by adding the require() to data/exerciseImages.ts.

import os
import sys
from PIL import Image

HERE = os.path.dirname(__file__)
SRC = os.path.join(HERE, '..', 'assets', 'exercises', 'anim_src')
OUT = os.path.join(HERE, '..', 'assets', 'exercises', 'anim')
MAX_SIDE = 640  # cap longest edge to keep the asset small
FRAME_MS = 450  # how long each keyframe holds

EXTS = ('.png', '.jpg', '.jpeg', '.webp')


def fit(im):
    w, h = im.size
    s = MAX_SIDE / max(w, h)
    return im.resize((round(w * s), round(h * s)), Image.LANCZOS) if s < 1 else im


def build(move):
    folder = os.path.join(SRC, move)
    files = sorted(f for f in os.listdir(folder) if f.lower().endswith(EXTS))
    if not files:
        print('skip', move, '(no frames)')
        return
    frames = [fit(Image.open(os.path.join(folder, f)).convert('RGBA')) for f in files]
    seq = frames + frames[-2:0:-1] if len(frames) > 2 else frames  # ping-pong
    os.makedirs(OUT, exist_ok=True)
    out = os.path.join(OUT, move + '.webp')
    seq[0].save(out, save_all=True, append_images=seq[1:], duration=FRAME_MS, loop=0, format='WEBP')
    print(f'wrote {os.path.normpath(out)}  ({len(files)} frames -> {len(seq)}-frame loop)')


moves = [sys.argv[1]] if len(sys.argv) > 1 else sorted(d for d in os.listdir(SRC) if os.path.isdir(os.path.join(SRC, d))) if os.path.isdir(SRC) else []
if not moves:
    print('No frames found. Put keyframes in assets/exercises/anim_src/<move>/ first.')
for m in moves:
    build(m)
