import { describe, expect, it } from '@jest/globals';

import { BENCHMARKS, CATEGORY_IDS, CategoryId, MAX_LEVEL, benchmarksFor } from '@/data/benchmarks';
import {
  ProgressState,
  RUNWAY,
  applyClaim,
  baselineLevel,
  claim,
  completedLevel,
  effectiveCategoryIds,
  emptyProgress,
  foundationComplete,
  isClaimable,
  laggingCategories,
  levelCap,
  lockReason,
  nextLevel,
  progressFromPlacement,
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
      for (let l = 1; l <= MAX_LEVEL; l++) expect(benchmarksFor(c, l).length).toBeGreaterThan(0);
    }
  });

  it('has five levels and five categories', () => {
    expect(MAX_LEVEL).toBe(5);
    expect(CATEGORY_IDS.length).toBe(5);
  });

  it('has globally unique benchmark ids', () => {
    const ids = BENCHMARKS.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
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
  it('not Foundation-complete', () => expect(foundationComplete(s, true)).toBe(false));
});

describe('claiming (anytime within the runway)', () => {
  it('L1 is claimable immediately, no training required', () => {
    expect(isClaimable(emptyProgress(), true, firstBenchmark('move', 1))).toBe(true);
  });
  it('L3 is not claimable at the start (beyond the runway)', () => {
    expect(isClaimable(emptyProgress(), true, firstBenchmark('move', 3))).toBe(false);
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
    expect(foundationComplete(s, true)).toBe(true);
    s = claimLevel(s, 'move', 2);
    expect(lockReason(s, true, 'move')).toBe('none');
    expect(isClaimable(s, true, firstBenchmark('move', 3))).toBe(true);
  });

  it('reports maxed once all five levels are complete', () => {
    let s = emptyProgress();
    for (let l = 1; l <= MAX_LEVEL; l++) s = completeEverywhere(s, l);
    expect(completedLevel(s, 'move')).toBe(MAX_LEVEL);
    expect(lockReason(s, true, 'move')).toBe('maxed');
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
});

describe('placement', () => {
  it('pre-claims everything up to each placed level', () => {
    const s = progressFromPlacement({ move: 2, cardio: 1 });
    expect(completedLevel(s, 'move')).toBe(2);
    expect(completedLevel(s, 'cardio')).toBe(1);
    expect(completedLevel(s, 'push')).toBe(0);
  });
  it('placing Level 1 everywhere completes the Foundation', () => {
    const placed: Partial<Record<CategoryId, number>> = {};
    for (const c of CATEGORY_IDS) placed[c] = 1;
    expect(foundationComplete(progressFromPlacement(placed), true)).toBe(true);
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
// from baseline/foundation/runway math (so other categories aren't capped at L2 forever), Pull
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

  it('foundationComplete needs only the unlocked categories at L1', () => {
    let s = emptyProgress();
    for (const c of effectiveCategoryIds(false)) s = claimLevel(s, c, 1);
    expect(foundationComplete(s, false)).toBe(true);
    expect(foundationComplete(s, true)).toBe(false);
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
