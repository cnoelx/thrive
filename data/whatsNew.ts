// "What's new" changelog. Bump `version` (and refresh `items`) with each OTA/build you want to
// announce. The popup shows once per version, gated by the persisted `whatsNewSeen` flag — and new
// users skip it (onboarding marks the current version as already seen).
//
// Only list changes the user actually cares about: new features, behaviour they'll notice, things
// worth opening the app for. Skip silent polish — reworded copy, de-jargoning, bug fixes, internal
// cleanup. If an item wouldn't make a user think "oh, nice", leave it out. A short, high-signal list
// is better than a thorough one.
export const WHATS_NEW: { version: number; items: string[] } = {
  version: 11,
  items: [
    'New — Rhythm: a calm place to track your sleep and daylight, right on your home screen. See your sunrise, sunset and tonight’s moon, log how you slept in a tap, and get gentle nudges to catch some light.',
  ],
};
