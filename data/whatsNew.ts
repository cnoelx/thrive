// "What's new" changelog. Bump `version` (and refresh `items`) with each OTA/build you want to
// announce. The popup shows once per version, gated by the persisted `whatsNewSeen` flag — and new
// users skip it (onboarding marks the current version as already seen).
//
// Only list changes the user actually cares about: new features, behaviour they'll notice, things
// worth opening the app for. Skip silent polish — reworded copy, de-jargoning, bug fixes, internal
// cleanup. If an item wouldn't make a user think "oh, nice", leave it out. A short, high-signal list
// is better than a thorough one.
export const WHATS_NEW: { version: number; items: string[] } = {
  version: 10,
  items: [
    'Voice coaching — start a workout and Thrive calls out each move and your rest, hands-free. Tap the speaker to mute.',
    'Share your workout — one tap turns it into a card you can post to Instagram, WhatsApp, anywhere.',
    'Thrive updates itself now — when a new version is out you’ll get a prompt to download and install it, no more chasing links.',
  ],
};
