// Sunrise / sunset, computed on-device from latitude/longitude + date. Pure math, no network, no
// API key — the classic US Naval Observatory "Sunrise/Sunset Algorithm". Accurate to ~1 minute,
// which is far finer than a daylight nudge needs.
//
// India-only: IST is a fixed UTC+5:30 with no daylight saving, so we convert the computed UT to
// local time by adding 5.5 hours — no DST handling required.

const IST_OFFSET_HOURS = 5.5;
const ZENITH = 90.833; // official sunrise/sunset (sun's upper limb on the horizon, incl. refraction)

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;
const sin = (d: number) => Math.sin(rad(d));
const cos = (d: number) => Math.cos(rad(d));
const tan = (d: number) => Math.tan(rad(d));
const asin = (x: number) => deg(Math.asin(x));
const acos = (x: number) => deg(Math.acos(x));
const atan = (x: number) => deg(Math.atan(x));
const mod = (x: number, m: number) => ((x % m) + m) % m;

function dayOfYear(date: Date): number {
  const start = Date.UTC(date.getFullYear(), 0, 0);
  const here = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor((here - start) / 86400000);
}

/** UT (decimal hours) of sunrise (rising=true) or sunset for a location/date, or null at the polar
 *  edge cases where the sun doesn't cross the horizon (never happens in India). */
function eventUT(lat: number, lng: number, date: Date, rising: boolean): number | null {
  const N = dayOfYear(date);
  const lngHour = lng / 15;
  const t = N + ((rising ? 6 : 18) - lngHour) / 24;

  const M = 0.9856 * t - 3.289;
  let L = mod(M + 1.916 * sin(M) + 0.02 * sin(2 * M) + 282.634, 360);

  let RA = mod(atan(0.91764 * tan(L)), 360);
  // Put RA in the same quadrant as L, then convert to hours.
  RA = RA + (Math.floor(L / 90) * 90 - Math.floor(RA / 90) * 90);
  RA = RA / 15;

  const sinDec = 0.39782 * sin(L);
  const cosDec = cos(asin(sinDec));

  const cosH = (cos(ZENITH) - sinDec * sin(lat)) / (cosDec * cos(lat));
  if (cosH > 1 || cosH < -1) return null; // sun never rises / never sets that day

  const H = (rising ? 360 - acos(cosH) : acos(cosH)) / 15;
  const T = H + RA - 0.06571 * t - 6.622;
  return mod(T - lngHour, 24);
}

/** Minutes since local (IST) midnight, 0..1439. */
function toLocalMinutes(ut: number): number {
  return Math.round(mod(ut + IST_OFFSET_HOURS, 24) * 60);
}

export interface SunTimes {
  /** Minutes since IST midnight. */
  sunrise: number;
  sunset: number;
}

/** Sunrise & sunset for a location on a date, as minutes since IST midnight. Returns null only at
 *  the polar edge cases (not reachable within India). */
export function sunTimes(lat: number, lng: number, date: Date): SunTimes | null {
  const rise = eventUT(lat, lng, date, true);
  const set = eventUT(lat, lng, date, false);
  if (rise === null || set === null) return null;
  return { sunrise: toLocalMinutes(rise), sunset: toLocalMinutes(set) };
}
