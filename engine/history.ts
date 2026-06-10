// Workout-history helpers — pure date/day-number math for the week strip and the month calendar.
// Day numbers are local days since epoch (see todayNumber in the screens); weekday = (d + 4) % 7
// matching JS Date.getDay(), same convention as engine/streak.

import { previousWorkoutDay } from '@/engine/streak';

/** The day number of a local Date (days since epoch in the device's timezone). */
export function dayNumberFromDate(d: Date): number {
  return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000);
}

/** The current week as day numbers, Monday → Sunday, containing `today`. */
export function weekDays(today: number): number[] {
  const weekday = (((today + 4) % 7) + 7) % 7; // 0 = Sunday
  const monday = today - ((weekday + 6) % 7);
  return Array.from({ length: 7 }, (_, i) => monday + i);
}

/** Reconstruct the day numbers covered by the current streak (ascending, ending at lastLoggedDay).
 *  Truthful one-time backfill for users from before workout days were recorded: a streak of N means
 *  exactly the last N scheduled workout days were completed. */
export function backfillStreakDays(streak: number, lastLoggedDay: number): number[] {
  if (streak <= 0) return [];
  const days = [lastLoggedDay];
  let d = lastLoggedDay;
  for (let i = 1; i < streak; i++) {
    d = previousWorkoutDay(d);
    days.unshift(d);
  }
  return days;
}

export interface MonthCell {
  dayNumber: number;
  /** Day of the month, 1-based. */
  date: number;
}

/** A calendar month as rows of 7 (Monday-start weeks); null pads days outside the month. */
export function monthGrid(year: number, month: number): (MonthCell | null)[][] {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayNumber = dayNumberFromDate(first);
  const lead = (first.getDay() + 6) % 7; // column index in a Monday-start row
  const weeks: (MonthCell | null)[][] = [];
  let week: (MonthCell | null)[] = new Array(lead).fill(null);
  for (let date = 1; date <= daysInMonth; date++) {
    week.push({ dayNumber: firstDayNumber + date - 1, date });
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }
  return weeks;
}
