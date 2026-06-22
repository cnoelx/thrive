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
