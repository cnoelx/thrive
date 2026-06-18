// Achievements ("trophy shelf") — pure definitions + unlock logic. The shelf is physical *feats*:
// each unlocks when its specific benchmark is claimed (consistency is handled separately by the
// streak system + celebrations). No React/Expo here, so it's unit-tested in isolation.

import { ProgressState } from '@/engine/progression';

export type AchievementGroup = 'push' | 'pull' | 'legs' | 'cardio' | 'mobility';

export interface Achievement {
  id: string;
  title: string;
  desc: string;
  icon: string; // icon key, mapped to a glyph in the screen
  group: AchievementGroup;
  unlocked: (c: AchievementContext) => boolean;
}

export interface AchievementInputs {
  progress: ProgressState;
}

export interface AchievementContext {
  claimed: (benchmarkId: string) => boolean;
}

export function achievementContext(i: AchievementInputs): AchievementContext {
  return { claimed: (id) => !!i.progress.claimed[id] };
}

// Every feat just checks that a specific ladder rung has been claimed.
const at = (benchmarkId: string) => (c: AchievementContext) => c.claimed(benchmarkId);

export const ACHIEVEMENTS: Achievement[] = [
  // Push
  { id: 'first-pushup', title: 'First push-up', desc: 'Do 5 full push-ups.', icon: 'pushup', group: 'push', unlocked: at('pushups-l5') },
  { id: 'onearm-pushup', title: 'One-arm push-up', desc: 'Press up on a single arm.', icon: 'pushup', group: 'push', unlocked: at('pushups-l10') },
  // Pull (5-pull-up award unlocks at the 6-rep rung — if you can do 6 you can do 5)
  { id: 'first-pullup', title: 'First pull-up', desc: 'Pull your bodyweight up once.', icon: 'pullup', group: 'pull', unlocked: at('pullup-l5') },
  { id: 'pullup-5', title: '5 pull-ups', desc: 'Five clean pull-ups.', icon: 'pullup', group: 'pull', unlocked: at('pullup-l7') },
  { id: 'pullup-10', title: '10 pull-ups', desc: 'Ten clean pull-ups.', icon: 'pullup', group: 'pull', unlocked: at('pullup-l8') },
  { id: 'onearm-pullup', title: 'One-arm pull-up', desc: 'The one-arm pull-up.', icon: 'pullup', group: 'pull', unlocked: at('pullup-l10') },
  // Legs
  { id: 'squats-50', title: '50 squats', desc: 'Fifty bodyweight squats.', icon: 'squat', group: 'legs', unlocked: at('squat-l5') },
  { id: 'pistol-squat', title: 'Pistol squat', desc: 'A full single-leg squat.', icon: 'squat', group: 'legs', unlocked: at('squat-l10') },
  // Cardio
  { id: 'run-5k', title: 'First 5K', desc: 'Cover five kilometres.', icon: 'run', group: 'cardio', unlocked: at('walkrun-l7') },
  { id: 'run-10k', title: '10K', desc: 'Cover ten kilometres.', icon: 'run', group: 'cardio', unlocked: at('walkrun-l10') },
  // Mobility
  { id: 'toe-touch', title: 'Touch your toes', desc: 'Reach your toes in a forward fold.', icon: 'fold', group: 'mobility', unlocked: at('forwardfold-l2') },
  { id: 'head-to-knees', title: 'Head to knees', desc: 'Fold flat — head to your knees.', icon: 'fold', group: 'mobility', unlocked: at('forwardfold-l5') },
];

/** The ids currently earned, given the context. */
export function unlockedIds(c: AchievementContext): string[] {
  return ACHIEVEMENTS.filter((a) => a.unlocked(c)).map((a) => a.id);
}
