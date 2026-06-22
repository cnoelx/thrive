import { describe, expect, it } from '@jest/globals';

import { moonPhase, moonPosition, phaseName } from '@/lib/moon';

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

describe('phaseName', () => {
  it('names the phases from illumination + waxing', () => {
    expect(phaseName(0.01, true)).toBe('New moon');
    expect(phaseName(0.99, true)).toBe('Full moon');
    expect(phaseName(0.5, true)).toBe('First quarter');
    expect(phaseName(0.5, false)).toBe('Last quarter');
    expect(phaseName(0.3, true)).toBe('Waxing crescent');
    expect(phaseName(0.7, false)).toBe('Waning gibbous');
  });
});

describe('moonPosition', () => {
  const NAGERCOIL = { lat: 8.18, lng: 77.41 };

  it('returns a finite altitude within [-90, 90]', () => {
    const p = moonPosition(new Date(2025, 5, 21, 22, 0), NAGERCOIL.lat, NAGERCOIL.lng);
    expect(Number.isFinite(p.altitude)).toBe(true);
    expect(p.altitude).toBeGreaterThanOrEqual(-90);
    expect(p.altitude).toBeLessThanOrEqual(90);
  });

  it('the moon rises and sets over a day (altitude crosses the horizon)', () => {
    const alts = Array.from({ length: 24 }, (_, h) => moonPosition(new Date(2025, 5, 21, h), NAGERCOIL.lat, NAGERCOIL.lng).altitude);
    expect(Math.max(...alts)).toBeGreaterThan(0); // up at some point
    expect(Math.min(...alts)).toBeLessThan(0); // down at some point — so "is it up?" is meaningful
  });
});
