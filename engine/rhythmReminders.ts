// Pure logic for the Rhythm reminder: the single morning nudge a given day should carry, as minutes-
// since-midnight. The side-effecting scheduler (lib/notifications) turns it into a dated notification.
//
// One gentle morning ping that leads with the action (step into the daylight) and tails the reflective
// ask (how did you sleep). Timed to actual sunrise so "the sun's up" is true — floored so an early
// summer sunrise doesn't buzz before 6am. Dropped once sleep is logged. No evening push (the evening
// daylight cue lives on the card instead).

import { type CircadianDay } from '@/engine/circadian';

export const SUNRISE_FLOOR = 6 * 60; // don't ping before 6:00am even if the sun's up earlier
export const MORNING_FALLBACK = 7 * 60; // no location → no sunrise to anchor to, so a fixed 7:00am

export interface SunWindow {
  sunrise: number;
  sunset: number;
}
export interface RhythmSlot {
  minute: number;
  title: string;
  body: string;
}

const MORNING = { title: 'Step into the daylight ☀', body: 'A few minutes of morning light sets your clock. And how did you sleep?' };

/** The reminder a day should carry: a single morning nudge at sunrise (floored to 6am; 7am with no
 *  location), dropped once that night's sleep is logged. */
export function rhythmSlots(sun: SunWindow | null, log: CircadianDay | undefined): RhythmSlot[] {
  if (log && log.quality !== undefined) return [];
  const minute = sun ? Math.max(sun.sunrise, SUNRISE_FLOOR) : MORNING_FALLBACK;
  return [{ minute, ...MORNING }];
}
