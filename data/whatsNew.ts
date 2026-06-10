// "What's new" changelog. Bump `version` (and refresh `items`) with each OTA/build you want to
// announce. The popup shows once per version, gated by the persisted `whatsNewSeen` flag — and new
// users skip it (onboarding marks the current version as already seen).
export const WHATS_NEW: { version: number; items: string[] } = {
  version: 2,
  items: [
    'New Settings screen — tap the gear (top-right) to edit your name, see what’s new, or start over.',
    'Plain, beginner-friendly wording throughout — no jargon.',
    'Pull is now part of the "Find my level" quiz.',
  ],
};
