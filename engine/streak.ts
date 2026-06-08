// Workout-streak logic — pure, side-effect-free, unit-tested in isolation. A streak counts
// consecutive completed *scheduled* workouts: rest days (read from the weekly schedule) are skipped
// and never break it, but missing a scheduled workout day resets it.

import { DAY_KEYS, WEEKLY_SCHEDULE } from '@/data/schedule';

// Day 0 (epoch, 1970-01-01) is a Thursday, so weekday = (dayNumber + 4) % 7 (0 = Sunday … 6 = Saturday),
// matching JS Date.getDay(). Rest is read from the schedule, so adding rest days later is respected.
export function isRestDay(dayNumber: number): boolean {
  const weekday = (((dayNumber + 4) % 7) + 7) % 7;
  return WEEKLY_SCHEDULE[DAY_KEYS[weekday]].rest === true;
}

/** The scheduled workout day immediately before `dayNumber` (skips rest days). */
export function previousWorkoutDay(dayNumber: number): number {
  let d = dayNumber - 1;
  while (isRestDay(d)) d--;
  return d;
}

/** New streak count after completing `day`'s workout. Continues (+1) if the last completed day was the
 *  immediately-preceding workout day; otherwise restarts at 1. A repeat log of the same day is a no-op. */
export function nextStreak(prevStreak: number, lastLoggedDay: number | null, day: number): number {
  if (lastLoggedDay === day) return prevStreak;
  if (lastLoggedDay !== null && lastLoggedDay === previousWorkoutDay(day)) return prevStreak + 1;
  return 1;
}

/** The streak to DISPLAY as of `today`: the stored count if it's still alive, else 0. Alive when the last
 *  completed workout is today or the most recent scheduled workout day (today's workout may still be
 *  pending). If a workout day was missed, it's broken. */
export function currentStreak(streak: number, lastLoggedDay: number | null, today: number): number {
  if (lastLoggedDay === null) return 0;
  return lastLoggedDay >= previousWorkoutDay(today) ? streak : 0;
}

// Streak lengths worth celebrating with a popup.
export const STREAK_MILESTONES = [5, 10, 20, 50, 100];

/** The highest milestone the current streak has reached that hasn't been celebrated yet (`seen` = the
 *  highest already-celebrated milestone), or null if none is pending. */
export function pendingStreakMilestone(streak: number, seen: number): number | null {
  let result: number | null = null;
  for (const m of STREAK_MILESTONES) {
    if (streak >= m && m > seen) result = m;
  }
  return result;
}
