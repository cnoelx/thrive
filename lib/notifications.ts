// Local (on-device) workout reminders. No backend — the OS fires them on a schedule. One unified
// scheduler lays down the next week of nudges: a morning beat and an evening last-call on every
// workout day, skipping rest days and any day already completed. Re-run on every app open and on
// workout completion, so showing up keeps the queue fresh and "done" days fall silent. Copy
// escalates for a user who's currently lapsed.

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { type IndiaLocation } from '@/data/locations';
import { type CircadianDay } from '@/engine/circadian';
import { rhythmSlots } from '@/engine/rhythmReminders';
import { isRestDay } from '@/engine/streak';
import { sunTimes } from '@/lib/sun';

// New channel id on purpose: Android locks a channel's importance after first creation, so the only
// way to get heads-up (banner + sound) is a channel that was created at HIGH from the start.
const CHANNEL_ID = 'workout-reminders';
const RHYTHM_CHANNEL_ID = 'rhythm-reminders';
const HORIZON_DAYS = 7;
const MORNING_HOUR = 6;
const EVENING_HOUR = 16;

/** Cancel only the scheduled notifications of the given kinds (so the workout and rhythm streams
 *  don't wipe each other when either re-arms). `undefined` matches legacy untagged (= workout). */
async function cancelKinds(kinds: (string | undefined)[]): Promise<void> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    all
      .filter((n) => kinds.includes((n.content.data as { kind?: string } | undefined)?.kind))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

function todayNumber(): number {
  const now = new Date();
  return Math.floor((now.getTime() - now.getTimezoneOffset() * 60000) / 86400000);
}

/** Local Date at hour:minute on the given day number. */
function dateAt(dayNumber: number, hour: number, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + (dayNumber - todayNumber()));
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function ensureChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Workout reminders',
      importance: Notifications.AndroidImportance.HIGH, // heads-up banner + sound
    });
  }
}

/** Ask for notification permission. Returns true if granted. */
export async function requestNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const res = await Notifications.requestPermissionsAsync();
  return res.granted;
}

const COPY = {
  morning: {
    normal: { title: 'Today’s workout’s ready 🔥', body: '10 minutes is all it takes — let’s go.' },
    lapsed: { title: 'Fresh start today 🔥', body: 'Your fire’s waiting — a short session brings it right back.' },
  },
  evening: {
    normal: { title: 'Still time today', body: 'A quick workout keeps the fire going.' },
    lapsed: { title: 'Don’t let today slip', body: 'Even 10 minutes today gets you back on track.' },
  },
};

/** Re-arm the next week of reminders from current state. Cancels everything first, so it's safe to
 *  call on every app open / workout completion. No-op (and clears the queue) when off or unpermitted.
 *  `customTime` set → one daily reminder at that time; null → the default morning + evening beats. */
export async function refreshReminders(opts: {
  lastLoggedDay: number | null;
  lapsed: boolean;
  enabled: boolean;
  customTime: { hour: number; minute: number } | null;
}): Promise<void> {
  await cancelKinds(['workout', undefined]);
  if (!opts.enabled) return;
  const perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) return;
  await ensureChannel();

  const today = todayNumber();
  let firstWorkoutDay = true;
  for (let i = 0; i < HORIZON_DAYS; i++) {
    const d = today + i;
    if (isRestDay(d)) continue;
    if (d === today && opts.lastLoggedDay === today) continue; // already trained today
    const escalate = firstWorkoutDay && opts.lapsed;
    firstWorkoutDay = false;
    const slots = opts.customTime
      ? [
          { at: dateAt(d, opts.customTime.hour, opts.customTime.minute), copy: escalate ? COPY.morning.lapsed : COPY.morning.normal },
          // Keep the afternoon "still not done?" last call when the chosen time is at least an hour
          // earlier, so a missed morning reminder still gets one nudge — but no near-duplicate when
          // the custom time is already mid-afternoon.
          ...(opts.customTime.hour * 60 + opts.customTime.minute <= EVENING_HOUR * 60 - 60
            ? [{ at: dateAt(d, EVENING_HOUR), copy: escalate ? COPY.evening.lapsed : COPY.evening.normal }]
            : []),
        ]
      : [
          { at: dateAt(d, MORNING_HOUR), copy: escalate ? COPY.morning.lapsed : COPY.morning.normal },
          { at: dateAt(d, EVENING_HOUR), copy: escalate ? COPY.evening.lapsed : COPY.evening.normal },
        ];
    for (const slot of slots) {
      if (slot.at.getTime() <= Date.now()) continue; // skip a slot already past today
      await Notifications.scheduleNotificationAsync({
        content: { title: slot.copy.title, body: slot.copy.body, data: { kind: 'workout' } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: slot.at, channelId: CHANNEL_ID },
      });
    }
  }
}

async function ensureRhythmChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(RHYTHM_CHANNEL_ID, {
      name: 'Rhythm reminders',
      importance: Notifications.AndroidImportance.DEFAULT, // gentler than workout — no heads-up
    });
  }
}

/** Re-arm the next week of Rhythm nudges (sleep + sunrise/sunset light) from current state. Safe to
 *  call on every app open and after each log — re-lays from the circadian record, so logged items
 *  fall silent. The light nudges need a location; without one, only the sleep prompt is laid down. */
export async function refreshRhythmReminders(opts: {
  enabled: boolean;
  location: IndiaLocation | null;
  circadian: Record<number, CircadianDay>;
}): Promise<void> {
  await cancelKinds(['rhythm']);
  if (!opts.enabled) return;
  const perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) return;
  await ensureRhythmChannel();

  const today = todayNumber();
  for (let i = 0; i < HORIZON_DAYS; i++) {
    const d = today + i;
    const sun = opts.location ? sunTimes(opts.location.lat, opts.location.lng, dateAt(d, 12)) : null;
    for (const slot of rhythmSlots(sun, opts.circadian[d])) {
      const at = dateAt(d, Math.floor(slot.minute / 60), slot.minute % 60);
      if (at.getTime() <= Date.now()) continue; // skip a slot already past today
      await Notifications.scheduleNotificationAsync({
        content: { title: slot.title, body: slot.body, data: { kind: 'rhythm' } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: RHYTHM_CHANNEL_ID },
      });
    }
  }
}
