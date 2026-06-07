// Global app state, persisted on-device via AsyncStorage. The progression *rules* live in the
// pure engine; this store just holds state and applies the engine's transforms. Claims are
// self-reported at any time, so there's no training-credit to track — logging is just "did today's
// workout".

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { BENCHMARK_BY_ID } from '@/data/benchmarks';
import { Equipment, GoalId } from '@/data/onboarding';
import { ProgressState, applyClaim, emptyProgress } from '@/engine/progression';

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
  /** Highest overall level the user has acknowledged (dismissed the celebration for). The next
   *  level-up celebration fires when their current overall exceeds this. */
  overallLevelSeen: number;
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
  markOverallLevelSeen: (level: number) => void;
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
      overallLevelSeen: 0,
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
          overallLevelSeen: 0,
          nudgeDismissedDay: null,
        }),

      logToday: (dayNumber) => set((s) => (s.lastLoggedDay === dayNumber ? s : { lastLoggedDay: dayNumber })),

      claimBenchmark: (benchmarkId) =>
        set((s) => {
          const b = BENCHMARK_BY_ID[benchmarkId];
          if (!b) return s;
          return { progress: applyClaim(s.progress, s.pullUnlocked, b) };
        }),

      markOverallLevelSeen: (level) => set({ overallLevelSeen: level }),

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
          overallLevelSeen: 0,
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
        overallLevelSeen: s.overallLevelSeen,
        nudgeDismissedDay: s.nudgeDismissedDay,
        reminderEnabled: s.reminderEnabled,
        reminderHour: s.reminderHour,
        reminderMinute: s.reminderMinute,
        pullUnlocked: s.pullUnlocked,
      }),
    },
  ),
);

useAppStore.persist.onFinishHydration(() => useAppStore.setState({ hydrated: true }));
if (useAppStore.persist.hasHydrated()) useAppStore.setState({ hydrated: true });
