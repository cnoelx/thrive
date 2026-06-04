// Functional-fitness program, transcribed from Functional_Fitness_Program_FINAL_1.xlsx.
// Four categories; each exercise has 5 levels. Levels are tracked PER CATEGORY (a category
// completes a level when all its exercises are claimed at that level). Claims are self-reported
// at any time (no training-gate) within the runway-of-one cap. The weekly schedule (data/schedule.ts)
// decides what you actually do each day; "sets" are fixed, "reps" come from your current level.

export type CategoryId = 'move' | 'pushpull' | 'cardio' | 'mobility';
export type CategoryKind = 'trained' | 'checkpoint';

export const MAX_LEVEL = 5;

export interface Category {
  id: CategoryId;
  name: string;
  short: string;
  kind: CategoryKind;
}

export const CATEGORIES: Category[] = [
  { id: 'move', name: 'Move Your Bodyweight', short: 'Move', kind: 'trained' },
  { id: 'pushpull', name: 'Push & Pull', short: 'Push & Pull', kind: 'trained' },
  { id: 'cardio', name: 'Keep Going', short: 'Cardio', kind: 'trained' },
  { id: 'mobility', name: 'Mobility', short: 'Mobility', kind: 'checkpoint' },
];

export const CATEGORY_IDS: CategoryId[] = CATEGORIES.map((c) => c.id);
export const TRAINED_CATEGORY_IDS: CategoryId[] = CATEGORIES.filter((c) => c.kind === 'trained').map((c) => c.id);
export const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<CategoryId, Category>;

export function isCheckpoint(id: CategoryId): boolean {
  return CATEGORY_BY_ID[id].kind === 'checkpoint';
}

export interface Exercise {
  key: string;
  categoryId: CategoryId;
  name: string;
  why: string;
  sets: number | null; // fixed sets; null = not set-based (cardio / checkpoints / sit-to-stand)
  targets: [string, string, string, string, string]; // L1..L5
}

const EXERCISES: Exercise[] = [
  // Move Your Bodyweight
  { key: 'squat', categoryId: 'move', name: 'Bodyweight Squat', why: 'Stand, sit, lower all day', sets: 3, targets: ['15', '22', '30', '40', '50'] },
  { key: 'lunge', categoryId: 'move', name: 'Reverse Lunge', why: 'Stairs, single-leg strength (per leg)', sets: 3, targets: ['10 (5/leg)', '16 (8/leg)', '24 (12/leg)', '32 (16/leg)', '40 (20/leg)'] },
  { key: 'sittostand', categoryId: 'move', name: 'Sit-to-Stand from Floor', why: 'Get off the ground unaided', sets: null, targets: ['Hands OK', 'Fewer hands', 'One hand', 'One fingertip', 'No hands'] },
  { key: 'balance', categoryId: 'move', name: 'Single-leg Balance', why: "Don't fall", sets: 2, targets: ['10s/leg', '20s/leg', '30s/leg', '45s/leg', '60s/leg'] },
  { key: 'plank', categoryId: 'move', name: 'Plank', why: 'Stable trunk, protects back', sets: 3, targets: ['20s', '35s', '50s', '70s', '90s'] },
  { key: 'sideplank', categoryId: 'move', name: 'Side Plank', why: 'Lateral/anti-rotation core', sets: 3, targets: ['knee 10s/side', 'knee 20s/side', 'full 30s/side', 'full 45s/side', 'full 60s/side'] },
  { key: 'glutebridge', categoryId: 'move', name: 'Glute Bridge', why: 'Posterior chain (main)', sets: 3, targets: ['10', '16', '24', '34', 'single-leg 12/leg'] },
  { key: 'pronelegraise', categoryId: 'move', name: 'Prone Leg Raise', why: 'Posterior chain (glutes/hamstrings)', sets: 2, targets: ['6/leg', '10/leg', '15/leg', '20/leg', '20/leg + 2s hold'] },
  // Push & Pull
  { key: 'pushups', categoryId: 'pushpull', name: 'Push-ups', why: 'Push, catch a fall', sets: 3, targets: ['wall', 'high incline', 'low incline/knee', 'negative + few strict', '15 strict'] },
  { key: 'barrow', categoryId: 'pushpull', name: 'Bar Row', why: 'Horizontal pull (doorway bar)', sets: 3, targets: ['tall angle 5', '8', 'lower angle 10', '12', 'near-horizontal 12-15'] },
  { key: 'deadhang', categoryId: 'pushpull', name: 'Dead Hang', why: 'Grip strength', sets: 3, targets: ['active 8s', '15s', '25s', '35s', '45s'] },
  { key: 'pullup', categoryId: 'pushpull', name: 'Pull-up Progression', why: 'Pull bodyweight up', sets: 3, targets: ['hang + scap pulls', 'negative 5s', 'negative 10s', 'band-assisted 3-5', '3-5 strict'] },
  // Keep Going (cardio)
  { key: 'walkrun', categoryId: 'cardio', name: 'Walk / Run (walk-first)', why: 'Cover distance without gassing out', sets: null, targets: ['brisk walk 10min', 'brisk walk 20min', 'brisk walk 30min', 'walk-jog 20min', 'easy jog 20min+'] },
  // Mobility (checkpoints)
  { key: 'deepsquat', categoryId: 'mobility', name: 'Deep Squat Hold', why: 'Rest, garden, floor play', sets: null, targets: ['support 15s', 'support 30s', 'free 60s', 'free 90s', 'free 120s'] },
  { key: 'overhead', categoryId: 'mobility', name: 'Overhead Reach', why: 'Shelves, posture (wall test)', sets: null, targets: ['some rib flare', 'minimal flare', 'no flare', '+light backbend', 'full, pain-free'] },
  { key: 'ankle', categoryId: 'mobility', name: 'Ankle Mobility', why: 'Squat deep, descend safely (knee-to-wall)', sets: null, targets: ['heel lifts', 'slight lift', 'knee over toes', 'knee well past', 'no heel lift'] },
];

export const EXERCISE_BY_KEY = Object.fromEntries(EXERCISES.map((e) => [e.key, e])) as Record<string, Exercise>;

export function exercisesFor(categoryId: CategoryId): Exercise[] {
  return EXERCISES.filter((e) => e.categoryId === categoryId);
}

/** A given exercise's target string at a level (1..MAX_LEVEL). */
export function exerciseTarget(exKey: string, level: number): string {
  const ex = EXERCISE_BY_KEY[exKey];
  return ex ? (ex.targets[level - 1] ?? ex.targets[ex.targets.length - 1]!) : '';
}

export interface Benchmark {
  id: string;
  exKey: string;
  categoryId: CategoryId;
  level: number;
  exercise: string;
  why: string;
  target: string;
}

function build(): Benchmark[] {
  const out: Benchmark[] = [];
  for (const ex of EXERCISES) {
    ex.targets.forEach((target, li) => {
      out.push({ id: `${ex.key}-l${li + 1}`, exKey: ex.key, categoryId: ex.categoryId, level: li + 1, exercise: ex.name, why: ex.why, target });
    });
  }
  return out;
}

export const BENCHMARKS: Benchmark[] = build();
export const BENCHMARK_BY_ID: Record<string, Benchmark> = Object.fromEntries(BENCHMARKS.map((b) => [b.id, b]));

/** All benchmarks for a category at a given level (one per exercise). */
export function benchmarksFor(categoryId: CategoryId, level: number): Benchmark[] {
  return BENCHMARKS.filter((b) => b.categoryId === categoryId && b.level === level);
}
