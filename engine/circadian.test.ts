import { describe, expect, it } from '@jest/globals';

import { formatClock, formatDuration, sleepDuration } from '@/engine/circadian';

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
