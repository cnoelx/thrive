// The "living sky" palette, continuous through the day. A day↔night base crossfades across the
// horizon (over a twilight window), with the dramatic golden overlaid on top so warmth peaks right at
// sunrise/sunset and fades symmetrically — straddling both sides of the horizon, with no snap between
// fixed states. Two text tiers: `top*` reads on the dark sky top, the rest reads on the bright
// horizon base. Pure colour math (no native deps) so the whole thing ships OTA.

export interface SkyColors {
  top: string; // gradient stop 0 — the sky overhead (darkest by day's edges/night)
  glow: string; // gradient stop ~0.5 — the horizon glow band
  base: string; // gradient stop 1 — settles to a legible tone behind the lower labels
  topText: string; // eyebrow + clock on the `top` stop
  topAccent: string; // the live time on the `top` stop
  text: string; // bold lower text (moon name) on the `base` stop
  muted: string; // captions / body lower text on the `base` stop
  accent: string; // sunrise/sunset times on the `base` stop
  line: string; // the horizon hairline + the moon-row divider
  arcDim: string; // the un-travelled arc dots
}

const TW = 70; // twilight half-window (min) — how long the day↔night crossfade takes around a horizon
const GW = 75; // golden window (min) — how far from the horizon the warmth still reaches

const NIGHT: SkyColors = { top: '#08101E', glow: '#0E1B30', base: '#15273F', topText: '#C7D3E0', topAccent: '#8294AA', text: '#C7D3E0', muted: '#5E6E84', accent: '#8294AA', line: '#263852', arcDim: '#1E2C44' };
const DAY: SkyColors = { top: '#BFDBF2', glow: '#DCEAF7', base: '#E9F1FA', topText: '#234A66', topAccent: '#C2570B', text: '#1E3A52', muted: '#5E7790', accent: '#C2570B', line: '#A9C6DE', arcDim: '#A9C6DE' };
const GOLDEN: SkyColors = { top: '#5C6BA8', glow: '#FBCF8E', base: '#F6E2C2', topText: '#ECE7F4', topAccent: '#FBE6BC', text: '#6E3F1A', muted: '#9A6B43', accent: '#B4480B', line: '#E3B889', arcDim: '#E7C9A0' };

const KEYS = Object.keys(NIGHT) as (keyof SkyColors)[];

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (x: number) => {
  const c = clamp01(x);
  return c * c * (3 - 2 * c);
};
const channel = (h: string, i: number) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
const hex2 = (n: number) => Math.round(n).toString(16).padStart(2, '0');
const mix = (a: string, b: string, t: number) => `#${hex2(channel(a, 0) + (channel(b, 0) - channel(a, 0)) * t)}${hex2(channel(a, 1) + (channel(b, 1) - channel(a, 1)) * t)}${hex2(channel(a, 2) + (channel(b, 2) - channel(a, 2)) * t)}`;

export function skyColors(nowMin: number, sunrise: number, sunset: number): SkyColors {
  // Signed minutes from the nearest horizon — positive while the sun is up, negative at night.
  let d: number;
  if (nowMin >= sunrise && nowMin <= sunset) d = Math.min(nowMin - sunrise, sunset - nowMin);
  else if (nowMin < sunrise) d = -(sunrise - nowMin);
  else d = -(nowMin - sunset);

  const dayS = smooth((d + TW) / (2 * TW)); // 0 well below the horizon → 1 well above it
  const warmS = smooth(1 - Math.abs(d) / GW); // 1 at the horizon → 0 beyond the golden window

  const out = {} as SkyColors;
  for (const key of KEYS) out[key] = mix(mix(NIGHT[key], DAY[key], dayS), GOLDEN[key], warmS);
  return out;
}
