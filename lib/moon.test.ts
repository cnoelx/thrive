import { describe, expect, it } from '@jest/globals';

import { moonPhase, moonPosition, moonTimes, phaseName } from '@/lib/moon';

const SYNODIC = 29.530588853;
const REF_NEW = Date.UTC(2000, 0, 6, 18, 14); // a real new moon — the cycle reference
const at = (offsetDays: number) => new Date(REF_NEW + offsetDays * 86400000);

describe('moonPhase', () => {
  it('new moon at the reference is dark', () => {
    expect(moonPhase(at(0)).illum).toBeLessThan(0.02);
  });

  it('a day after new is a thin waxing sliver', () => {
    const m = moonPhase(at(1));
    expect(m.waxing).toBe(true);
    expect(m.illum).toBeLessThan(0.1);
  });

  it('first quarter ~7.4 days later is roughly half-lit and waxing', () => {
    const m = moonPhase(at(SYNODIC / 4));
    expect(m.illum).toBeGreaterThan(0.4);
    expect(m.illum).toBeLessThan(0.6);
    expect(m.waxing).toBe(true);
  });

  it('full moon half a cycle later is fully lit', () => {
    const m = moonPhase(at(SYNODIC / 2));
    expect(m.illum).toBeGreaterThan(0.97);
    expect(m.phase).toBeCloseTo(0.5, 1);
  });

  it('last quarter ~22 days later is roughly half-lit and waning', () => {
    const m = moonPhase(at((3 * SYNODIC) / 4));
    expect(m.illum).toBeGreaterThan(0.4);
    expect(m.illum).toBeLessThan(0.6);
    expect(m.waxing).toBe(false);
  });

  it('matches reality: 23 Jun 2026 is a waxing ~first-quarter moon', () => {
    const m = moonPhase(new Date(Date.UTC(2026, 5, 23, 6, 0))); // ~11:30am IST
    expect(m.waxing).toBe(true);
    expect(m.illum).toBeGreaterThan(0.45);
    expect(m.illum).toBeLessThan(0.75);
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
    expect(Math.max(...alts)).toBeGreaterThan(0);
    expect(Math.min(...alts)).toBeLessThan(0);
  });
});

describe('moonTimes', () => {
  const NAGERCOIL = { lat: 8.18, lng: 77.41 };

  it('finds a horizon crossing, and the moon really sits on the horizon there', () => {
    const mt = moonTimes(new Date(2025, 5, 21, 12), NAGERCOIL.lat, NAGERCOIL.lng);
    const t = mt.rise ?? mt.set;
    expect(t).not.toBeNull();
    expect(t!).toBeGreaterThanOrEqual(0);
    expect(t!).toBeLessThan(1440);
    const cross = new Date(2025, 5, 21, Math.floor(t! / 60), t! % 60);
    expect(Math.abs(moonPosition(cross, NAGERCOIL.lat, NAGERCOIL.lng).altitude)).toBeLessThan(1.5);
  });
});
