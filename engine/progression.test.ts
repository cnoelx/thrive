import { describe, expect, it } from '@jest/globals';

import { BENCHMARKS, CATEGORY_IDS, CategoryId, MAX_LEVEL, benchmarksFor, categoryCeiling, exerciseTarget } from '@/data/benchmarks';
import {
  ProgressState,
  RUNWAY,
  applyClaim,
  baselineLevel,
  claim,
  completedLevel,
  effectiveCategoryIds,
  emptyProgress,
  isCategoryMaxed,
  isClaimable,
  laggingCategories,
  levelCap,
  lockReason,
  nextLevel,
  progressFromPlacement,
  unclaim,
} from '@/engine/progression';

function claimLevel(state: ProgressState, c: CategoryId, level: number): ProgressState {
  let s = state;
  for (const b of benchmarksFor(c, level)) s = claim(s, b.id);
  return s;
}

function completeEverywhere(state: ProgressState, level: number): ProgressState {
  let s = state;
  for (const c of CATEGORY_IDS) s = claimLevel(s, c, level);
  return s;
}

function firstBenchmark(c: CategoryId, level: number) {
  const b = benchmarksFor(c, level)[0];
  if (!b) throw new Error(`no benchmark for ${c}/L${level}`);
  return b;
}

describe('program data', () => {
  it('defines L1..L5 for all categories', () => {
    for (const c of CATEGORY_IDS) {
      for (let l = 1; l <= 5; l++) expect(benchmarksFor(c, l).length).toBeGreaterThan(0);
    }
  });

  it('has ten levels and five categories', () => {
    expect(MAX_LEVEL).toBe(10);
    expect(CATEGORY_IDS.length).toBe(5);
  });

  it('categories cap at their own ceilings (Mobility at 5, the rest at 10)', () => {
    expect(categoryCeiling('mobility')).toBe(5);
    expect(benchmarksFor('mobility', 6).length).toBe(0);
    for (const c of ['move', 'push', 'pull', 'cardio'] as const) expect(categoryCeiling(c)).toBe(10);
  });

  it('has globally unique benchmark ids', () => {
    const ids = BENCHMARKS.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('exerciseTarget falls back to the TOP target past an exercise ceiling (maintenance)', () => {
    expect(exerciseTarget('sittostand', 6)).toBe('No hands'); // ceiling 5
    expect(exerciseTarget('balance', 10)).toBe('unstable surface 30s'); // ceiling 8
  });
});

// An exercise that caps below its category's ceiling (Sit-to-Stand L5, Balance L8 inside Move L10)
// drops out of the level requirement past its cap — higher levels complete without it.
describe('per-exercise caps', () => {
  it('benchmarks stop existing past an exercise ceiling', () => {
    expect(benchmarksFor('move', 6).some((b) => b.exKey === 'sittostand')).toBe(false);
    expect(benchmarksFor('move', 9).some((b) => b.exKey === 'balance')).toBe(false);
    expect(benchmarksFor('move', 8).some((b) => b.exKey === 'balance')).toBe(true); // still in at its cap
  });

  it('a level completes without the exercises that capped below it', () => {
    let s = emptyProgress();
    for (let l = 1; l <= 5; l++) s = completeEverywhere(s, l);
    s = claimLevel(s, 'move', 6); // the L6 set no longer includes Sit-to-Stand
    expect(completedLevel(s, 'move')).toBe(6);
  });
});

describe('starting state (baseline L0)', () => {
  const s = emptyProgress();
  it('every category at level 0', () => {
    for (const c of CATEGORY_IDS) expect(completedLevel(s, c)).toBe(0);
  });
  it('baseline 0, runway cap 2', () => {
    expect(baselineLevel(s, true)).toBe(0);
    expect(RUNWAY).toBe(2);
    expect(levelCap(s, true)).toBe(2);
  });
});

describe('claiming (anytime within the runway)', () => {
  it('L1 is claimable immediately, no training required', () => {
    expect(isClaimable(emptyProgress(), true, firstBenchmark('move', 1))).toBe(true);
  });
  it('L3 is not claimable at the start (beyond the runway)', () => {
    expect(isClaimable(emptyProgress(), true, firstBenchmark('move', 3))).toBe(false);
  });
  it('one exercise cannot run ahead of its category level', () => {
    // Squat L1 claimed, but Move L1 isn't complete (siblings pending) — so squat L2 stays locked.
    const squatL1 = BENCHMARKS.find((b) => b.exKey === 'squat' && b.level === 1)!;
    const squatL2 = BENCHMARKS.find((b) => b.exKey === 'squat' && b.level === 2)!;
    const s = claim(emptyProgress(), squatL1.id);
    expect(isClaimable(s, true, squatL2)).toBe(false);
  });
  it('an already-claimed benchmark is not claimable again', () => {
    const b = firstBenchmark('move', 1);
    expect(isClaimable(claim(emptyProgress(), b.id), true, b)).toBe(false);
  });
});

describe('leveling up', () => {
  it('advances completedLevel when a full level is claimed', () => {
    const s = claimLevel(emptyProgress(), 'move', 1);
    expect(completedLevel(s, 'move')).toBe(1);
    expect(nextLevel(s, 'move')).toBe(2);
  });
});

describe('runway-of-one', () => {
  it('locks L3 while the baseline is L0, even for a category pushed to L2', () => {
    let s = claimLevel(emptyProgress(), 'move', 1);
    s = claimLevel(s, 'move', 2);
    expect(completedLevel(s, 'move')).toBe(2);
    expect(baselineLevel(s, true)).toBe(0);
    expect(levelCap(s, true)).toBe(2);
    expect(lockReason(s, true, 'move')).toBe('runway');
    expect(isClaimable(s, true, firstBenchmark('move', 3))).toBe(false);
  });

  it('unlocks the next tier GLOBALLY when a level is completed everywhere', () => {
    let s = completeEverywhere(emptyProgress(), 1);
    expect(baselineLevel(s, true)).toBe(1);
    expect(levelCap(s, true)).toBe(3);
    s = claimLevel(s, 'move', 2);
    expect(lockReason(s, true, 'move')).toBe('none');
    expect(isClaimable(s, true, firstBenchmark('move', 3))).toBe(true);
  });

  it('a category maxes at its own ceiling and stops gating the overall', () => {
    let s = emptyProgress();
    for (let l = 1; l <= 5; l++) s = completeEverywhere(s, l);
    expect(completedLevel(s, 'mobility')).toBe(5); // Mobility tops out at L5
    expect(lockReason(s, true, 'mobility')).toBe('maxed');
    expect(lockReason(s, true, 'push')).toBe('none'); // Push still has room (ceiling 10)
    // Maxed Mobility no longer drags the overall down — push the rest to L6
    for (const c of ['move', 'push', 'pull', 'cardio'] as const) s = claimLevel(s, c, 6);
    expect(baselineLevel(s, true)).toBe(6);
  });

  it('overall reaches MAX_LEVEL when every category hits its ceiling', () => {
    let s = emptyProgress();
    for (let l = 1; l <= MAX_LEVEL; l++) s = completeEverywhere(s, l);
    expect(completedLevel(s, 'move')).toBe(MAX_LEVEL);
    expect(completedLevel(s, 'mobility')).toBe(5);
    expect(baselineLevel(s, true)).toBe(MAX_LEVEL);
  });
});

describe('maxed categories', () => {
  it('a maxed category reports "maxed" even when the runway would also lock it', () => {
    // Mobility maxed while everything else sits at L0: next (6) is past the cap (2) AND the
    // ceiling (5) — 'maxed' must win so the UI says "done", not "catch the others up".
    const s = progressFromPlacement({ mobility: 5 });
    expect(isCategoryMaxed(s, 'mobility')).toBe(true);
    expect(lockReason(s, true, 'mobility')).toBe('maxed');
    expect(baselineLevel(s, true)).toBe(0); // the others still gate the overall
    expect(laggingCategories(s, true)).not.toContain('mobility');
  });

  it('with Pull locked, the program completes when the four unlocked categories max out', () => {
    let s = emptyProgress();
    for (let l = 1; l <= MAX_LEVEL; l++) for (const c of effectiveCategoryIds(false)) s = claimLevel(s, c, l);
    expect(baselineLevel(s, false)).toBe(MAX_LEVEL);
    expect(completedLevel(s, 'pull')).toBe(0); // Pull untouched, and not blocking
  });

  it('unclaiming a ceiling benchmark un-maxes the category and re-gates the overall', () => {
    let s = emptyProgress();
    for (let l = 1; l <= 5; l++) s = completeEverywhere(s, l);
    for (const c of ['move', 'push', 'pull', 'cardio'] as const) s = claimLevel(s, c, 6);
    expect(baselineLevel(s, true)).toBe(6); // Mobility maxed, ignored
    s = unclaim(s, firstBenchmark('mobility', 5).id);
    expect(isCategoryMaxed(s, 'mobility')).toBe(false);
    expect(baselineLevel(s, true)).toBe(4); // Mobility back in play at L4
  });
});

describe('applyClaim', () => {
  it('claims a claimable benchmark', () => {
    const b = firstBenchmark('move', 1);
    expect(applyClaim(emptyProgress(), true, b).claimed[b.id]).toBe(true);
  });
  it('is a no-op when the benchmark is beyond the runway', () => {
    const s = emptyProgress();
    expect(applyClaim(s, true, firstBenchmark('move', 3))).toBe(s);
  });
  it('unclaim reverses a claim', () => {
    const all = claimLevel(emptyProgress(), 'move', 1);
    expect(completedLevel(all, 'move')).toBe(1);
    const b = firstBenchmark('move', 1);
    expect(completedLevel(unclaim(all, b.id), 'move')).toBe(0);
  });
});

describe('placement', () => {
  it('pre-claims everything up to each placed level', () => {
    const s = progressFromPlacement({ move: 2, cardio: 1 });
    expect(completedLevel(s, 'move')).toBe(2);
    expect(completedLevel(s, 'cardio')).toBe(1);
    expect(completedLevel(s, 'push')).toBe(0);
  });
  it('placing Level 1 everywhere makes overall level 1', () => {
    const placed: Partial<Record<CategoryId, number>> = {};
    for (const c of CATEGORY_IDS) placed[c] = 1;
    expect(baselineLevel(progressFromPlacement(placed), true)).toBe(1);
  });
});

describe('lagging categories', () => {
  it('is empty when every category is at the same level', () => {
    expect(laggingCategories(emptyProgress(), true)).toEqual([]);
  });
  it('flags the categories left behind when one pulls ahead', () => {
    const s = claimLevel(emptyProgress(), 'move', 1);
    const lagging = laggingCategories(s, true);
    expect(lagging).not.toContain('move');
    expect(lagging.length).toBe(CATEGORY_IDS.length - 1);
  });
});

// Pull is locked when the user hasn't said they have a bar/rings. While locked, Pull is excluded
// from baseline/overall/runway math (so other categories aren't capped at L2 forever), Pull
// benchmarks are never claimable, and the category reports lockReason 'noEquipment'.
describe('locked Pull (no equipment)', () => {
  it('effectiveCategoryIds drops "pull" when locked', () => {
    expect(effectiveCategoryIds(true)).toEqual(CATEGORY_IDS);
    expect(effectiveCategoryIds(false)).not.toContain('pull');
    expect(effectiveCategoryIds(false).length).toBe(CATEGORY_IDS.length - 1);
  });

  it('baseline ignores Pull when locked', () => {
    let s = emptyProgress();
    for (const c of effectiveCategoryIds(false)) s = claimLevel(s, c, 1);
    expect(baselineLevel(s, false)).toBe(1);
    expect(baselineLevel(s, true)).toBe(0); // unlocked, but Pull still at L0 drags it down
  });

  it('lockReason for Pull is "noEquipment" when locked', () => {
    expect(lockReason(emptyProgress(), false, 'pull')).toBe('noEquipment');
    expect(lockReason(emptyProgress(), true, 'pull')).toBe('none');
  });

  it('Pull benchmarks are never claimable while locked', () => {
    const b = firstBenchmark('pull', 1);
    expect(isClaimable(emptyProgress(), false, b)).toBe(false);
    expect(isClaimable(emptyProgress(), true, b)).toBe(true);
  });

  it('applyClaim no-ops on Pull benchmarks while locked', () => {
    const b = firstBenchmark('pull', 1);
    const s = emptyProgress();
    expect(applyClaim(s, false, b)).toBe(s);
  });

  it('Pull at L0 does not cap the other categories when locked', () => {
    let s = emptyProgress();
    // Complete L1 across the 4 unlocked categories. Other categories should be able to progress to L3.
    for (const c of effectiveCategoryIds(false)) s = claimLevel(s, c, 1);
    expect(levelCap(s, false)).toBe(3); // baseline 1 + RUNWAY 2
    expect(isClaimable(s, false, firstBenchmark('move', 3))).toBe(false); // Move at L1 — claiming L3 still skips L2
    s = claimLevel(s, 'move', 2);
    expect(isClaimable(s, false, firstBenchmark('move', 3))).toBe(true);
  });

  it('laggingCategories does not include Pull while locked', () => {
    const s = claimLevel(emptyProgress(), 'move', 1);
    const lagging = laggingCategories(s, false);
    expect(lagging).not.toContain('pull');
    expect(lagging).not.toContain('move');
  });
});
