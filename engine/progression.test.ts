import { describe, expect, it } from '@jest/globals';

import { BENCHMARKS, CATEGORY_IDS, CategoryId, MAX_LEVEL, benchmarksFor } from '@/data/benchmarks';
import {
  ProgressState,
  RUNWAY,
  applyClaim,
  baselineLevel,
  claim,
  completedLevel,
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
  it('defines L1..L5 for all four categories', () => {
    for (const c of CATEGORY_IDS) {
      for (let l = 1; l <= MAX_LEVEL; l++) expect(benchmarksFor(c, l).length).toBeGreaterThan(0);
    }
  });

  it('has five levels and four categories', () => {
    expect(MAX_LEVEL).toBe(5);
    expect(CATEGORY_IDS.length).toBe(4);
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
    expect(baselineLevel(s)).toBe(0);
    expect(RUNWAY).toBe(2);
    expect(levelCap(s)).toBe(2);
  });
  it('not Foundation-complete', () => expect(foundationComplete(s)).toBe(false));
});

describe('claiming (anytime within the runway)', () => {
  it('L1 is claimable immediately, no training required', () => {
    expect(isClaimable(emptyProgress(), firstBenchmark('move', 1))).toBe(true);
  });
  it('L3 is not claimable at the start (beyond the runway)', () => {
    expect(isClaimable(emptyProgress(), firstBenchmark('move', 3))).toBe(false);
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
    expect(baselineLevel(s)).toBe(0);
    expect(levelCap(s)).toBe(2);
    expect(lockReason(s, 'move')).toBe('runway');
    expect(isClaimable(s, firstBenchmark('move', 3))).toBe(false);
  });

  it('unlocks the next tier GLOBALLY when a level is completed everywhere', () => {
    let s = completeEverywhere(emptyProgress(), 1);
    expect(baselineLevel(s)).toBe(1);
    expect(levelCap(s)).toBe(3);
    expect(foundationComplete(s)).toBe(true);
    s = claimLevel(s, 'move', 2);
    expect(lockReason(s, 'move')).toBe('none');
    expect(isClaimable(s, firstBenchmark('move', 3))).toBe(true);
  });

  it('reports maxed once all five levels are complete', () => {
    let s = emptyProgress();
    for (let l = 1; l <= MAX_LEVEL; l++) s = completeEverywhere(s, l);
    expect(completedLevel(s, 'move')).toBe(MAX_LEVEL);
    expect(lockReason(s, 'move')).toBe('maxed');
  });
});

describe('applyClaim', () => {
  it('claims a claimable benchmark', () => {
    const b = firstBenchmark('move', 1);
    expect(applyClaim(emptyProgress(), b).claimed[b.id]).toBe(true);
  });
  it('is a no-op when the benchmark is beyond the runway', () => {
    const s = emptyProgress();
    expect(applyClaim(s, firstBenchmark('move', 3))).toBe(s);
  });
});

describe('placement', () => {
  it('pre-claims everything up to each placed level', () => {
    const s = progressFromPlacement({ move: 2, cardio: 1 });
    expect(completedLevel(s, 'move')).toBe(2);
    expect(completedLevel(s, 'cardio')).toBe(1);
    expect(completedLevel(s, 'pushpull')).toBe(0);
  });
  it('placing Level 1 everywhere completes the Foundation', () => {
    const placed: Partial<Record<CategoryId, number>> = {};
    for (const c of CATEGORY_IDS) placed[c] = 1;
    expect(foundationComplete(progressFromPlacement(placed))).toBe(true);
  });
});

describe('lagging categories', () => {
  it('is empty when every category is at the same level', () => {
    expect(laggingCategories(emptyProgress())).toEqual([]);
  });
  it('flags the categories left behind when one pulls ahead', () => {
    const s = claimLevel(emptyProgress(), 'move', 1);
    const lagging = laggingCategories(s);
    expect(lagging).not.toContain('move');
    expect(lagging.length).toBe(CATEGORY_IDS.length - 1);
  });
});
