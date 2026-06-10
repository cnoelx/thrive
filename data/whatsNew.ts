// "What's new" changelog. Bump `version` (and refresh `items`) with each OTA/build you want to
// announce. The popup shows once per version, gated by the persisted `whatsNewSeen` flag — and new
// users skip it (onboarding marks the current version as already seen).
//
// Only list changes the user actually cares about: new features, behaviour they'll notice, things
// worth opening the app for. Skip silent polish — reworded copy, de-jargoning, bug fixes, internal
// cleanup. If an item wouldn't make a user think "oh, nice", leave it out. A short, high-signal list
// is better than a thorough one.
export const WHATS_NEW: { version: number; items: string[] } = {
  version: 3,
  items: [
    'See your week at a glance — your last 7 days now show right on the home screen.',
    'Tap your week to open a month-by-month calendar of every workout you’ve done.',
  ],
};
