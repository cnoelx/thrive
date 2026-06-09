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

// Placement uses one signature exercise per category, and each option IS that level's goal — so "the
// most you can do" maps directly to the level you've earned. It's still an estimate: the rest of the
// category's moves fill in (and can be refined) through normal training + claims.
export interface PlacementAnchor {
  categoryId: CategoryId;
  exercise: string;
  unit?: string;
  thresholds: { level: number; label: string }[]; // L1..L3, ascending
}

export const PLACEMENT_ANCHORS: PlacementAnchor[] = [
  { categoryId: 'move', exercise: 'Bodyweight squats', unit: 'in a row', thresholds: [{ level: 1, label: '15' }, { level: 2, label: '22' }, { level: 3, label: '30' }, { level: 4, label: '40' }, { level: 5, label: '50' }] },
  { categoryId: 'push', exercise: 'Push-ups', unit: 'hardest you can do', thresholds: [{ level: 1, label: 'Wall ×8' }, { level: 2, label: 'Counter ×8' }, { level: 3, label: 'Low step ×8' }, { level: 4, label: 'Lower slowly ×5' }, { level: 5, label: '8 full' }] },
  { categoryId: 'pull', exercise: 'Pulling', unit: 'most you can do', thresholds: [{ level: 1, label: 'Active hang 15s' }, { level: 2, label: 'Lower slowly 5s ×3' }, { level: 3, label: 'Lower slowly 10s ×3' }, { level: 4, label: '5 with a band' }, { level: 5, label: '3+ pull-ups' }] },
  { categoryId: 'cardio', exercise: 'Walk / run nonstop', thresholds: [{ level: 1, label: 'Brisk walk 10min' }, { level: 2, label: 'Brisk walk 20min' }, { level: 3, label: 'Brisk walk 30min' }, { level: 4, label: 'Walk-jog 20min' }, { level: 5, label: 'Easy jog 20min+' }] },
  { categoryId: 'mobility', exercise: 'Deep squat hold', thresholds: [{ level: 1, label: 'Support 15s' }, { level: 2, label: 'Support 30s' }, { level: 3, label: 'Free 60s' }, { level: 4, label: 'Free 90s' }, { level: 5, label: 'Free 120s' }] },
];
