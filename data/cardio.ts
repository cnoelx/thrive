// Freestyle cardio activities for the Workouts library — deliberately OUTSIDE the program's EXERCISES
// list (everything there generates level benchmarks and gates the Cardio category; these are just
// things you do). Each launches the workout player as a one-step timed session and logs as a
// freestyle cardio session. MET values are per-activity so the calorie ballpark is honest
// (Compendium of Physical Activities, easy/steady effort).

import { MaterialCommunityIcons } from '@expo/vector-icons';

export interface CardioActivity {
  key: string;
  name: string;
  /** The player's big line — an effort cue, not a prescription. */
  target: string;
  met: number;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}

export const CARDIO_ACTIVITIES: CardioActivity[] = [
  { key: 'run', name: 'Run', target: 'easy pace', met: 9.8, icon: 'run' },
  { key: 'cycle', name: 'Cycle', target: 'steady spin', met: 7.5, icon: 'bike' },
  { key: 'elliptical', name: 'Elliptical', target: 'steady effort', met: 5.5, icon: 'ski-cross-country' },
  { key: 'swim', name: 'Swim', target: 'easy laps', met: 7, icon: 'swim' },
];

export const CARDIO_BY_KEY = Object.fromEntries(CARDIO_ACTIVITIES.map((a) => [a.key, a])) as Record<string, CardioActivity>;

/** How long an unfinished cardio session stays resumable — beyond this it's clearly abandoned. */
export const CARDIO_STALE_MS = 6 * 60 * 60 * 1000;
