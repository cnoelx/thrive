# Stitches AI-generated keyframes into looping exercise demos for the how-to sheet.
# Put numbered frames in assets/exercises/anim_src/<move>/ (1.png, 2.png, ...), in motion order,
# then run:  python scripts/gen_anim.py [move]   (omit <move> to build every folder)
# Output: assets/exercises/anim/<move>.webp — a ping-pong loop (forward then back) so even a few
# frames read as a smooth rep. Wire it up by adding the require() to data/exerciseImages.ts.
#
# Frames are anchored by the FEET (bottom of the figure) so the character stays planted and only the
# body moves — AI keyframes drift around otherwise, which looks like the legs sliding.

import os
import sys
from PIL import Image

HERE = os.path.dirname(__file__)
SRC = os.path.join(HERE, '..', 'assets', 'exercises', 'anim_src')
OUT = os.path.join(HERE, '..', 'assets', 'exercises', 'anim')
MAX_SIDE = 640  # cap longest edge to keep the asset small
FRAME_MS = 450  # how long each keyframe holds
WHITE_CUTOFF = 245  # pixels brighter than this count as background, not figure

EXTS = ('.png', '.jpg', '.jpeg', '.webp')


def fit(im):
    w, h = im.size
    s = MAX_SIDE / max(w, h)
    return im.resize((round(w * s), round(h * s)), Image.LANCZOS) if s < 1 else im


def figure_mask(im):
    return im.convert('L').point(lambda p: 255 if p < WHITE_CUTOFF else 0)


def align(frames):
    """Paste each frame onto a white canvas so the figure's feet sit at one fixed point."""
    w, h = frames[0].size
    foot_h = max(1, int(h * 0.07))  # bottom slice = the feet
    tx, ty = w // 2, h - int(h * 0.04)
    out = []
    for im in frames:
        bb = figure_mask(im).getbbox()
        if not bb:
            out.append(im)
            continue
        left, _, right, bottom = bb
        strip = figure_mask(im).crop((0, max(0, bottom - foot_h), w, bottom)).getbbox()
        feet_cx = (strip[0] + strip[2]) // 2 if strip else (left + right) // 2
        canvas = Image.new('RGB', (w, h), (255, 255, 255))
        canvas.paste(im, (tx - feet_cx, ty - bottom))
        out.append(canvas)
    return out


def roundtrip(a, b):
    """True if first and last frame are similar — i.e. the frames already return to the start, so we
    loop straight instead of ping-ponging (which would play the rep twice)."""
    sa, sb = a.convert('L').resize((64, 64)), b.convert('L').resize((64, 64))
    mean_diff = sum(abs(p - q) for p, q in zip(sa.getdata(), sb.getdata())) / (64 * 64)
    return mean_diff < 12


def build(move):
    folder = os.path.join(SRC, move)
    files = sorted((f for f in os.listdir(folder) if f.lower().endswith(EXTS)), key=lambda x: int(''.join(c for c in x if c.isdigit()) or 0))
    if not files:
        print('skip', move, '(no frames)')
        return
    frames = align([fit(Image.open(os.path.join(folder, f)).convert('RGB')) for f in files])
    # Already a there-and-back rep → loop straight; a one-way sequence → ping-pong it back.
    seq = frames if len(frames) <= 2 or roundtrip(frames[0], frames[-1]) else frames + frames[-2:0:-1]
    os.makedirs(OUT, exist_ok=True)
    out = os.path.join(OUT, move + '.webp')
    seq[0].save(out, save_all=True, append_images=seq[1:], duration=FRAME_MS, loop=0, format='WEBP')
    print(f'wrote {os.path.normpath(out)}  ({len(files)} frames -> {len(seq)}-frame loop)')


moves = [sys.argv[1]] if len(sys.argv) > 1 else (sorted(d for d in os.listdir(SRC) if os.path.isdir(os.path.join(SRC, d))) if os.path.isdir(SRC) else [])
if not moves:
    print('No frames found. Put keyframes in assets/exercises/anim_src/<move>/ first.')
for m in moves:
    build(m)
