// The "living sky" palette, continuous through the day. A day↔night base crossfades across the
// horizon (over a twilight window), with the dramatic golden overlaid on top so warmth peaks right at
// sunrise/sunset and fades symmetrically — straddling both sides of the horizon, with no snap between
// fixed states. The top-row chrome (`top*`) is DERIVED from the actual sky-top brightness (dark text
// on a light sky, light text on a dark sky) so the eyebrow/clock always contrast, even mid-transition.
// The lower text reads on the bright horizon base. Pure colour math (no native deps) — ships OTA.

export interface SkyColors {
  top: string; // gradient stop 0 — the sky overhead (darkest by day's edges/night)
  glow: string; // gradient stop ~0.5 — the horizon glow band
  base: string; // gradient stop 1 — settles to a legible tone behind the lower labels
  topText: string; // eyebrow + clock on the `top` stop (derived from its brightness)
  topAccent: string; // the live time on the `top` stop (derived from its brightness)
  text: string; // bold lower text (moon name) on the `base` stop
  muted: string; // captions / body lower text on the `base` stop
  accent: string; // sunrise/sunset times on the `base` stop
  line: string; // the horizon hairline + the moon-row divider
  arcDim: string; // the un-travelled arc dots
}

// Anchor palettes — everything EXCEPT the top-row text, which is derived from `top` below.
type Anchor = Omit<SkyColors, 'topText' | 'topAccent'>;

const TW = 70; // twilight half-window (min) — how long the day↔night crossfade takes around a horizon
const GW = 75; // golden window (min) — how far from the horizon the warmth still reaches

const NIGHT: Anchor = { top: '#08101E', glow: '#0E1B30', base: '#15273F', text: '#C7D3E0', muted: '#5E6E84', accent: '#8294AA', line: '#263852', arcDim: '#1E2C44' };
const DAY: Anchor = { top: '#BFDBF2', glow: '#DCEAF7', base: '#E9F1FA', text: '#1E3A52', muted: '#5E7790', accent: '#C2570B', line: '#A9C6DE', arcDim: '#A9C6DE' };
const GOLDEN: Anchor = { top: '#5C6BA8', glow: '#FBCF8E', base: '#F6E2C2', text: '#6E3F1A', muted: '#9A6B43', accent: '#B4480B', line: '#E3B889', arcDim: '#E7C9A0' };

const SURFACE_KEYS: (keyof Anchor)[] = ['top', 'glow', 'base', 'line', 'arcDim'];
const TEXT_KEYS = ['text', 'muted', 'accent'] as const;

// Twilight-legible light ink for the lower labels while the base is mid-tone (heading dark but not
// navy yet). NIGHT's dim anchors only read on a genuinely dark base, so we ease into them late.
const LOWER_BRIGHT = { text: '#F2F4F7', muted: '#D9DEE6', accent: '#FBE6BC' } as const;

// Top-row ink: the dark set reads on a light sky, the light set on a dark sky. Picked by `top`'s
// brightness, with a quick ease across the mid-luminance crossover so it's full-contrast almost always.
const TOP_TEXT_LIGHT = '#ECECF3';
const TOP_TEXT_DARK = '#22303F';
const TOP_ACCENT_LIGHT = '#FBE6BC';
const TOP_ACCENT_DARK = '#C2570B';

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (x: number) => {
  const c = clamp01(x);
  return c * c * (3 - 2 * c);
};
const channel = (h: string, i: number) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
const hex2 = (n: number) => Math.round(n).toString(16).padStart(2, '0');
const mix = (a: string, b: string, t: number) => `#${hex2(channel(a, 0) + (channel(b, 0) - channel(a, 0)) * t)}${hex2(channel(a, 1) + (channel(b, 1) - channel(a, 1)) * t)}${hex2(channel(a, 2) + (channel(b, 2) - channel(a, 2)) * t)}`;
const luminance = (h: string) => (0.299 * channel(h, 0) + 0.587 * channel(h, 1) + 0.114 * channel(h, 2)) / 255;

export function skyColors(nowMin: number, sunrise: number, sunset: number): SkyColors {
  // Signed minutes from the nearest horizon — positive while the sun is up, negative at night.
  let d: number;
  if (nowMin >= sunrise && nowMin <= sunset) d = Math.min(nowMin - sunrise, sunset - nowMin);
  else if (nowMin < sunrise) d = -(sunrise - nowMin);
  else d = -(nowMin - sunset);

  const dayS = smooth((d + TW) / (2 * TW)); // 0 well below the horizon → 1 well above it
  const warmS = smooth(1 - Math.abs(d) / GW); // 1 at the horizon → 0 beyond the golden window

  const out = {} as SkyColors;
  for (const key of SURFACE_KEYS) out[key] = mix(mix(NIGHT[key], DAY[key], dayS), GOLDEN[key], warmS);

  // Lower-label ink, derived from the base's brightness (same bug class as the top row): dark ink on
  // the light day/golden skies, bright ink through the mid-tone twilight crossfade, settling onto
  // NIGHT's dim anchors only once the base is genuinely dark. Interpolating day↔night text directly
  // put mid-grey text on a mid-grey base for ~half an hour around each horizon.
  const baseLum = luminance(out.base);
  const darkInkS = smooth((baseLum - 0.57) / 0.1); // 1 = base light enough for dark ink
  const deepNightS = smooth((0.35 - baseLum) / 0.15); // 1 = base dark enough for the dim night set
  for (const key of TEXT_KEYS) {
    out[key] = mix(mix(LOWER_BRIGHT[key], NIGHT[key], deepNightS), mix(DAY[key], GOLDEN[key], warmS), darkInkS);
  }

  // Derive the top-row ink from the sky top's brightness so it always contrasts (the bug was
  // interpolating it as a colour — it went light while the sky was still light, mid-transition).
  const lightTop = smooth((luminance(out.top) - 0.5) / 0.08); // 1 = light sky top → 0 = dark
  out.topText = mix(TOP_TEXT_LIGHT, TOP_TEXT_DARK, lightTop);
  out.topAccent = mix(TOP_ACCENT_LIGHT, TOP_ACCENT_DARK, lightTop);
  return out;
}
