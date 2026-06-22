// Moon phase from the date — pure math, no API. Position in the ~29.53-day synodic cycle since a
// known new moon. `illum` is the lit fraction (0 new … 1 full); `waxing` puts the lit limb on the
// right (northern hemisphere). Accurate to ~a day, which is plenty for drawing "tonight's moon".

const SYNODIC = 29.530588853;
const KNOWN_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14); // 2000-01-06 18:14 UTC — a reference new moon

export interface MoonPhase {
  /** 0 = new, 0.5 = full, → 1 back to new. */
  phase: number;
  /** Illuminated fraction, 0 (new) … 1 (full). */
  illum: number;
  /** True while waxing (new → full). */
  waxing: boolean;
}

export function moonPhase(date: Date): MoonPhase {
  const days = (date.getTime() - KNOWN_NEW_MOON) / 86400000;
  const phase = (((days % SYNODIC) / SYNODIC) + 1) % 1; // 0..1
  const illum = (1 - Math.cos(2 * Math.PI * phase)) / 2;
  return { phase, illum, waxing: phase < 0.5 };
}

/** Human-readable phase name, e.g. "Waxing gibbous". */
export function phaseName(illum: number, waxing: boolean): string {
  if (illum < 0.04) return 'New moon';
  if (illum > 0.96) return 'Full moon';
  if (illum > 0.46 && illum < 0.54) return waxing ? 'First quarter' : 'Last quarter';
  return `${waxing ? 'Waxing' : 'Waning'} ${illum < 0.5 ? 'crescent' : 'gibbous'}`;
}

// --- Moon position (low-precision; ported from the SunCalc/Astronomy-Answers algorithm, MIT) ------
// Used only to decide whether the moon is actually above the horizon (and roughly where) at night.

const RAD = Math.PI / 180;
const OBLIQUITY = RAD * 23.4397;
const J2000 = 2451545;
const toDays = (date: Date) => date.valueOf() / 86400000 - 0.5 + 2440588 - J2000;
const rightAscension = (l: number, b: number) => Math.atan2(Math.sin(l) * Math.cos(OBLIQUITY) - Math.tan(b) * Math.sin(OBLIQUITY), Math.cos(l));
const declination = (l: number, b: number) => Math.asin(Math.sin(b) * Math.cos(OBLIQUITY) + Math.cos(b) * Math.sin(OBLIQUITY) * Math.sin(l));
const siderealTime = (d: number, lw: number) => RAD * (280.16 + 360.9856235 * d) - lw;

function moonCoords(d: number) {
  const L = RAD * (218.316 + 13.176396 * d);
  const M = RAD * (134.963 + 13.064993 * d);
  const F = RAD * (93.272 + 13.2293 * d);
  const l = L + RAD * 6.289 * Math.sin(M);
  const b = RAD * 5.128 * Math.sin(F);
  return { ra: rightAscension(l, b), dec: declination(l, b) };
}

export interface MoonPosition {
  /** Altitude above the horizon, degrees (> 0 = up). */
  altitude: number;
  /** Azimuth from due south, degrees (− east … + west). */
  azimuth: number;
}

export function moonPosition(date: Date, lat: number, lng: number): MoonPosition {
  const lw = RAD * -lng;
  const phi = RAD * lat;
  const d = toDays(date);
  const c = moonCoords(d);
  const H = siderealTime(d, lw) - c.ra;
  let h = Math.asin(Math.sin(phi) * Math.sin(c.dec) + Math.cos(phi) * Math.cos(c.dec) * Math.cos(H));
  h += (RAD * 0.017) / Math.tan(h + (RAD * 10.26) / (h + RAD * 5.1)); // atmospheric refraction
  const az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(c.dec) * Math.cos(phi));
  return { altitude: h / RAD, azimuth: az / RAD };
}
