// Onboarding content & the domain option types it defines.

import type { CategoryId } from '@/data/benchmarks';

export type Equipment = 'table' | 'bar' | 'none';
export type GoalId = 'energy' | 'kids' | 'stiffness' | 'health';

export interface Option<T extends string> {
  id: T;
  label: string;
  hint?: string;
}

// Standard PAR-Q–style readiness questions (spec open item #6). Advisory, not a hard gate.
export const PARQ_QUESTIONS: string[] = [
  'Has a doctor ever said you have a heart condition and that you should only do physical activity recommended by a doctor?',
  'Do you feel pain in your chest when you do physical activity?',
  'In the past month, have you had chest pain when you were not doing physical activity?',
  'Do you ever lose your balance from dizziness, or do you ever lose consciousness?',
  'Do you have a bone or joint problem that could be made worse by a change in your physical activity?',
  'Is a doctor currently prescribing medication for your blood pressure or a heart condition?',
  'Are you pregnant, or is there any other reason you should not do physical activity?',
];

export const EQUIPMENT_OPTIONS: Option<Equipment>[] = [
  { id: 'bar', label: 'A pull-up bar', hint: 'A doorway bar or similar' },
  { id: 'table', label: 'A sturdy table', hint: 'For rows underneath it' },
  { id: 'none', label: 'Neither right now', hint: "We'll give you no-bar substitutes" },
];

export const GOAL_OPTIONS: Option<GoalId>[] = [
  { id: 'energy', label: 'More energy day to day' },
  { id: 'kids', label: 'Keep up with my kids' },
  { id: 'stiffness', label: 'Less stiffness and pain' },
  { id: 'health', label: 'General health and longevity' },
];

// Placement uses one signature exercise per category. The user picks the best they can do;
// the thresholds map to the same L1/L2/L3 numbers as the full benchmark set. It's an estimate —
// the rest of each level fills in (and can be refined) through normal training + claims.
export interface PlacementAnchor {
  categoryId: CategoryId;
  exercise: string;
  unit?: string;
  thresholds: { level: number; label: string }[]; // L1..L3, ascending
}

export const PLACEMENT_ANCHORS: PlacementAnchor[] = [
  { categoryId: 'move', exercise: 'Bodyweight squats', unit: 'in a row', thresholds: [{ level: 1, label: '8' }, { level: 2, label: '12' }, { level: 3, label: '18' }, { level: 4, label: '25' }, { level: 5, label: '35' }] },
  { categoryId: 'push', exercise: 'Push-ups', unit: 'incline OK at L1', thresholds: [{ level: 1, label: '3' }, { level: 2, label: '5' }, { level: 3, label: '8' }, { level: 4, label: '12' }, { level: 5, label: '20' }] },
  { categoryId: 'pull', exercise: 'Pulling', unit: 'best you can do', thresholds: [{ level: 1, label: 'Hang + scap pulls' }, { level: 2, label: 'Slow negatives' }, { level: 3, label: 'Long negatives' }, { level: 4, label: 'Band-assisted' }, { level: 5, label: '3+ pull-ups' }] },
  { categoryId: 'cardio', exercise: 'Walk / run nonstop', thresholds: [{ level: 1, label: '1 km' }, { level: 2, label: '1.5 km' }, { level: 3, label: '2.5 km' }, { level: 4, label: '4 km' }, { level: 5, label: '5 km' }] },
  { categoryId: 'mobility', exercise: 'Deep squat hold', thresholds: [{ level: 1, label: '15s' }, { level: 2, label: '30s' }, { level: 3, label: '60s' }, { level: 4, label: '90s' }, { level: 5, label: '120s' }] },
];
