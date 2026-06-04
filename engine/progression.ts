// The progression engine — pure, side-effect-free logic. Levels are per category; claims are
// self-reported at any time (no training-gate) but bounded by the runway-of-one cap. Kept free of
// React/Expo so it can be unit-tested in isolation.

import { Benchmark, CATEGORY_IDS, CategoryId, MAX_LEVEL, benchmarksFor } from '@/data/benchmarks';

// A category may progress to (baseline + RUNWAY). With baseline L0 that means L1 and L2 are open
// while L3 is locked — the spec's "runway of one".
export const RUNWAY = 2;

export interface ProgressState {
  /** benchmarkId -> claimed */
  claimed: Record<string, boolean>;
}

export function emptyProgress(): ProgressState {
  return { claimed: {} };
}

/** Build a starting state from an onboarding placement: every benchmark up to each category's
 *  placed level is pre-claimed. */
export function progressFromPlacement(placed: Partial<Record<CategoryId, number>>): ProgressState {
  const claimed: Record<string, boolean> = {};
  for (const c of CATEGORY_IDS) {
    const top = placed[c] ?? 0;
    for (let level = 1; level <= top; level++) {
      for (const b of benchmarksFor(c, level)) claimed[b.id] = true;
    }
  }
  return { claimed };
}

function levelComplete(state: ProgressState, c: CategoryId, level: number): boolean {
  const set = benchmarksFor(c, level);
  if (set.length === 0) return false;
  return set.every((b) => state.claimed[b.id]);
}

/** Highest contiguous level fully completed in a category (0 = none). */
export function completedLevel(state: ProgressState, c: CategoryId): number {
  let lvl = 0;
  for (let l = 1; l <= MAX_LEVEL; l++) {
    if (levelComplete(state, c, l)) lvl = l;
    else break;
  }
  return lvl;
}

/** Baseline = the level completed across ALL categories (the min). */
export function baselineLevel(state: ProgressState): number {
  return Math.min(...CATEGORY_IDS.map((c) => completedLevel(state, c)));
}

/** The highest level any category is currently allowed to work toward (runway-of-one). */
export function levelCap(state: ProgressState): number {
  return baselineLevel(state) + RUNWAY;
}

/** The level a category is currently working toward (its next uncompleted level). */
export function nextLevel(state: ProgressState, c: CategoryId): number {
  return completedLevel(state, c) + 1;
}

export type LockReason = 'none' | 'runway' | 'maxed';

export function lockReason(state: ProgressState, c: CategoryId): LockReason {
  const next = nextLevel(state, c);
  if (next > MAX_LEVEL) return 'maxed';
  if (next > levelCap(state)) return 'runway';
  return 'none';
}

export function isCategoryLocked(state: ProgressState, c: CategoryId): boolean {
  return lockReason(state, c) !== 'none';
}

/** A benchmark is claimable iff: not already claimed, it's the category's current working level,
 *  and within the runway cap. Claims are self-reported — no training requirement. */
export function isClaimable(state: ProgressState, b: Benchmark): boolean {
  if (state.claimed[b.id]) return false;
  if (b.level !== nextLevel(state, b.categoryId)) return false;
  if (b.level > levelCap(state)) return false;
  return true;
}

/** Pure: returns a new state with the benchmark marked claimed. Gate with isClaimable first. */
export function claim(state: ProgressState, benchmarkId: string): ProgressState {
  return { ...state, claimed: { ...state.claimed, [benchmarkId]: true } };
}

/** Claim a benchmark if allowed; otherwise return the same state reference (no-op). */
export function applyClaim(state: ProgressState, b: Benchmark): ProgressState {
  if (!isClaimable(state, b)) return state;
  return claim(state, b.id);
}

/** The marquee milestone: Level 1 complete across all categories ("Foundation Complete"). */
export function foundationComplete(state: ProgressState): boolean {
  return baselineLevel(state) >= 1;
}

/** Categories lagging behind the others — those at the lowest completed level while some category
 *  is ahead. Returns [] when every category is level. */
export function laggingCategories(state: ProgressState): CategoryId[] {
  const levels = CATEGORY_IDS.map((c) => completedLevel(state, c));
  const min = Math.min(...levels);
  const max = Math.max(...levels);
  if (min === max) return [];
  return CATEGORY_IDS.filter((c) => completedLevel(state, c) === min);
}
