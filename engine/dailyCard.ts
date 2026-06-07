// Today's workout = the fixed weekly schedule for the current day. Sets are fixed; reps/time come
// from the user's current level for each exercise, so the card "auto-evolves" as they level up.

import { CategoryId, EXERCISE_BY_KEY, MAX_LEVEL, exerciseTarget } from '@/data/benchmarks';
import { DAY_KEYS, WEEKLY_SCHEDULE } from '@/data/schedule';
import { ProgressState, baselineLevel, completedLevel, levelCap, nextLevel } from '@/engine/progression';

// Superman — back/posture fallback for users with no bar/rings. NOT a category exercise: it never
// shows a category chip, never contributes to levels, and never completes Pull. Reps derive from
// the user's overall level (baselineLevel with Pull excluded) and cap at the L3 target.
export const SUPERMAN_KEY = 'superman';
const SUPERMAN_TARGETS = ['8 reps, 1s hold', '12 reps, 2s hold', '15 reps, 3s hold'] as const;
function supermanTarget(overall: number): string {
  const idx = Math.min(Math.max(overall, 1), SUPERMAN_TARGETS.length) - 1;
  return SUPERMAN_TARGETS[idx]!;
}

/** The level a category should train today: its next level when within the runway, otherwise its
 *  highest completed level (maintenance), clamped to available content. */
export function trainingLevel(state: ProgressState, pullUnlocked: boolean, c: CategoryId): number {
  const next = nextLevel(state, c);
  if (next > MAX_LEVEL) return MAX_LEVEL;
  if (next > levelCap(state, pullUnlocked)) return Math.max(completedLevel(state, c), 1);
  return next;
}

export interface WorkoutItem {
  exKey: string;
  /** Omitted for the Superman fallback — it sits outside the category system. */
  categoryId?: CategoryId;
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

export function todaysWorkout(state: ProgressState, pullUnlocked: boolean, date: Date): TodaysWorkout {
  const dayKey = DAY_KEYS[date.getDay()] ?? 'mon';
  const sched = WEEKLY_SCHEDULE[dayKey];

  // Build today's items. When Pull is locked, drop pull-category items and add ONE Superman to the
  // day if any were dropped (regardless of how many — keeps the day's count reasonable).
  let droppedPull = false;
  const items: WorkoutItem[] = [];
  for (const it of sched.items) {
    const ex = EXERCISE_BY_KEY[it.exKey]!;
    if (ex.categoryId === 'pull' && !pullUnlocked) {
      droppedPull = true;
      continue;
    }
    const level = trainingLevel(state, pullUnlocked, ex.categoryId);
    items.push({
      exKey: it.exKey,
      categoryId: ex.categoryId,
      name: ex.name,
      why: ex.why,
      sets: it.sets,
      restSec: it.restSec,
      target: exerciseTarget(it.exKey, level),
      level,
      note: it.note,
    });
  }
  if (droppedPull) {
    const overall = baselineLevel(state, pullUnlocked);
    const level = Math.min(Math.max(overall, 1), SUPERMAN_TARGETS.length);
    items.push({
      exKey: SUPERMAN_KEY,
      name: 'Superman',
      why: 'Back / posture work (no-equipment back substitute)',
      sets: 2,
      restSec: 45,
      target: supermanTarget(overall),
      level,
    });
  }

  return { focus: sched.focus, rest: !!sched.rest, items };
}
