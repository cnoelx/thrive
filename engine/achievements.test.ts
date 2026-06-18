import { describe, expect, it } from '@jest/globals';

import { CATEGORY_IDS, CategoryId, benchmarksFor } from '@/data/benchmarks';
import { type AchievementInputs, achievementContext, unlockedIds } from '@/engine/achievements';
import { weekDays } from '@/engine/history';
import { ProgressState, claim, emptyProgress } from '@/engine/progression';
import { isRestDay, nextWorkoutDay } from '@/engine/streak';

// Force-claim every benchmark in category c up to `level` (bypasses the runway — we're setting up state).
function claimLevel(state: ProgressState, c: CategoryId, level: number): ProgressState {
  let s = state;
  for (let l = 1; l <= level; l++) for (const b of benchmarksFor(c, l)) s = claim(s, b.id);
  return s;
}

// N consecutive scheduled workout days from `start` (skips rest days).
function runFrom(start: number, n: number): number[] {
  const days = [start];
  let d = start;
  for (let i = 1; i < n; i++) {
    d = nextWorkoutDay(d);
    days.push(d);
  }
  return days;
}

const inputs = (over: Partial<AchievementInputs>): AchievementInputs => ({ progress: emptyProgress(), pullUnlocked: true, loggedDays: [], ...over });
const earned = (over: Partial<AchievementInputs>) => unlockedIds(achievementContext(inputs(over)));

const DAY = 100; // a Saturday (weekday 6) — a scheduled workout day

describe('achievements', () => {
  it('a fresh user has earned nothing', () => {
    expect(earned({})).toEqual([]);
  });

  it('first workout unlocks "First step" only', () => {
    expect(earned({ loggedDays: [DAY] })).toEqual(['first-workout']);
  });

  it('a 7-day run unlocks the 7-day streak (not the 30)', () => {
    const ids = earned({ loggedDays: runFrom(DAY, 7) });
    expect(ids).toContain('streak-7');
    expect(ids).not.toContain('streak-30');
  });

  it('functional firsts come from the specific claimed benchmark', () => {
    expect(earned({ progress: claimLevel(emptyProgress(), 'push', 5) })).toContain('full-pushups');
    expect(earned({ progress: claimLevel(emptyProgress(), 'pull', 5) })).toContain('first-pullup');
    expect(earned({})).not.toContain('full-pushups');
  });

  it('reaching Level 1 everywhere unlocks "Level up"', () => {
    let p = emptyProgress();
    for (const c of CATEGORY_IDS) p = claimLevel(p, c, 1);
    expect(earned({ progress: p })).toContain('level-1');
  });

  it('volume milestones fire at the thresholds', () => {
    const days = Array.from({ length: 25 }, (_, i) => DAY + i * 2); // 25 distinct days
    const ids = earned({ loggedDays: days });
    expect(ids).toContain('workouts-25');
    expect(ids).not.toContain('workouts-50');
  });

  it('training every scheduled day of a week unlocks "Perfect week"', () => {
    const scheduled = weekDays(DAY).filter((d) => !isRestDay(d));
    expect(earned({ loggedDays: scheduled })).toContain('perfect-week');
  });

  it('a broken-then-resumed streak unlocks "Comeback"', () => {
    const run1 = runFrom(DAY, 3); // a real 3-day streak
    const gap = nextWorkoutDay(run1[run1.length - 1]); // skipped (not logged)
    const resume = nextWorkoutDay(gap); // picked back up
    expect(earned({ loggedDays: [...run1, resume] })).toContain('comeback');
  });

  it('a single unbroken run is not a comeback', () => {
    expect(earned({ loggedDays: runFrom(DAY, 5) })).not.toContain('comeback');
  });
});
