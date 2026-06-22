// Pure logic for the Rhythm reminders: which nudges a given day should carry, as minutes-since-
// midnight. The side-effecting scheduler (lib/notifications) turns these into dated notifications.
//
// To keep mornings from getting noisy (there's already a workout reminder), the morning sleep prompt
// and the "get some daylight" nudge are COMBINED into one morning check-in; the evening-light
// reminder stays separate near sunset. Each is dropped once that item is logged.

import { type CircadianDay } from '@/engine/circadian';

export const SLEEP_MINUTE = 7 * 60; // 7:00 am — the morning check-in
const EVENING_BEFORE_SUNSET = 30; // minutes before sunset

export interface SunWindow {
  sunrise: number;
  sunset: number;
}
export interface RhythmSlot {
  minute: number;
  title: string;
  body: string;
}

const MORNING = { title: 'Morning check-in', body: 'How did you sleep? And step into some daylight today.' };
const EVENING = { title: 'Evening light', body: 'Sun’s setting soon — catch the last of the daylight.' };

/** The reminder slots a day should carry: a combined morning check-in (until sleep is logged) and an
 *  evening-light nudge (needs a location for sunset; dropped once evening light is logged). */
export function rhythmSlots(sun: SunWindow | null, log: CircadianDay | undefined): RhythmSlot[] {
  const out: RhythmSlot[] = [];
  if (!log || log.quality === undefined) out.push({ minute: SLEEP_MINUTE, ...MORNING });
  if (sun && (!log || !log.eveningLight)) out.push({ minute: sun.sunset - EVENING_BEFORE_SUNSET, ...EVENING });
  return out;
}
