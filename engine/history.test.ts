import { describe, expect, it } from '@jest/globals';

import { backfillStreakDays, dayNumberFromDate, monthGrid, weekDays } from '@/engine/history';
import { isRestDay } from '@/engine/streak';

// Same reference week as streak.test.ts: 4 Mon · 5 Tue · 6 Wed · 7 Thu · 8 Fri · 9 Sat · 10 Sun · 11 Mon
describe('weekDays', () => {
  it('returns Monday → Sunday containing the given day', () => {
    expect(weekDays(4)).toEqual([4, 5, 6, 7, 8, 9, 10]); // a Monday
    expect(weekDays(7)).toEqual([4, 5, 6, 7, 8, 9, 10]); // mid-week
    expect(weekDays(10)).toEqual([4, 5, 6, 7, 8, 9, 10]); // the Sunday itself
    expect(weekDays(11)).toEqual([11, 12, 13, 14, 15, 16, 17]); // next Monday starts a new week
  });
});

describe('backfillStreakDays', () => {
  it('reconstructs consecutive workout days ending at lastLoggedDay', () => {
    expect(backfillStreakDays(3, 8)).toEqual([6, 7, 8]); // Wed Thu Fri
  });
  it('skips the Sunday rest day, matching how the streak was earned', () => {
    expect(backfillStreakDays(3, 11)).toEqual([8, 9, 11]); // Fri Sat · (Sun rest) · Mon
  });
  it('handles a streak of 1 and of 0', () => {
    expect(backfillStreakDays(1, 5)).toEqual([5]);
    expect(backfillStreakDays(0, 5)).toEqual([]);
  });
  it('never includes a rest day', () => {
    for (const d of backfillStreakDays(12, 25)) expect(isRestDay(d)).toBe(false);
  });
});

describe('dayNumberFromDate', () => {
  it('maps local midnight dates to consecutive day numbers', () => {
    const a = dayNumberFromDate(new Date(2026, 5, 9));
    const b = dayNumberFromDate(new Date(2026, 5, 10));
    expect(b).toBe(a + 1);
  });
  it('agrees with the weekday convention ((d + 4) % 7 = Date.getDay())', () => {
    const d = new Date(2026, 5, 10); // a Wednesday
    expect((dayNumberFromDate(d) + 4) % 7).toBe(d.getDay());
  });
});

describe('monthGrid', () => {
  // June 2026 starts on a Monday and has 30 days.
  it('lays out June 2026 as full Monday-start weeks', () => {
    const g = monthGrid(2026, 5);
    expect(g.length).toBe(5);
    expect(g[0]![0]).toEqual({ dayNumber: dayNumberFromDate(new Date(2026, 5, 1)), date: 1 });
    expect(g[4]![1]!.date).toBe(30); // 30th lands on the final Tuesday
    expect(g[4]!.slice(2).every((c) => c === null)).toBe(true); // padded tail
  });

  it('pads leading days for a month that starts mid-week', () => {
    // May 2026 starts on a Friday → 4 leading nulls in a Monday-start row.
    const g = monthGrid(2026, 4);
    expect(g[0]!.slice(0, 4).every((c) => c === null)).toBe(true);
    expect(g[0]![4]).toEqual({ dayNumber: dayNumberFromDate(new Date(2026, 4, 1)), date: 1 });
  });

  it('contains every day of the month exactly once, in order', () => {
    const cells = monthGrid(2026, 1).flat().filter((c) => c !== null);
    expect(cells.map((c) => c!.date)).toEqual(Array.from({ length: 28 }, (_, i) => i + 1)); // Feb 2026
    const first = cells[0]!.dayNumber;
    cells.forEach((c, i) => expect(c!.dayNumber).toBe(first + i));
  });
});
