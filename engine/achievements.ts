// Achievements ("trophy shelf") — pure, side-effect-free definitions + unlock logic. Each achievement
// is a predicate over a small context derived from the user's progress + history. No React/Expo here,
// so it's unit-tested in isolation; the screen + celebration wiring sit on top.

import { CATEGORY_IDS, MAX_LEVEL } from '@/data/benchmarks';
import { longestStreak, weekDays } from '@/engine/history';
import { ProgressState, baselineLevel, isCategoryMaxed } from '@/engine/progression';
import { isRestDay, previousWorkoutDay } from '@/engine/streak';

export type AchievementGroup = 'consistency' | 'functional' | 'progression' | 'volume';

export interface Achievement {
  id: string;
  title: string;
  desc: string;
  icon: string; // icon key, mapped to a glyph in the screen
  group: AchievementGroup;
  unlocked: (c: AchievementContext) => boolean;
}

/** Raw state the context is derived from — the screen passes these straight from the store. */
export interface AchievementInputs {
  progress: ProgressState;
  pullUnlocked: boolean;
  loggedDays: number[];
}

/** Pre-computed values the predicates read, so each `unlocked` stays a cheap comparison. */
export interface AchievementContext {
  totalWorkouts: number;
  longestStreak: number;
  overallLevel: number;
  maxedAreas: number;
  allMaxed: boolean;
  comeback: boolean;
  perfectWeek: boolean;
  claimed: (benchmarkId: string) => boolean;
}

/** Number of separate workout runs (a run starts on a logged day whose previous workout day wasn't
 *  logged). Two-plus runs after hitting a real streak = the user broke a streak and came back. */
function runCount(loggedDays: number[]): number {
  const set = new Set(loggedDays);
  let runs = 0;
  for (const d of set) if (!set.has(previousWorkoutDay(d))) runs++;
  return runs;
}

/** True if some calendar week has every one of its scheduled (non-rest) days logged. */
function hasPerfectWeek(loggedDays: number[]): boolean {
  const set = new Set(loggedDays);
  for (const monday of new Set(loggedDays.map((d) => weekDays(d)[0]))) {
    const scheduled = weekDays(monday).filter((d) => !isRestDay(d));
    if (scheduled.length > 0 && scheduled.every((d) => set.has(d))) return true;
  }
  return false;
}

export function achievementContext(i: AchievementInputs): AchievementContext {
  return {
    totalWorkouts: i.loggedDays.length,
    longestStreak: longestStreak(i.loggedDays),
    overallLevel: baselineLevel(i.progress, i.pullUnlocked),
    maxedAreas: CATEGORY_IDS.filter((c) => isCategoryMaxed(i.progress, c)).length,
    allMaxed: baselineLevel(i.progress, i.pullUnlocked) >= MAX_LEVEL,
    comeback: runCount(i.loggedDays) >= 2 && longestStreak(i.loggedDays) >= 3,
    perfectWeek: hasPerfectWeek(i.loggedDays),
    claimed: (id) => !!i.progress.claimed[id],
  };
}

export const ACHIEVEMENTS: Achievement[] = [
  // Consistency
  { id: 'first-workout', title: 'First step', desc: 'Finish your first workout.', icon: 'flag', group: 'consistency', unlocked: (c) => c.totalWorkouts >= 1 },
  { id: 'streak-7', title: 'On a roll', desc: 'Reach a 7-day streak.', icon: 'flame', group: 'consistency', unlocked: (c) => c.longestStreak >= 7 },
  { id: 'streak-30', title: 'Committed', desc: 'Reach a 30-day streak.', icon: 'flame', group: 'consistency', unlocked: (c) => c.longestStreak >= 30 },
  { id: 'streak-100', title: 'Unstoppable', desc: 'Reach a 100-day streak.', icon: 'flame', group: 'consistency', unlocked: (c) => c.longestStreak >= 100 },
  { id: 'perfect-week', title: 'Perfect week', desc: 'Train every scheduled day in a week.', icon: 'calendar', group: 'consistency', unlocked: (c) => c.perfectWeek },
  { id: 'comeback', title: 'Comeback', desc: 'Pick it back up after a break.', icon: 'rotate', group: 'consistency', unlocked: (c) => c.comeback },
  // Functional firsts
  { id: 'full-pushups', title: 'Full push-ups', desc: 'Reach 5 full push-ups.', icon: 'pushup', group: 'functional', unlocked: (c) => c.claimed('pushups-l5') },
  { id: 'first-pullup', title: 'First pull-up', desc: 'Pull your own bodyweight up.', icon: 'pullup', group: 'functional', unlocked: (c) => c.claimed('pullup-l5') },
  { id: 'plank-90', title: '90-second plank', desc: 'Hold a 90-second plank.', icon: 'clock', group: 'functional', unlocked: (c) => c.claimed('plank-l5') },
  { id: 'no-hands-floor', title: 'No-hands floor', desc: 'Get off the floor with no hands.', icon: 'stand', group: 'functional', unlocked: (c) => c.claimed('sittostand-l5') },
  { id: 'free-deep-squat', title: 'Free deep squat', desc: 'Hold a free deep squat.', icon: 'squat', group: 'functional', unlocked: (c) => c.claimed('deepsquat-l3') },
  // Progression
  { id: 'level-1', title: 'Level up', desc: 'Reach overall Level 1.', icon: 'bolt', group: 'progression', unlocked: (c) => c.overallLevel >= 1 },
  { id: 'level-5', title: 'Well-rounded', desc: 'Reach overall Level 5.', icon: 'bolt', group: 'progression', unlocked: (c) => c.overallLevel >= 5 },
  { id: 'area-master', title: 'Area master', desc: 'Max out a training area.', icon: 'medal', group: 'progression', unlocked: (c) => c.maxedAreas >= 1 },
  { id: 'complete', title: 'Complete', desc: 'Max out the whole program.', icon: 'trophy', group: 'progression', unlocked: (c) => c.allMaxed },
  // Volume
  { id: 'workouts-25', title: '25 workouts', desc: 'Log 25 workouts.', icon: 'number', group: 'volume', unlocked: (c) => c.totalWorkouts >= 25 },
  { id: 'workouts-50', title: '50 workouts', desc: 'Log 50 workouts.', icon: 'number', group: 'volume', unlocked: (c) => c.totalWorkouts >= 50 },
  { id: 'workouts-100', title: '100 workouts', desc: 'Log 100 workouts.', icon: 'number', group: 'volume', unlocked: (c) => c.totalWorkouts >= 100 },
];

/** The ids currently earned, given the context. */
export function unlockedIds(c: AchievementContext): string[] {
  return ACHIEVEMENTS.filter((a) => a.unlocked(c)).map((a) => a.id);
}
