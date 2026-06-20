import { describe, expect, it } from '@jest/globals';

import { type CircadianDay } from '@/engine/circadian';
import { SLEEP_MINUTE, rhythmSlots } from '@/engine/rhythmReminders';

const SUN = { sunrise: 5 * 60 + 50, sunset: 18 * 60 + 40 }; // 5:50am / 6:40pm

describe('rhythmSlots', () => {
  it('no location → just the sleep nudge', () => {
    const s = rhythmSlots(null, undefined);
    expect(s.map((x) => x.minute)).toEqual([SLEEP_MINUTE]);
  });

  it('with location and nothing logged → sleep + both light nudges', () => {
    const s = rhythmSlots(SUN, undefined);
    expect(s.length).toBe(3);
  });

  it('drops each nudge once that item is logged', () => {
    const log: CircadianDay = { quality: 'good', morningLight: true };
    const s = rhythmSlots(SUN, log);
    expect(s.length).toBe(1); // only evening light left
    expect(s[0].title).toMatch(/evening/i);
  });

  it('everything logged → no nudges', () => {
    const log: CircadianDay = { quality: 'ok', morningLight: true, eveningLight: true };
    expect(rhythmSlots(SUN, log)).toEqual([]);
  });

  it('morning nudge is 20 min after sunrise, but never before the 6:30am floor', () => {
    expect(rhythmSlots(SUN, undefined)[1].minute).toBe(6 * 60 + 30); // sunrise 5:50 +20 = 6:10 → floored to 6:30
    const lateSun = { sunrise: 7 * 60, sunset: 17 * 60 };
    expect(rhythmSlots(lateSun, undefined)[1].minute).toBe(7 * 60 + 20); // 7:00 +20 = 7:20, above floor
  });

  it('evening nudge is 30 min before sunset', () => {
    expect(rhythmSlots(SUN, undefined)[2].minute).toBe(18 * 60 + 10); // 6:40pm − 30 = 6:10pm
  });
});
