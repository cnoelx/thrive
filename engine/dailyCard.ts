// Today's workout = the fixed weekly schedule for the current day. Sets are fixed; reps/time come
// from the user's current level for each exercise, so the card "auto-evolves" as they level up.

import { CategoryId, EXERCISE_BY_KEY, categoryCeiling, exerciseTarget } from '@/data/benchmarks';
import { DAY_KEYS, WEEKLY_SCHEDULE } from '@/data/schedule';
import { ProgressState, baselineLevel, completedLevel, levelCap, nextLevel } from '@/engine/progression';

// Cap on sets per exercise, applied to every workout at every level — two sets is plenty without
// burning people out (one fresh goal set + one work set when chasing). Raise this to lengthen.
export const MAX_SETS = 2;

// Superman — back/posture fallback for users with no bar/rings. NOT a category exercise: it never
// shows a category chip, never contributes to levels, and never completes Pull. Its target derives
// from the user's overall level (baselineLevel with Pull excluded) across the 10 levels below.
export const SUPERMAN_KEY = 'superman';
const SUPERMAN_TARGETS = ['8 reps', '10 reps', '12 reps', '15 reps', '15 + 2s hold', 'hold 20s', 'swimmer 30s', 'W-raise ×15', 'superman rock ×15', 'hold 40s'] as const;
function supermanTarget(overall: number): string {
  const idx = Math.min(Math.max(overall, 1), SUPERMAN_TARGETS.length) - 1;
  return SUPERMAN_TARGETS[idx]!;
}

/** The level a category should train today: its next level when within the runway, otherwise its
 *  highest completed level (maintenance), clamped to available content. */
export function trainingLevel(state: ProgressState, pullUnlocked: boolean, c: CategoryId): number {
  const next = nextLevel(state, c);
  const ceiling = categoryCeiling(c);
  if (next > ceiling) return ceiling; // capped → maintenance at the top target
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
  /** The level target being trained — the next level's goal when chasing. */
  target: string;
  /** What sets after the first use when chasing: the COMPLETED level's target (volume the user can
   *  actually do). Equals `target` when not chasing, at L0 (the L1 goal is the entry workout), or
   *  for single-effort items. Set 1 stays the fresh goal attempt. */
  workTarget: string;
  level: number;
  /** True when the target is the NEXT level's goal (not yet earned) — something to grow into over
   *  sessions, not nail on day one. Maintenance/capped items are false. */
  chasing: boolean;
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
    const completed = completedLevel(state, ex.categoryId);
    const chasing = level > completed;
    const target = exerciseTarget(it.exKey, level);
    items.push({
      exKey: it.exKey,
      categoryId: ex.categoryId,
      name: ex.name,
      why: ex.why,
      sets: it.sets === null ? null : Math.min(it.sets, MAX_SETS),
      restSec: it.restSec,
      target,
      workTarget: chasing && completed >= 1 ? exerciseTarget(it.exKey, completed) : target,
      level,
      chasing,
      note: it.note,
    });
  }
  if (droppedPull) {
    const overall = baselineLevel(state, pullUnlocked);
    const level = Math.min(Math.max(overall, 1), SUPERMAN_TARGETS.length);
    const target = supermanTarget(overall);
    items.push({
      exKey: SUPERMAN_KEY,
      name: 'Superman',
      why: 'Back / posture work (no-equipment back substitute)',
      sets: 2,
      restSec: 45,
      target,
      workTarget: target,
      level,
      chasing: false, // tracks the overall level, not a goal being earned
    });
  }

  return { focus: sched.focus, rest: !!sched.rest, items };
}
