// Rough calorie estimate — the standard MET formula (kcal = MET × kg × hours) with one moderate
// calisthenics MET for every session. A ballpark, not a measurement: no heart rate, no per-exercise
// intensity. Always display it with a "~", and only when the user has given a weight.

const WORKOUT_MET = 5; // moderate-effort calisthenics

export function estimateCalories(weightKg: number, durationMin: number): number {
  return Math.round(WORKOUT_MET * weightKg * (durationMin / 60));
}
