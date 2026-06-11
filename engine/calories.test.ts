import { describe, expect, it } from '@jest/globals';

import { estimateCalories } from '@/engine/calories';

describe('estimateCalories', () => {
  it('applies the MET formula (kcal = MET × kg × hours) and rounds', () => {
    expect(estimateCalories(70, 60)).toBe(350); // 5 × 70 × 1
    expect(estimateCalories(70, 20)).toBe(117); // 5 × 70 × ⅓ ≈ 116.7
  });
  it('is zero for a zero-length session', () => {
    expect(estimateCalories(70, 0)).toBe(0);
  });
});
