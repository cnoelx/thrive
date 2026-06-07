import { describe, expect, it } from '@jest/globals';

import { CATEGORY_IDS, EXERCISE_BY_KEY, benchmarksFor } from '@/data/benchmarks';
import { SUPERMAN_KEY, todaysWorkout } from '@/engine/dailyCard';
import { ProgressState, claim, effectiveCategoryIds, emptyProgress } from '@/engine/progression';

function claimLevel(state: ProgressState, c: (typeof CATEGORY_IDS)[number], level: number): ProgressState {
  let s = state;
  for (const b of benchmarksFor(c, level)) s = claim(s, b.id);
  return s;
}

// Jan 5 2025 is a Sunday; offset to reach a given weekday (0 = Sun … 6 = Sat).
function dateForDay(dow: number): Date {
  const d = new Date(2025, 0, 5);
  d.setDate(d.getDate() + dow);
  return d;
}

describe('weekly schedule', () => {
  it('Sunday is a rest day with no items', () => {
    const w = todaysWorkout(emptyProgress(), true, dateForDay(0));
    expect(w.rest).toBe(true);
    expect(w.items.length).toBe(0);
  });

  it('Monday is Strength A with four items', () => {
    const w = todaysWorkout(emptyProgress(), true, dateForDay(1));
    expect(w.focus).toBe('Strength A');
    expect(w.items.length).toBe(4);
  });

  it('reps read from the current level (L1 at the start)', () => {
    const w = todaysWorkout(emptyProgress(), true, dateForDay(1));
    const squat = w.items.find((i) => i.exKey === 'squat')!;
    expect(squat.level).toBe(1);
    expect(squat.target).toBe(EXERCISE_BY_KEY['squat']!.targets[0]);
  });

  it('Tuesday includes the mobility checks', () => {
    const w = todaysWorkout(emptyProgress(), true, dateForDay(2));
    expect(w.items.some((i) => i.categoryId === 'mobility')).toBe(true);
  });
});

// When Pull is locked, every pull-category item is dropped and one Superman is appended (per day
// that had any pull items). The Superman target steps up with overall level (baseline of the
// unlocked categories) and caps at the L3 target.
describe('Superman fallback (no equipment)', () => {
  it('Monday drops Inverted Row and adds one Superman', () => {
    const w = todaysWorkout(emptyProgress(), false, dateForDay(1));
    expect(w.items.some((i) => i.exKey === 'barrow')).toBe(false);
    expect(w.items.filter((i) => i.exKey === SUPERMAN_KEY).length).toBe(1);
  });

  it('Thursday drops both pull moves and adds just ONE Superman', () => {
    const w = todaysWorkout(emptyProgress(), false, dateForDay(4));
    expect(w.items.some((i) => i.exKey === 'deadhang' || i.exKey === 'pullup')).toBe(false);
    expect(w.items.filter((i) => i.exKey === SUPERMAN_KEY).length).toBe(1);
  });

  it('days with no pull items do NOT add Superman', () => {
    const w = todaysWorkout(emptyProgress(), false, dateForDay(3)); // Wednesday — Strength B
    expect(w.items.some((i) => i.exKey === SUPERMAN_KEY)).toBe(false);
  });

  it('Superman has no category chip (categoryId undefined)', () => {
    const w = todaysWorkout(emptyProgress(), false, dateForDay(1));
    const sm = w.items.find((i) => i.exKey === SUPERMAN_KEY)!;
    expect(sm.categoryId).toBeUndefined();
  });

  it("Superman's target reads from overall level and caps at L3", () => {
    // At baseline 0: shows L1 target
    let w = todaysWorkout(emptyProgress(), false, dateForDay(1));
    expect(w.items.find((i) => i.exKey === SUPERMAN_KEY)!.target).toBe('8 reps, 1s hold');

    // Complete L1 across the 4 unlocked categories → baseline 1 → still L1 target
    let s = emptyProgress();
    for (const c of effectiveCategoryIds(false)) s = claimLevel(s, c, 1);
    w = todaysWorkout(s, false, dateForDay(1));
    expect(w.items.find((i) => i.exKey === SUPERMAN_KEY)!.target).toBe('8 reps, 1s hold');

    // Complete L2 across the 4 → baseline 2 → L2 target
    for (const c of effectiveCategoryIds(false)) s = claimLevel(s, c, 2);
    w = todaysWorkout(s, false, dateForDay(1));
    expect(w.items.find((i) => i.exKey === SUPERMAN_KEY)!.target).toBe('12 reps, 2s hold');

    // Complete L3 → L3 target (capped)
    for (const c of effectiveCategoryIds(false)) s = claimLevel(s, c, 3);
    w = todaysWorkout(s, false, dateForDay(1));
    expect(w.items.find((i) => i.exKey === SUPERMAN_KEY)!.target).toBe('15 reps, 3s hold');

    // L4 — still L3 (cap)
    for (const c of effectiveCategoryIds(false)) s = claimLevel(s, c, 4);
    w = todaysWorkout(s, false, dateForDay(1));
    expect(w.items.find((i) => i.exKey === SUPERMAN_KEY)!.target).toBe('15 reps, 3s hold');
  });

  it('with Pull unlocked, the schedule is untouched (no Superman, pull moves stay)', () => {
    const w = todaysWorkout(emptyProgress(), true, dateForDay(1));
    expect(w.items.some((i) => i.exKey === 'barrow')).toBe(true);
    expect(w.items.some((i) => i.exKey === SUPERMAN_KEY)).toBe(false);
  });
});
