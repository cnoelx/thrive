import { describe, expect, it } from '@jest/globals';

import { type CircadianDay, formatClock, formatDuration, sleepConsistency, sleepDuration, weekSummary } from '@/engine/circadian';

describe('sleepDuration', () => {
  it('measures across midnight (bed before midnight, wake after)', () => {
    expect(sleepDuration(23 * 60 + 30, 7 * 60)).toBe(7 * 60 + 30); // 11:30pm → 7:00am = 7h30m
    expect(sleepDuration(22 * 60, 6 * 60)).toBe(8 * 60); // 10pm → 6am = 8h
  });

  it('measures within the same morning (both after midnight)', () => {
    expect(sleepDuration(1 * 60, 8 * 60)).toBe(7 * 60); // 1am → 8am = 7h
  });

  it('an exactly-equal bed and wake is zero (not a full day)', () => {
    expect(sleepDuration(7 * 60, 7 * 60)).toBe(0);
  });
});

describe('formatDuration', () => {
  it('drops the minutes when whole hours', () => {
    expect(formatDuration(8 * 60)).toBe('8h');
    expect(formatDuration(7 * 60 + 30)).toBe('7h 30m');
  });
});

describe('formatClock', () => {
  it('formats 12-hour with am/pm and midnight/noon', () => {
    expect(formatClock(0)).toBe('12:00 am');
    expect(formatClock(12 * 60)).toBe('12:00 pm');
    expect(formatClock(23 * 60 + 30)).toBe('11:30 pm');
    expect(formatClock(7 * 60)).toBe('7:00 am');
    expect(formatClock(13 * 60 + 5)).toBe('1:05 pm');
  });
});

describe('sleepConsistency', () => {
  it('needs at least 3 nights', () => {
    expect(sleepConsistency([22 * 60, 22 * 60 + 10])).toBeNull();
  });

  it('calls tight bedtimes steady (and clusters 11pm/1am across midnight)', () => {
    expect(sleepConsistency([23 * 60, 23 * 60 + 20, 1 * 60])!.steady).toBe(true); // 11:00, 11:20, 1:00
  });

  it('calls a wide spread drifting', () => {
    const c = sleepConsistency([21 * 60, 23 * 60 + 30, 1 * 60 + 30, 22 * 60])!;
    expect(c.steady).toBe(false);
  });
});

describe('weekSummary', () => {
  it('averages logged nights and counts light days, ignoring blank days', () => {
    const days: (CircadianDay | undefined)[] = [
      { bed: 22 * 60, wake: 6 * 60, morningLight: true },
      undefined,
      { bed: 23 * 60, wake: 6 * 60, morningLight: true, eveningLight: true },
    ];
    const s = weekSummary(days);
    expect(s.nights).toBe(2); // 8h + 7h
    expect(s.avgSleepMin).toBe(7 * 60 + 30);
    expect(s.morningLight).toBe(2);
    expect(s.eveningLight).toBe(1);
  });

  it('avg is null with no logged nights', () => {
    expect(weekSummary([undefined, { morningLight: true }]).avgSleepMin).toBeNull();
  });
});
