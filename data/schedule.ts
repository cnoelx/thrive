// The fixed weekly schedule (from the program's "Weekly Schedule" sheet). Same exercises every
// week; progression comes from rising reps (read from the user's level), not swapping exercises.
// Sets and rest are fixed; "reps/time" is filled in from the current level by the daily card.

export type DayKey = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';

export interface ScheduleItem {
  exKey: string;
  sets: number | null; // overrides the exercise's default sets for this day; null = single session / check
  note?: string;
}

export interface DaySchedule {
  focus: string;
  rest?: boolean;
  items: ScheduleItem[];
}

// Index by JS Date.getDay() (0 = Sunday).
export const DAY_KEYS: DayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export const WEEKLY_SCHEDULE: Record<DayKey, DaySchedule> = {
  mon: {
    focus: 'Strength A',
    items: [
      { exKey: 'squat', sets: 3 },
      { exKey: 'pushups', sets: 3 },
      { exKey: 'barrow', sets: 3 },
      { exKey: 'plank', sets: 3 },
    ],
  },
  tue: {
    focus: 'Cardio + mobility checks',
    items: [
      { exKey: 'walkrun', sets: null, note: '20–30 min, conversational pace' },
      { exKey: 'deepsquat', sets: 2, note: 'check' },
      { exKey: 'ankle', sets: 1, note: 'knee-to-wall, both sides' },
      { exKey: 'overhead', sets: 1, note: 'wall test' },
    ],
  },
  wed: {
    focus: 'Strength B',
    items: [
      { exKey: 'lunge', sets: 3 },
      { exKey: 'glutebridge', sets: 3 },
      { exKey: 'pronelegraise', sets: 2 },
      { exKey: 'sideplank', sets: 3 },
    ],
  },
  thu: {
    focus: 'Strength C',
    items: [
      { exKey: 'deadhang', sets: 3 },
      { exKey: 'pullup', sets: 3 },
      { exKey: 'pushups', sets: 2, note: 'lighter' },
      { exKey: 'balance', sets: 2 },
    ],
  },
  fri: {
    focus: 'Strength D',
    items: [
      { exKey: 'squat', sets: 3 },
      { exKey: 'barrow', sets: 3 },
      { exKey: 'glutebridge', sets: 3 },
      { exKey: 'plank', sets: 3 },
    ],
  },
  sat: {
    focus: 'Cardio',
    items: [{ exKey: 'walkrun', sets: null, note: '20 min — walk or walk-jog intervals' }],
  },
  sun: { focus: 'Rest', rest: true, items: [] },
};
