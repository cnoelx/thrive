// Today's workout = the fixed weekly schedule for the current day. Sets are fixed; reps/time come
// from the user's current level for each exercise, so the card "auto-evolves" as they level up.

import { CategoryId, EXERCISE_BY_KEY, MAX_LEVEL, exerciseTarget } from '@/data/benchmarks';
import { DAY_KEYS, WEEKLY_SCHEDULE } from '@/data/schedule';
import { ProgressState, completedLevel, levelCap, nextLevel } from '@/engine/progression';

/** The level a category should train today: its next level when within the runway, otherwise its
 *  highest completed level (maintenance), clamped to available content. */
export function trainingLevel(state: ProgressState, c: CategoryId): number {
  const next = nextLevel(state, c);
  if (next > MAX_LEVEL) return MAX_LEVEL;
  if (next > levelCap(state)) return Math.max(completedLevel(state, c), 1);
  return next;
}

export interface WorkoutItem {
  exKey: string;
  categoryId: CategoryId;
  name: string;
  why: string;
  sets: number | null;
  restSec?: number; // rest between sets, in seconds
  target: string; // reps/time at the current level
  level: number;
  note?: string;
}

export interface TodaysWorkout {
  focus: string;
  rest: boolean;
  items: WorkoutItem[];
}

export function todaysWorkout(state: ProgressState, date: Date): TodaysWorkout {
  const dayKey = DAY_KEYS[date.getDay()] ?? 'mon';
  const sched = WEEKLY_SCHEDULE[dayKey];
  const items: WorkoutItem[] = sched.items.map((it) => {
    const ex = EXERCISE_BY_KEY[it.exKey]!;
    const level = trainingLevel(state, ex.categoryId);
    return {
      exKey: it.exKey,
      categoryId: ex.categoryId,
      name: ex.name,
      why: ex.why,
      sets: it.sets,
      restSec: it.restSec,
      target: exerciseTarget(it.exKey, level),
      level,
      note: it.note,
    };
  });
  return { focus: sched.focus, rest: !!sched.rest, items };
}
