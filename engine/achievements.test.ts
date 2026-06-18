import { describe, expect, it } from '@jest/globals';

import { CATEGORY_IDS, CategoryId, benchmarksFor } from '@/data/benchmarks';
import { type AchievementInputs, achievementContext, unlockedIds } from '@/engine/achievements';
import { ProgressState, claim, emptyProgress } from '@/engine/progression';

// Force-claim every benchmark in category c up to `level` (bypasses the runway — we're setting up state).
function claimLevel(state: ProgressState, c: CategoryId, level: number): ProgressState {
  let s = state;
  for (let l = 1; l <= level; l++) for (const b of benchmarksFor(c, l)) s = claim(s, b.id);
  return s;
}

const inputs = (over: Partial<AchievementInputs>): AchievementInputs => ({ progress: emptyProgress(), pullUnlocked: true, ...over });
const earned = (over: Partial<AchievementInputs>) => unlockedIds(achievementContext(inputs(over)));

describe('achievements', () => {
  it('a fresh user has earned nothing', () => {
    expect(earned({})).toEqual([]);
  });

  it('push feats unlock from the push ladder', () => {
    expect(earned({ progress: claimLevel(emptyProgress(), 'push', 5) })).toContain('first-pushup');
    expect(earned({ progress: claimLevel(emptyProgress(), 'push', 5) })).not.toContain('onearm-pushup');
    expect(earned({ progress: claimLevel(emptyProgress(), 'push', 10) })).toContain('onearm-pushup');
  });

  it('pull feats unlock at their rungs — 5-award fires at the 6-rep rung (L7)', () => {
    expect(earned({ progress: claimLevel(emptyProgress(), 'pull', 5) })).toEqual(expect.arrayContaining(['first-pullup']));
    const atSix = earned({ progress: claimLevel(emptyProgress(), 'pull', 7) });
    expect(atSix).toContain('pullup-5');
    expect(atSix).not.toContain('pullup-10');
    const atTen = earned({ progress: claimLevel(emptyProgress(), 'pull', 8) });
    expect(atTen).toContain('pullup-10');
    expect(earned({ progress: claimLevel(emptyProgress(), 'pull', 10) })).toContain('onearm-pullup');
  });

  it('legs + cardio feats unlock from their ladders', () => {
    expect(earned({ progress: claimLevel(emptyProgress(), 'move', 5) })).toContain('squats-50');
    expect(earned({ progress: claimLevel(emptyProgress(), 'move', 10) })).toContain('pistol-squat');
    expect(earned({ progress: claimLevel(emptyProgress(), 'cardio', 7) })).toContain('run-5k');
    expect(earned({ progress: claimLevel(emptyProgress(), 'cardio', 10) })).toContain('run-10k');
  });

  it('program complete unlocks only when every area is maxed', () => {
    expect(earned({})).not.toContain('complete');
    let p = emptyProgress();
    for (let l = 1; l <= 10; l++) for (const c of CATEGORY_IDS) p = claimLevel(p, c, l);
    expect(earned({ progress: p })).toContain('complete');
  });
});
