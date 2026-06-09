// "What's new" changelog. Bump `version` (and refresh `items`) with each OTA/build you want to
// announce. The popup shows once per version, gated by the persisted `whatsNewSeen` flag — and new
// users skip it (onboarding marks the current version as already seen).
export const WHATS_NEW: { version: number; items: string[] } = {
  version: 1,
  items: [
    'Plain, beginner-friendly wording throughout — no jargon.',
    'Pull is now part of the "Find my level" quiz.',
    'One-time form checks (sit-to-stand, mobility) are clearly labelled.',
  ],
};
