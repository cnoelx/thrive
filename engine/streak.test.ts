import { describe, expect, it } from '@jest/globals';

import { currentStreak, isRestDay, nextStreak, pendingStreakMilestone, previousWorkoutDay } from '@/engine/streak';

// Day-number → weekday is (d + 4) % 7 (0 = Sun). Reference week used below:
//   4 Mon · 5 Tue · 6 Wed · 7 Thu · 8 Fri · 9 Sat · 10 Sun · 11 Mon
describe('isRestDay', () => {
  it('is true only for Sunday', () => {
    expect(isRestDay(10)).toBe(true); // Sun
    expect(isRestDay(4)).toBe(false); // Mon
    expect(isRestDay(9)).toBe(false); // Sat
  });
});

describe('previousWorkoutDay', () => {
  it('returns the prior weekday', () => {
    expect(previousWorkoutDay(5)).toBe(4); // Tue -> Mon
  });
  it('skips the Sunday rest day', () => {
    expect(previousWorkoutDay(11)).toBe(9); // Mon -> Sat (skips Sun 10)
    expect(previousWorkoutDay(10)).toBe(9); // Sun -> Sat
  });
});

describe('nextStreak', () => {
  it('starts at 1 on the first ever workout', () => {
    expect(nextStreak(0, null, 4)).toBe(1);
  });
  it('continues on consecutive workout days', () => {
    expect(nextStreak(2, 4, 5)).toBe(3); // Mon -> Tue
  });
  it('continues across the weekend rest day', () => {
    expect(nextStreak(5, 9, 11)).toBe(6); // Sat -> Mon
  });
  it('restarts at 1 when a workout day was missed', () => {
    expect(nextStreak(5, 4, 11)).toBe(1); // Mon then jump to next Mon (missed days)
  });
  it('is a no-op when the same day is logged again', () => {
    expect(nextStreak(3, 5, 5)).toBe(3);
  });
});

describe('currentStreak', () => {
  it('is 0 with no logged workout', () => {
    expect(currentStreak(3, null, 5)).toBe(0);
  });
  it('shows the count when today is already done', () => {
    expect(currentStreak(4, 5, 5)).toBe(4); // logged today
  });
  it('stays alive when today is still pending but the last workout day was done', () => {
    expect(currentStreak(4, 4, 5)).toBe(4); // did Mon, Tue pending
  });
  it('stays alive on a rest day when Saturday was done', () => {
    expect(currentStreak(4, 9, 10)).toBe(4); // Sun, did Sat
  });
  it('breaks to 0 when a workout day was missed', () => {
    expect(currentStreak(4, 2, 5)).toBe(0); // big gap before Tue
    expect(currentStreak(4, 8, 10)).toBe(0); // Sun, but missed Sat (last was Fri)
  });
});

describe('pendingStreakMilestone', () => {
  it('returns null below the first milestone', () => {
    expect(pendingStreakMilestone(4, 0)).toBeNull();
  });
  it('returns a milestone exactly reached and not yet seen', () => {
    expect(pendingStreakMilestone(5, 0)).toBe(5);
    expect(pendingStreakMilestone(10, 5)).toBe(10);
    expect(pendingStreakMilestone(100, 50)).toBe(100);
  });
  it('returns null once that milestone is already seen', () => {
    expect(pendingStreakMilestone(5, 5)).toBeNull();
    expect(pendingStreakMilestone(7, 5)).toBeNull(); // 5 seen, not yet at 10
  });
  it('returns the highest reached-but-unseen milestone', () => {
    expect(pendingStreakMilestone(60, 0)).toBe(50);
  });
});
