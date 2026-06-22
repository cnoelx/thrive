import { describe, expect, it } from '@jest/globals';

import { type CircadianDay } from '@/engine/circadian';
import { SLEEP_MINUTE, rhythmSlots } from '@/engine/rhythmReminders';

const SUN = { sunrise: 5 * 60 + 50, sunset: 18 * 60 + 40 }; // 5:50am / 6:40pm

describe('rhythmSlots', () => {
  it('no location → just the morning check-in', () => {
    expect(rhythmSlots(null, undefined).map((x) => x.minute)).toEqual([SLEEP_MINUTE]);
  });

  it('with location and nothing logged → morning check-in + evening light (2 slots)', () => {
    expect(rhythmSlots(SUN, undefined).length).toBe(2);
  });

  it('morning check-in drops once sleep is logged; evening light remains', () => {
    const log: CircadianDay = { quality: 'good', morningLight: true };
    const s = rhythmSlots(SUN, log);
    expect(s.length).toBe(1);
    expect(s[0].title).toMatch(/evening/i);
  });

  it('everything logged → no nudges', () => {
    const log: CircadianDay = { quality: 'ok', eveningLight: true };
    expect(rhythmSlots(SUN, log)).toEqual([]);
  });

  it('evening nudge is 30 min before sunset', () => {
    expect(rhythmSlots(SUN, undefined)[1].minute).toBe(18 * 60 + 10); // 6:40pm − 30 = 6:10pm
  });
});
