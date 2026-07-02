import { describe, expect, it } from '@jest/globals';

import { skyColors } from './skyTint';

const SR = 6 * 60 + 5; // 6:05 sunrise
const SS = 18 * 60 + 41; // 6:41 pm sunset

describe('skyColors', () => {
  it('is deep navy in the dead of night', () => {
    const c = skyColors(3 * 60, SR, SS);
    expect(c.top).toBe('#08101e');
    expect(c.base).toBe('#15273f');
  });

  it('is the calm blue day palette at midday', () => {
    const c = skyColors(13 * 60, SR, SS);
    expect(c.top).toBe('#bfdbf2');
    expect(c.topText).toBe('#22303f'); // dark ink, derived from the light sky top
  });

  it('keeps the top-row ink DARK while the sky top is still light (pre-sunset transition)', () => {
    // 41 min before sunset — the case that read light-on-light before the derive-from-brightness fix.
    const c = skyColors(SS - 41, SR, SS);
    expect(c.topText).toBe('#22303f');
    expect(c.topAccent).toBe('#c2570b');
  });

  it('flips the top-row ink to light once the sky top is genuinely dark (peak golden / night)', () => {
    expect(skyColors(SS, SR, SS).topText).toBe('#ececf3'); // dusky indigo top at the sunset peak
    expect(skyColors(2 * 60, SR, SS).topText).toBe('#ececf3'); // navy top in the dead of night
  });

  it('keeps the lower-label ink bright through mid-twilight (was mid-grey on a mid-grey base)', () => {
    // ~40 min after sunset — the washed-out screenshot case: base is a mid-tone, so the ink must be bright.
    const c = skyColors(SS + 40, SR, SS);
    expect(c.accent).toBe('#fbe6bc');
    expect(c.muted).toBe('#d9dee6');
  });

  it('lower ink settles on the calm dim set at genuine night, dark sets by day/golden', () => {
    const night = skyColors(2 * 60, SR, SS);
    expect(night.muted).toBe('#5e6e84'); // the deliberately-dim night look, unchanged
    expect(night.accent).toBe('#8294aa');
    expect(skyColors(13 * 60, SR, SS).accent).toBe('#c2570b'); // day anchor exact
    expect(skyColors(SS, SR, SS).accent).toBe('#b4480b'); // golden anchor exact at the peak
  });

  it('is the full dramatic golden right at the horizon', () => {
    const c = skyColors(SS, SR, SS); // exactly sunset → warmth peaks
    expect(c.top).toBe('#5c6ba8'); // dusky indigo overhead
    expect(c.glow).toBe('#fbcf8e'); // gold at the horizon
  });

  it('still holds warmth after sunset (afterglow), unlike the old hard cutoff', () => {
    const day = skyColors(13 * 60, SR, SS);
    const afterglow = skyColors(SS + 30, SR, SS); // 30 min past sunset
    // Warmer (redder top) than midday, but darker than the sunset peak — a real fading dusk.
    expect(afterglow.glow).not.toBe(day.glow);
    expect(afterglow.top).not.toBe(skyColors(SS, SR, SS).top);
  });

  it('moves continuously — a minute apart never snaps to a wildly different colour', () => {
    const a = skyColors(SS - 20, SR, SS);
    const b = skyColors(SS - 19, SR, SS);
    expect(a.glow).not.toBe(b.glow); // it does change…
    // …but only slightly: each RGB channel shifts by a handful of steps, not a jump.
    for (let i = 0; i < 3; i++) {
      const ca = parseInt(a.glow.slice(1 + i * 2, 3 + i * 2), 16);
      const cb = parseInt(b.glow.slice(1 + i * 2, 3 + i * 2), 16);
      expect(Math.abs(ca - cb)).toBeLessThan(8);
    }
  });
});
