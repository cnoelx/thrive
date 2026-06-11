// "What's new" changelog. Bump `version` (and refresh `items`) with each OTA/build you want to
// announce. The popup shows once per version, gated by the persisted `whatsNewSeen` flag — and new
// users skip it (onboarding marks the current version as already seen).
//
// Only list changes the user actually cares about: new features, behaviour they'll notice, things
// worth opening the app for. Skip silent polish — reworded copy, de-jargoning, bug fixes, internal
// cleanup. If an item wouldn't make a user think "oh, nice", leave it out. A short, high-signal list
// is better than a thorough one.
export const WHATS_NEW: { version: number; items: string[] } = {
  version: 6,
  items: [
    'Workouts now build toward your next goal — one fresh try at it, then solid sets at your level.',
    'Finish a workout and get a summary of what you did — and tap any green day in the calendar to look back at it.',
  ],
};
