import { describe, expect, it } from '@jest/globals';

import { type CircadianDay } from '@/engine/circadian';
import { MORNING_FALLBACK, SUNRISE_FLOOR, rhythmSlots } from '@/engine/rhythmReminders';

const EARLY_SUN = { sunrise: 5 * 60 + 30, sunset: 18 * 60 + 40 }; // 5:30am sunrise (before the floor)
const LATE_SUN = { sunrise: 6 * 60 + 45, sunset: 17 * 60 + 30 }; // 6:45am sunrise (after the floor)

describe('rhythmSlots', () => {
  it('no location → a single morning ping at the fixed fallback hour', () => {
    const s = rhythmSlots(null, undefined);
    expect(s.length).toBe(1);
    expect(s[0].minute).toBe(MORNING_FALLBACK);
  });

  it('floors an early sunrise so it never buzzes before 6am', () => {
    expect(rhythmSlots(EARLY_SUN, undefined)[0].minute).toBe(SUNRISE_FLOOR);
  });

  it('tracks a later sunrise exactly', () => {
    expect(rhythmSlots(LATE_SUN, undefined)[0].minute).toBe(6 * 60 + 45);
  });

  it('leads with the daylight action and tails the sleep ask', () => {
    const s = rhythmSlots(LATE_SUN, undefined)[0];
    expect(s.title).toMatch(/daylight|light/i);
    expect(s.body).toMatch(/sleep/i);
  });

  it('drops once sleep is logged', () => {
    const log: CircadianDay = { quality: 'good' };
    expect(rhythmSlots(LATE_SUN, log)).toEqual([]);
  });
});
