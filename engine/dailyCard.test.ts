import { describe, expect, it } from '@jest/globals';

import { EXERCISE_BY_KEY } from '@/data/benchmarks';
import { todaysWorkout } from '@/engine/dailyCard';
import { emptyProgress } from '@/engine/progression';

// Jan 5 2025 is a Sunday; offset to reach a given weekday (0 = Sun … 6 = Sat).
function dateForDay(dow: number): Date {
  const d = new Date(2025, 0, 5);
  d.setDate(d.getDate() + dow);
  return d;
}

describe('weekly schedule', () => {
  it('Sunday is a rest day with no items', () => {
    const w = todaysWorkout(emptyProgress(), dateForDay(0));
    expect(w.rest).toBe(true);
    expect(w.items.length).toBe(0);
  });

  it('Monday is Strength A with four items', () => {
    const w = todaysWorkout(emptyProgress(), dateForDay(1));
    expect(w.focus).toBe('Strength A');
    expect(w.items.length).toBe(4);
  });

  it('reps read from the current level (L1 at the start)', () => {
    const w = todaysWorkout(emptyProgress(), dateForDay(1));
    const squat = w.items.find((i) => i.exKey === 'squat')!;
    expect(squat.level).toBe(1);
    expect(squat.target).toBe(EXERCISE_BY_KEY['squat']!.targets[0]);
  });

  it('Tuesday includes the mobility checks', () => {
    const w = todaysWorkout(emptyProgress(), dateForDay(2));
    expect(w.items.some((i) => i.categoryId === 'mobility')).toBe(true);
  });
});
