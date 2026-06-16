# Regenerates Thrive's brand icons in the "ember glow" scheme (option D): a vertical ember gradient
# (#FDBA74 -> #EA580C) with the white rise chevron. Supersampled 4x then downscaled for clean edges.
#   python scripts/gen_icons.py
# The adaptive-icon foreground (white chevron, transparent) is unchanged — only the backgrounds move.

import os
from PIL import Image, ImageDraw

TOP = (0xFD, 0xBA, 0x74)
BOT = (0xEA, 0x58, 0x0C)
SS = 4  # supersample factor for anti-aliasing
HERE = os.path.join(os.path.dirname(__file__), '..', 'assets', 'images')


def gradient(size):
    img = Image.new('RGB', (size, size))
    d = ImageDraw.Draw(img)
    for y in range(size):
        t = y / (size - 1)
        d.line([(0, y), (size, y)], fill=tuple(round(TOP[i] * (1 - t) + BOT[i] * t) for i in range(3)))
    return img


def draw_chevron(img):
    s = img.size[0]
    u = s / 1024
    apex, left, right = (512 * u, 410 * u), (300 * u, 620 * u), (724 * u, 620 * u)
    w = int(82 * u)
    r = w // 2
    d = ImageDraw.Draw(img)
    d.line([left, apex, right], fill='white', width=w, joint='curve')
    for cx, cy in (left, apex, right):  # round caps + join
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill='white')


def make(size, chevron):
    big = gradient(size * SS)
    if chevron:
        draw_chevron(big)
    return big.resize((size, size), Image.LANCZOS)


def save(img, name):
    path = os.path.join(HERE, name)
    img.save(path, optimize=True)
    print('wrote', os.path.normpath(path))


save(make(1024, True), 'icon.png')
save(make(1024, False), 'adaptive-icon-background.png')
save(make(256, True), 'favicon.png')
