// Pure logic for the Rhythm reminders: which nudges a given day should carry, as minutes-since-
// midnight. The side-effecting scheduler (lib/notifications) turns these into dated notifications.
// Sleep fires at a fixed morning time (no location needed); the two light nudges are timed off
// sunrise/sunset, so they only exist when a location is set. Each is dropped once that item is logged.

import { type CircadianDay } from '@/engine/circadian';

export const SLEEP_MINUTE = 7 * 60; // 7:00 am — the morning sleep-log prompt
const MORNING_AFTER_SUNRISE = 20; // minutes after sunrise
const MORNING_FLOOR = 6 * 60 + 30; // never earlier than 6:30 am
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

const SLEEP = { title: 'How did you sleep?', body: 'Log last night while it’s fresh.' };
const MORNING = { title: 'Catch some morning light', body: 'A few minutes outside now sets your body clock.' };
const EVENING = { title: 'Evening light', body: 'Sun’s setting soon — step out for the last of the daylight.' };

/** The reminder slots a day should carry, given its sunrise/sunset (null = no location → no light
 *  nudges) and what's already been logged that day. */
export function rhythmSlots(sun: SunWindow | null, log: CircadianDay | undefined): RhythmSlot[] {
  const out: RhythmSlot[] = [];
  if (!log || log.quality === undefined) out.push({ minute: SLEEP_MINUTE, ...SLEEP });
  if (sun) {
    if (!log || !log.morningLight) out.push({ minute: Math.max(sun.sunrise + MORNING_AFTER_SUNRISE, MORNING_FLOOR), ...MORNING });
    if (!log || !log.eveningLight) out.push({ minute: sun.sunset - EVENING_BEFORE_SUNSET, ...EVENING });
  }
  return out;
}
