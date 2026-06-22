import { describe, expect, it } from '@jest/globals';

import { moonPhase } from '@/lib/moon';

const SYNODIC = 29.530588853;
const REF_NEW = Date.UTC(2000, 0, 6, 18, 14);
const at = (offsetDays: number) => new Date(REF_NEW + offsetDays * 86400000);

describe('moonPhase', () => {
  it('new moon at the reference: dark and (just) waxing', () => {
    const m = moonPhase(at(0));
    expect(m.illum).toBeLessThan(0.02);
    expect(m.waxing).toBe(true);
  });

  it('full moon half a cycle later: fully lit', () => {
    const m = moonPhase(at(SYNODIC / 2));
    expect(m.illum).toBeGreaterThan(0.98);
    expect(m.phase).toBeCloseTo(0.5, 2);
  });

  it('first quarter is half-lit and waxing; last quarter half-lit and waning', () => {
    const first = moonPhase(at(SYNODIC / 4));
    expect(first.illum).toBeCloseTo(0.5, 1);
    expect(first.waxing).toBe(true);
    const last = moonPhase(at((3 * SYNODIC) / 4));
    expect(last.illum).toBeCloseTo(0.5, 1);
    expect(last.waxing).toBe(false);
  });

  it('illum is symmetric around full (waxing vs waning gibbous match)', () => {
    expect(moonPhase(at(SYNODIC * 0.4)).illum).toBeCloseTo(moonPhase(at(SYNODIC * 0.6)).illum, 5);
  });
});
