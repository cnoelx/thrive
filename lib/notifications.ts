// Local (on-device) workout reminders. No backend — the OS fires them on a schedule. One unified
// scheduler lays down the next week of nudges: a morning beat and an evening last-call on every
// workout day, skipping rest days and any day already completed. Re-run on every app open and on
// workout completion, so showing up keeps the queue fresh and "done" days fall silent. Copy
// escalates for a user who's currently lapsed.

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { isRestDay } from '@/engine/streak';

// New channel id on purpose: Android locks a channel's importance after first creation, so the only
// way to get heads-up (banner + sound) is a channel that was created at HIGH from the start.
const CHANNEL_ID = 'workout-reminders';
const HORIZON_DAYS = 7;
const MORNING_HOUR = 8;
const EVENING_HOUR = 19;

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
  await Notifications.cancelAllScheduledNotificationsAsync();
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
      ? [{ at: dateAt(d, opts.customTime.hour, opts.customTime.minute), copy: escalate ? COPY.morning.lapsed : COPY.morning.normal }]
      : [
          { at: dateAt(d, MORNING_HOUR), copy: escalate ? COPY.morning.lapsed : COPY.morning.normal },
          { at: dateAt(d, EVENING_HOUR), copy: escalate ? COPY.evening.lapsed : COPY.evening.normal },
        ];
    for (const slot of slots) {
      if (slot.at.getTime() <= Date.now()) continue; // skip a slot already past today
      await Notifications.scheduleNotificationAsync({
        content: { title: slot.copy.title, body: slot.copy.body },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: slot.at, channelId: CHANNEL_ID },
      });
    }
  }
}
