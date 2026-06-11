// Functional-fitness program, transcribed from Functional_Fitness_Program_rebuilt_1.xlsx.
// Five categories; each exercise has UP TO 10 levels. Levels are tracked PER CATEGORY (a category
// completes a level when every exercise that HAS a target at that level is claimed). Exercises can
// cap below 10 (e.g. mobility caps at L5); a capped move stays in workouts as maintenance but no
// longer gates its category. Claims are self-reported within the runway-of-one cap.

export type CategoryId = 'move' | 'push' | 'pull' | 'cardio' | 'mobility';
export type CategoryKind = 'trained' | 'checkpoint';

export const MAX_LEVEL = 10;

export interface Category {
  id: CategoryId;
  name: string;
  short: string;
  kind: CategoryKind;
}

export const CATEGORIES: Category[] = [
  { id: 'move', name: 'Move Your Bodyweight', short: 'Move', kind: 'trained' },
  { id: 'push', name: 'Push', short: 'Push', kind: 'trained' },
  { id: 'pull', name: 'Pull', short: 'Pull', kind: 'trained' },
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
  check?: boolean; // a one-time form/position check, not reps (Sit-to-Stand, Overhead, Ankle)
  targets: string[]; // L1..; array length = this exercise's ceiling (< 10 if it caps early)
}

const EXERCISES: Exercise[] = [
  { key: "squat", categoryId: "move", name: "Bodyweight Squat", why: "Stand, sit, lower all day", sets: 3, targets: ["15", "22", "30", "40", "50", "tempo (4s lower) ×8", "paused (3s bottom) ×8", "split squat ×8/leg", "Bulgarian split ×6/leg", "pistol progression ×3/leg"] },
  { key: "lunge", categoryId: "move", name: "Reverse Lunge", why: "Stairs, single-leg strength (per leg)", sets: 3, targets: ["10 (5/leg)", "16 (8/leg)", "24 (12/leg)", "32 (16/leg)", "40 (20/leg)", "walking ×12/leg", "deficit ×8/leg", "Bulgarian split ×8/leg", "jumping lunge ×6/leg", "pistol progression ×3/leg"] },
  { key: "sittostand", categoryId: "move", name: "Sit-to-Stand from Floor", why: "Get off the ground unaided", sets: null, check: true, targets: ["Hands OK", "Fewer hands", "One hand", "One fingertip", "No hands"] },
  { key: "balance", categoryId: "move", name: "Single-leg Balance", why: "Don't fall", sets: 2, targets: ["10s/leg", "20s/leg", "30s/leg", "45s/leg", "60s/leg", "eyes-closed 20s", "eyes-closed 40s", "unstable surface 30s"] },
  { key: "plank", categoryId: "move", name: "Plank", why: "Stable trunk, protects back", sets: 3, targets: ["20s", "35s", "50s", "70s", "90s", "120s", "RKC tension 30s", "single-arm 20s", "single-arm+leg 15s"] },
  { key: "sideplank", categoryId: "move", name: "Side Plank", why: "Side core — resists twisting", sets: 3, targets: ["knee 10s/side", "knee 20s/side", "full 30s/side", "full 45s/side", "full 60s/side", "full 75s/side", "star side plank 20s", "+reach-through ×10", "single-leg side plank 20s"] },
  { key: "glutebridge", categoryId: "move", name: "Glute Bridge", why: "Glutes & hamstrings (backside)", sets: 3, targets: ["10", "16", "24", "34", "single-leg 12/leg", "single-leg ×12/leg", "feet-elevated SL ×10/leg", "marching hold 30s", "hip thrust (load) ×12", "single-leg hip thrust ×8/leg"] },
  { key: "pronelegraise", categoryId: "move", name: "Prone Leg Raise", why: "Glutes & hamstrings", sets: 2, targets: ["6/leg", "10/leg", "15/leg", "20/leg", "20/leg + 2s hold", "both legs + hold ×12", "swimmer flutter 30s", "+light ankle load ×12", "superman rock 30s"] },
  { key: "pushups", categoryId: "push", name: "Push-ups", why: "Push, catch a fall", sets: 3, targets: ["wall ×8", "incline ×8 (hands on a counter)", "incline ×8 (hands on a low step)", "negatives ×5 (lower down slowly)", "5 full push-ups", "8 full push-ups", "feet-elevated ×8", "diamond ×8", "archer ×5/side", "one-arm progression ×3/side"] },
  { key: "barrow", categoryId: "pull", name: "Inverted Row", why: "Horizontal pull (rings/TRX, or bar set low). Angle = difficulty.", sets: 3, targets: ["upright, 5 reps", "upright, 8 reps", "leaned back, 10 reps", "leaned back, 12 reps", "near-horizontal, 12 reps", "feet-elevated ×10", "tuck front-lever hold 8s", "wide front-lever tuck 10s", "one-arm row progression ×5/side", "advanced lever hold 12s"] },
  { key: "pullup", categoryId: "pull", name: "Pulling", why: "Pull your bodyweight up — hang, then pull (needs bar or rings)", sets: 3, targets: ["active hang 15s → 5 shoulder-blade pulls", "negatives ×3 (jump to the top, lower for 5s)", "negatives ×3 (lower for 10s)", "5 with a band", "3 pull-ups", "6 pull-ups", "10 pull-ups", "chest-to-bar ×5", "archer ×3/side", "one-arm progression / weighted"] },
  { key: "walkrun", categoryId: "cardio", name: "Walk / Run (walk-first)", why: "Cover distance without gassing out", sets: null, targets: ["brisk walk 10min", "brisk walk 20min", "brisk walk 30min", "walk-jog 20min", "easy jog 20min+", "jog 30min", "jog 5km", "intervals (speed)", "5km steady pace", "10km / sustained"] },
  { key: "deepsquat", categoryId: "mobility", name: "Deep Squat Hold", why: "Rest, garden, floor play", sets: null, targets: ["support 15s", "support 30s", "free 60s", "free 90s", "free 120s"] },
  { key: "overhead", categoryId: "mobility", name: "Overhead Reach", why: "Shelves, posture (wall test)", sets: null, check: true, targets: ["ribs stick out a lot", "ribs stick out a little", "ribs stay down", "ribs down + slight backbend", "full, pain-free"] },
  { key: "ankle", categoryId: "mobility", name: "Ankle Mobility", why: "Squat deep, descend safely (knee-to-wall)", sets: null, check: true, targets: ["heel lifts", "slight lift", "knee over toes", "knee well past", "no heel lift"] },
];

