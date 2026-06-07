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

/** Categories currently 'in play' for the multi-category math (baseline, overall level, lagging, the
 *  runway cap). Pull is excluded until the user confirms they have a bar/rings — otherwise it would
 *  sit at L0 forever and cap every other category at L2. */
export function effectiveCategoryIds(pullUnlocked: boolean): CategoryId[] {
  return pullUnlocked ? CATEGORY_IDS : CATEGORY_IDS.filter((c) => c !== 'pull');
}

/** Baseline = the level completed across all UNLOCKED categories (the min). */
export function baselineLevel(state: ProgressState, pullUnlocked: boolean): number {
  return Math.min(...effectiveCategoryIds(pullUnlocked).map((c) => completedLevel(state, c)));
}

/** The highest level any category is currently allowed to work toward (runway-of-one). */
export function levelCap(state: ProgressState, pullUnlocked: boolean): number {
  return baselineLevel(state, pullUnlocked) + RUNWAY;
}

/** The level a category is currently working toward (its next uncompleted level). */
export function nextLevel(state: ProgressState, c: CategoryId): number {
  return completedLevel(state, c) + 1;
}

export type LockReason = 'none' | 'runway' | 'maxed' | 'noEquipment';

export function lockReason(state: ProgressState, pullUnlocked: boolean, c: CategoryId): LockReason {
  if (c === 'pull' && !pullUnlocked) return 'noEquipment';
  const next = nextLevel(state, c);
  if (next > MAX_LEVEL) return 'maxed';
  if (next > levelCap(state, pullUnlocked)) return 'runway';
  return 'none';
}

export function isCategoryLocked(state: ProgressState, pullUnlocked: boolean, c: CategoryId): boolean {
  return lockReason(state, pullUnlocked, c) !== 'none';
}

/** A benchmark is claimable iff: not already claimed, it's the category's current working level,
 *  within the runway cap, and its category isn't equipment-locked. Self-reported — no training gate. */
export function isClaimable(state: ProgressState, pullUnlocked: boolean, b: Benchmark): boolean {
  if (b.categoryId === 'pull' && !pullUnlocked) return false;
  if (state.claimed[b.id]) return false;
  if (b.level !== nextLevel(state, b.categoryId)) return false;
  if (b.level > levelCap(state, pullUnlocked)) return false;
  return true;
}

/** Pure: returns a new state with the benchmark marked claimed. Gate with isClaimable first. */
export function claim(state: ProgressState, benchmarkId: string): ProgressState {
  return { ...state, claimed: { ...state.claimed, [benchmarkId]: true } };
}

/** Pure: returns a new state with the benchmark un-claimed (lets the user undo a mis-tap). */
export function unclaim(state: ProgressState, benchmarkId: string): ProgressState {
  const claimed = { ...state.claimed };
  delete claimed[benchmarkId];
  return { ...state, claimed };
}

/** Claim a benchmark if allowed; otherwise return the same state reference (no-op). */
export function applyClaim(state: ProgressState, pullUnlocked: boolean, b: Benchmark): ProgressState {
  if (!isClaimable(state, pullUnlocked, b)) return state;
  return claim(state, b.id);
}

/** Categories lagging behind the others (only among unlocked ones). Returns [] when level. */
export function laggingCategories(state: ProgressState, pullUnlocked: boolean): CategoryId[] {
  const cats = effectiveCategoryIds(pullUnlocked);
  const levels = cats.map((c) => completedLevel(state, c));
  const min = Math.min(...levels);
  const max = Math.max(...levels);
  if (min === max) return [];
  return cats.filter((c) => completedLevel(state, c) === min);
}
