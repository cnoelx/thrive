// Moon phase, position and rise/set — pure math, no API, no dependency. Ported from SunCalc (MIT,
// github.com/mourner/suncalc), which derives illumination from the real sun–moon geometry (accurate to
// ~1–2%) rather than a steady "days since new moon" average. `illum` is the lit fraction (0 new … 1
// full); `waxing` puts the lit limb on the right (northern hemisphere).

const RAD = Math.PI / 180;
const OBLIQUITY = RAD * 23.4397;
const J2000 = 2451545;
const SUN_DIST = 149598000; // mean Earth–Sun distance, km

const toDays = (date: Date) => date.valueOf() / 86400000 - 0.5 + 2440588 - J2000;
const rightAscension = (l: number, b: number) => Math.atan2(Math.sin(l) * Math.cos(OBLIQUITY) - Math.tan(b) * Math.sin(OBLIQUITY), Math.cos(l));
const declination = (l: number, b: number) => Math.asin(Math.sin(b) * Math.cos(OBLIQUITY) + Math.cos(b) * Math.sin(OBLIQUITY) * Math.sin(l));
const siderealTime = (d: number, lw: number) => RAD * (280.16 + 360.9856235 * d) - lw;

function sunCoords(d: number) {
  const M = RAD * (357.5291 + 0.98560028 * d); // solar mean anomaly
  const C = RAD * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M)); // equation of center
  const L = M + C + RAD * 102.9372 + Math.PI; // ecliptic longitude
  return { ra: rightAscension(L, 0), dec: declination(L, 0) };
}

function moonCoords(d: number) {
  const L = RAD * (218.316 + 13.176396 * d); // ecliptic longitude
  const M = RAD * (134.963 + 13.064993 * d); // mean anomaly
  const F = RAD * (93.272 + 13.22935 * d); // argument of latitude
  const l = L + RAD * 6.289 * Math.sin(M); // geocentric longitude
  const b = RAD * 5.128 * Math.sin(F); // geocentric latitude
  const dist = 385001 - 20905 * Math.cos(M); // distance to the moon, km
  return { ra: rightAscension(l, b), dec: declination(l, b), dist };
}

export interface MoonPhase {
  /** 0 = new, 0.5 = full, → 1 back to new. */
  phase: number;
  /** Illuminated fraction, 0 (new) … 1 (full). */
  illum: number;
  /** True while waxing (new → full). */
  waxing: boolean;
}

/** Illuminated fraction + phase, from the actual sun–moon elongation (SunCalc method). */
export function moonPhase(date: Date): MoonPhase {
  const d = toDays(date);
  const s = sunCoords(d);
  const m = moonCoords(d);
  const phi = Math.acos(Math.sin(s.dec) * Math.sin(m.dec) + Math.cos(s.dec) * Math.cos(m.dec) * Math.cos(s.ra - m.ra)); // elongation
  const inc = Math.atan2(SUN_DIST * Math.sin(phi), m.dist - SUN_DIST * Math.cos(phi)); // phase angle
  const angle = Math.atan2(Math.cos(s.dec) * Math.sin(s.ra - m.ra), Math.sin(s.dec) * Math.cos(m.dec) - Math.cos(s.dec) * Math.sin(m.dec) * Math.cos(s.ra - m.ra));
  const phase = 0.5 + (0.5 * inc * (angle < 0 ? -1 : 1)) / Math.PI;
  return { phase, illum: (1 + Math.cos(inc)) / 2, waxing: phase < 0.5 };
}

/** Human-readable phase name, e.g. "Waxing gibbous". */
export function phaseName(illum: number, waxing: boolean): string {
  if (illum < 0.04) return 'New moon';
  if (illum > 0.96) return 'Full moon';
  if (illum > 0.46 && illum < 0.54) return waxing ? 'First quarter' : 'Last quarter';
  return `${waxing ? 'Waxing' : 'Waning'} ${illum < 0.5 ? 'crescent' : 'gibbous'}`;
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

const hoursLater = (date: Date, h: number) => new Date(date.valueOf() + h * 3600000);

export interface MoonTimes {
  /** Minutes since local midnight, or null when the moon doesn't rise / set on this local day. */
  rise: number | null;
  set: number | null;
}

/** When the moon rises and sets on the local day of `date` (SunCalc's horizon-crossing scan: a
 *  quadratic root-find over 2-hour chunks of altitude). The moon shifts ~50 min/day, so some days
 *  legitimately have no rise or no set — null then. Returns minutes since local midnight. */
export function moonTimes(date: Date, lat: number, lng: number): MoonTimes {
  const t = new Date(date);
  t.setHours(0, 0, 0, 0); // local midnight
  const hc = 0.133; // degrees — the moon's mean apparent radius
  let h0 = moonPosition(t, lat, lng).altitude - hc;
  let rise: number | undefined;
  let set: number | undefined;

  for (let i = 1; i <= 24; i += 2) {
    const h1 = moonPosition(hoursLater(t, i), lat, lng).altitude - hc;
    const h2 = moonPosition(hoursLater(t, i + 1), lat, lng).altitude - hc;
    const a = (h0 + h2) / 2 - h1;
    const b = (h2 - h0) / 2;
    const xe = -b / (2 * a);
    const ye = (a * xe + b) * xe + h1;
    const dsc = b * b - 4 * a * h1;
    let roots = 0;
    let x1 = 0;
    let x2 = 0;
    if (dsc >= 0) {
      const dx = Math.sqrt(dsc) / (Math.abs(a) * 2);
      x1 = xe - dx;
      x2 = xe + dx;
      if (Math.abs(x1) <= 1) roots++;
      if (Math.abs(x2) <= 1) roots++;
      if (x1 < -1) x1 = x2;
    }
    if (roots === 1) {
      if (h0 < 0) rise = i + x1;
      else set = i + x1;
    } else if (roots === 2) {
      rise = i + (ye < 0 ? x2 : x1);
      set = i + (ye < 0 ? x1 : x2);
    }
    if (rise !== undefined && set !== undefined) break;
    h0 = h2;
  }

  const toMin = (h: number | undefined): number | null => {
    if (h === undefined) return null;
    const dt = hoursLater(t, h);
    return dt.getHours() * 60 + dt.getMinutes();
  };
  return { rise: toMin(rise), set: toMin(set) };
}
