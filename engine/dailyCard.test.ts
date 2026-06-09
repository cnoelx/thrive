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

// Claim every benchmark everywhere: Move/Push/Pull/Cardio reach L10, Mobility maxes at L5.
function maxedState(): ProgressState {
  let s = emptyProgress();
  for (let l = 1; l <= 10; l++) for (const c of CATEGORY_IDS) s = claimLevel(s, c, l);
  return s;
}

describe('weekly schedule', () => {
  it('Sunday is a rest day with no items', () => {
    const w = todaysWorkout(emptyProgress(), true, dateForDay(0));
    expect(w.rest).toBe(true);
    expect(w.items.length).toBe(0);
  });

  it('Monday is Full Body with four items', () => {
    const w = todaysWorkout(emptyProgress(), true, dateForDay(1));
    expect(w.focus).toBe('Full Body');
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

// Capped / maxed exercises must NOT drop out of the schedule — they stay in and run at their top
// (maintenance) target.
describe('capped & maxed exercises stay in the workout (maintenance)', () => {
  it('maxed Mobility still appears on its day at the L5 target', () => {
    const tue = todaysWorkout(maxedState(), true, dateForDay(2));
    expect(tue.items.length).toBe(4); // nothing dropped
    const dsq = tue.items.find((i) => i.exKey === 'deepsquat')!;
    expect(dsq.target).toBe('free 120s'); // L5 top, held as maintenance
  });

  it('an exercise that caps below its category (Balance, L8) maintains at its top target', () => {
    const thu = todaysWorkout(maxedState(), true, dateForDay(4));
    const bal = thu.items.find((i) => i.exKey === 'balance')!;
    expect(bal.target).toBe('unstable surface 30s'); // L8 top even though Move reaches L10
  });
});

// When Pull is locked, every pull-category item is dropped and one Superman is appended (per day
// that had any pull items). The Superman target steps up with overall level (baseline of the
// unlocked categories) across the 10 levels.
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
    const w = todaysWorkout(emptyProgress(), false, dateForDay(3)); // Wednesday — Legs & Core
    expect(w.items.some((i) => i.exKey === SUPERMAN_KEY)).toBe(false);
  });

  it('Superman has no category chip (categoryId undefined)', () => {
    const w = todaysWorkout(emptyProgress(), false, dateForDay(1));
    const sm = w.items.find((i) => i.exKey === SUPERMAN_KEY)!;
    expect(sm.categoryId).toBeUndefined();
  });

  it("Superman's target reads from overall level and scales across levels", () => {
    const sm = (s: ProgressState) => todaysWorkout(s, false, dateForDay(1)).items.find((i) => i.exKey === SUPERMAN_KEY)!.target;

    expect(sm(emptyProgress())).toBe('8 reps'); // baseline 0 → L1

    let s = emptyProgress();
    for (const c of effectiveCategoryIds(false)) s = claimLevel(s, c, 1);
    expect(sm(s)).toBe('8 reps'); // baseline 1 → L1

    for (const c of effectiveCategoryIds(false)) s = claimLevel(s, c, 2);
    expect(sm(s)).toBe('10 reps'); // baseline 2

    for (const c of effectiveCategoryIds(false)) s = claimLevel(s, c, 3);
    expect(sm(s)).toBe('12 reps'); // baseline 3

    for (const c of effectiveCategoryIds(false)) s = claimLevel(s, c, 4);
    expect(sm(s)).toBe('15 reps'); // baseline 4 — past the old L3 cap
  });

  it('with Pull unlocked, the schedule is untouched (no Superman, pull moves stay)', () => {
    const w = todaysWorkout(emptyProgress(), true, dateForDay(1));
    expect(w.items.some((i) => i.exKey === 'barrow')).toBe(true);
    expect(w.items.some((i) => i.exKey === SUPERMAN_KEY)).toBe(false);
  });
});
