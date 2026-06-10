// Global app state, persisted on-device via AsyncStorage. The progression *rules* live in the
// pure engine; this store just holds state and applies the engine's transforms. Claims are
// self-reported at any time, so there's no training-credit to track — logging is just "did today's
// workout".

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { BENCHMARK_BY_ID } from '@/data/benchmarks';
import { Equipment, GoalId } from '@/data/onboarding';
import { WHATS_NEW } from '@/data/whatsNew';
import { backfillStreakDays } from '@/engine/history';
import { ProgressState, applyClaim, emptyProgress, unclaim } from '@/engine/progression';
import { nextStreak } from '@/engine/streak';

export interface Profile {
  equipment: Equipment; // currently defaulted (equipment screen deferred)
  goal: GoalId; // currently defaulted (goal screen deferred)
  healthFlag: boolean; // true if any PAR-Q question was answered "yes"
}

interface AppState {
  /** false until persisted state has loaded — screens wait on this before routing. */
  hydrated: boolean;
  onboarded: boolean;
  name: string;
  profile: Profile | null;
  progress: ProgressState;
  /** Day-number of the last completed workout — drives the "completed today" state. */
  lastLoggedDay: number | null;
  /** Consecutive-completed-workout streak as of lastLoggedDay (rest days don't break it). */
  streak: number;
  /** Day-numbers of every completed workout, ascending — drives the week strip and the calendar.
   *  Recording started with the history feature; older history is backfilled from the streak. */
  loggedDays: number[];
  /** Highest streak milestone the user has seen the celebration for; cleared when the streak resets. */
  streakMilestoneSeen: number;
  /** Highest overall level the user has acknowledged (dismissed the celebration for). The next
   *  level-up celebration fires when their current overall exceeds this. */
  overallLevelSeen: number;
  /** Highest "What's new" changelog version the user has dismissed. */
  whatsNewSeen: number;
  nudgeDismissedDay: number | null;
  reminderEnabled: boolean;
  reminderHour: number;
  reminderMinute: number;
  /** Set during onboarding (or later via the locked-Pull tile) when the user confirms they have a
   *  bar/rings. Once true, Pull joins category math and the schedule includes real pull moves. */
  pullUnlocked: boolean;

  completeOnboarding: (profile: Profile, initialProgress?: ProgressState) => void;
  unlockPull: () => void;
  /** Mark today's workout complete. */
  logToday: (dayNumber: number) => void;
  /** Claim a benchmark (validated by the engine). */
  claimBenchmark: (benchmarkId: string) => void;
  unclaimBenchmark: (benchmarkId: string) => void;
  markOverallLevelSeen: (level: number) => void;
  markStreakMilestoneSeen: (milestone: number) => void;
  markWhatsNewSeen: (version: number) => void;
  dismissNudge: (dayNumber: number) => void;
  setReminder: (enabled: boolean, hour: number, minute: number) => void;
  setName: (name: string) => void;
  /** Dev/testing helper to wipe back to a clean first-launch state. */
  resetAll: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      hydrated: false,
      onboarded: false,
      name: '',
      profile: null,
      progress: emptyProgress(),
      lastLoggedDay: null,
      streak: 0,
      loggedDays: [],
      streakMilestoneSeen: 0,
      overallLevelSeen: 0,
      whatsNewSeen: 0,
      nudgeDismissedDay: null,
      reminderEnabled: false,
      reminderHour: 8,
      reminderMinute: 0,
      pullUnlocked: false,

      completeOnboarding: (profile, initialProgress) =>
        set({
          onboarded: true,
          profile,
          progress: initialProgress ?? emptyProgress(),
          lastLoggedDay: null,
          streak: 0,
          loggedDays: [],
          streakMilestoneSeen: 0,
          overallLevelSeen: 0,
          whatsNewSeen: WHATS_NEW.version,
          nudgeDismissedDay: null,
        }),

      logToday: (dayNumber) =>
        set((s) => {
          if (s.lastLoggedDay === dayNumber) return s;
          const streak = nextStreak(s.streak, s.lastLoggedDay, dayNumber);
          // A fresh run (streak back to 1) re-arms all milestone celebrations.
          return {
            lastLoggedDay: dayNumber,
            streak,
            loggedDays: s.loggedDays.includes(dayNumber) ? s.loggedDays : [...s.loggedDays, dayNumber],
            streakMilestoneSeen: streak === 1 ? 0 : s.streakMilestoneSeen,
          };
        }),

      claimBenchmark: (benchmarkId) =>
        set((s) => {
          const b = BENCHMARK_BY_ID[benchmarkId];
          if (!b) return s;
          return { progress: applyClaim(s.progress, s.pullUnlocked, b) };
        }),

      unclaimBenchmark: (benchmarkId) => set((s) => ({ progress: unclaim(s.progress, benchmarkId) })),

      markOverallLevelSeen: (level) => set({ overallLevelSeen: level }),

      markStreakMilestoneSeen: (milestone) => set({ streakMilestoneSeen: milestone }),

      markWhatsNewSeen: (version) => set({ whatsNewSeen: version }),

      dismissNudge: (dayNumber) => set({ nudgeDismissedDay: dayNumber }),

      setReminder: (enabled, hour, minute) => set({ reminderEnabled: enabled, reminderHour: hour, reminderMinute: minute }),

      setName: (name) => set({ name }),

      unlockPull: () => set({ pullUnlocked: true }),

      resetAll: () =>
        set({
          onboarded: false,
          name: '',
          profile: null,
          progress: emptyProgress(),
          lastLoggedDay: null,
          streak: 0,
          loggedDays: [],
          streakMilestoneSeen: 0,
          overallLevelSeen: 0,
          whatsNewSeen: 0,
          nudgeDismissedDay: null,
          reminderEnabled: false,
          reminderHour: 8,
          reminderMinute: 0,
          pullUnlocked: false,
        }),
    }),
    {
      // Bumped key so older, differently-shaped data is discarded.
      name: 'thrive-state-v5',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        onboarded: s.onboarded,
        name: s.name,
        profile: s.profile,
        progress: s.progress,
        lastLoggedDay: s.lastLoggedDay,
        streak: s.streak,
        loggedDays: s.loggedDays,
        streakMilestoneSeen: s.streakMilestoneSeen,
        overallLevelSeen: s.overallLevelSeen,
        whatsNewSeen: s.whatsNewSeen,
        nudgeDismissedDay: s.nudgeDismissedDay,
        reminderEnabled: s.reminderEnabled,
        reminderHour: s.reminderHour,
        reminderMinute: s.reminderMinute,
        pullUnlocked: s.pullUnlocked,
      }),
    },
  ),
);

// One-time backfill for users from before workout days were recorded: a streak of N means exactly
// the last N scheduled workout days were completed, so reconstruct them. No-op once loggedDays has data.
function backfillLoggedDays() {
  const s = useAppStore.getState();
  if (s.loggedDays.length === 0 && s.streak > 0 && s.lastLoggedDay !== null) {
    useAppStore.setState({ loggedDays: backfillStreakDays(s.streak, s.lastLoggedDay) });
  }
}

useAppStore.persist.onFinishHydration(() => {
  backfillLoggedDays();
  useAppStore.setState({ hydrated: true });
});
if (useAppStore.persist.hasHydrated()) {
  backfillLoggedDays();
  useAppStore.setState({ hydrated: true });
}