export const EXERCISE_BY_KEY = Object.fromEntries(EXERCISES.map((e) => [e.key, e])) as Record<string, Exercise>;

export function exercisesFor(categoryId: CategoryId): Exercise[] {
  return EXERCISES.filter((e) => e.categoryId === categoryId);
}

/** A given exercise's target at a level (1..). Falls back to the exercise's TOP target when the level
 *  exceeds its ceiling, so capped moves stay in workouts as maintenance. */
export function exerciseTarget(exKey: string, level: number): string {
  const ex = EXERCISE_BY_KEY[exKey];
  return ex ? (ex.targets[level - 1] ?? ex.targets[ex.targets.length - 1]!) : '';
}

/** Display helper: append "reps" to a bare numeric target ("15" -> "15 reps"). Targets that already
 *  carry a unit or description ("20s", "wall", "15 strict") are returned unchanged. */
export function formatTarget(target: string): string {
  return /^\d+$/.test(target.trim()) ? `${target} reps` : target;
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

/** All benchmarks for a category at a given level (one per exercise that reaches that level). */
export function benchmarksFor(categoryId: CategoryId, level: number): Benchmark[] {
  return BENCHMARKS.filter((b) => b.categoryId === categoryId && b.level === level);
}

/** The highest level a category can reach = the deepest exercise ceiling within it (Mobility = 5). */
export function categoryCeiling(categoryId: CategoryId): number {
  return Math.max(...exercisesFor(categoryId).map((e) => e.targets.length));
}
