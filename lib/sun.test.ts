import { describe, expect, it } from '@jest/globals';

import { sunTimes } from '@/lib/sun';

// Property-based: validate the algorithm by physical invariants that must hold for any correct
// implementation, rather than brittle exact-minute references. Coordinates are real Indian cities.
const DELHI = { lat: 28.61, lng: 77.21 };
const TRIVANDRUM = { lat: 8.52, lng: 76.94 }; // near the equator → little seasonal swing
const JUN = new Date(2025, 5, 21); // ~summer solstice (N hemisphere: longest day)
const DEC = new Date(2025, 11, 21); // ~winter solstice (shortest day)

const dayLengthMin = (lat: number, lng: number, d: Date) => {
  const t = sunTimes(lat, lng, d)!;
  return t.sunset - t.sunrise;
};

describe('sunTimes', () => {
  it('returns times within a single day, sunset after sunrise', () => {
    const t = sunTimes(DELHI.lat, DELHI.lng, JUN)!;
    expect(t.sunrise).toBeGreaterThanOrEqual(0);
    expect(t.sunset).toBeLessThan(1440);
    expect(t.sunset).toBeGreaterThan(t.sunrise);
  });

  it('Delhi sunrise in June lands in the expected early-morning window', () => {
    const t = sunTimes(DELHI.lat, DELHI.lng, JUN)!;
    expect(t.sunrise).toBeGreaterThan(5 * 60); // after 5:00 am
    expect(t.sunrise).toBeLessThan(5 * 60 + 45); // before 5:45 am
  });

  it('days are longer in summer than winter (northern hemisphere)', () => {
    expect(dayLengthMin(DELHI.lat, DELHI.lng, JUN)).toBeGreaterThan(dayLengthMin(DELHI.lat, DELHI.lng, DEC));
  });

  it('seasonal swing is larger at higher latitude (Delhi) than near the equator (Trivandrum)', () => {
    const delhiSwing = dayLengthMin(DELHI.lat, DELHI.lng, JUN) - dayLengthMin(DELHI.lat, DELHI.lng, DEC);
    const trivSwing = dayLengthMin(TRIVANDRUM.lat, TRIVANDRUM.lng, JUN) - dayLengthMin(TRIVANDRUM.lat, TRIVANDRUM.lng, DEC);
    expect(delhiSwing).toBeGreaterThan(trivSwing);
  });

  it('eastern India sees an earlier sunrise than western India on the same day', () => {
    const kolkata = sunTimes(22.57, 88.36, JUN)!; // east
    const mumbai = sunTimes(19.08, 72.88, JUN)!; // west
    expect(kolkata.sunrise).toBeLessThan(mumbai.sunrise);
  });
});
