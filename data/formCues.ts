// DRAFT "how to do it" cues shown in the workout screen's info sheet.
// GENERAL GUIDANCE ONLY — not a substitute for a qualified coach/physio. Per the program's
// "How It Works" notes, these should be reviewed before release. Keyed by exercise key
// (see data/benchmarks.ts). Phase 2: start/finish images get added alongside these.

export const FORM_CUES: Record<string, string[]> = {
  squat: [
    "Feet about shoulder-width, toes turned slightly out.",
    "Sit your hips back and down, chest tall.",
    "Knees track over your toes — don't let them cave in.",
    "Drive through your heels to stand.",
  ],
  lunge: [
    "Step one foot back and lower until both knees are about 90°.",
    "Keep your front knee over your ankle, torso upright.",
    "Push through your front heel to return.",
    "Alternate legs each rep.",
  ],
  sittostand: [
    "Start seated on the floor.",
    "Stand up using as little hand support as your level allows.",
    "Move slowly and under control — no momentum.",
    "Lower back down the same way.",
  ],
  balance: [
    "Stand tall and lift one foot off the floor.",
    "Fix your eyes on a point ahead to steady yourself.",
    "Keep a soft bend in the standing knee.",
    "Hold, then switch legs.",
  ],
  plank: [
    "Forearms under your shoulders, body in one straight line.",
    "Squeeze your glutes and brace your core.",
    "Don't let your hips sag or pike up.",
    "Breathe steadily and hold.",
  ],
  sideplank: [
    "Forearm under your shoulder, feet stacked or staggered.",
    "Lift your hips so your body is a straight line.",
    "Keep your hips up — don't let them drop.",
    "Hold, then switch sides.",
  ],
  glutebridge: [
    "Lie on your back, knees bent, feet flat.",
    "Drive through your heels and lift your hips.",
    "Squeeze your glutes at the top, ribs down.",
    "Lower with control.",
  ],
  pronelegraise: [
    "Lie face down with legs straight.",
    "Lift one leg using your glute and hamstring.",
    "Keep your hips on the floor — don't arch your low back.",
    "Lower slowly; alternate legs.",
  ],
  pushups: [
    "Hands about shoulder-width, body in a straight line.",
    "Lower your chest under control, elbows about 45°.",
    "Press back up without letting your hips sag.",
    "Use a wall or incline to match your level.",
  ],
  barrow: [
    "Grip the bar and lean back with a straight body.",
    "Pull your chest toward the bar, squeeze shoulder blades.",
    "Stay rigid — no sagging hips.",
    "Lower under control.",
  ],
  deadhang: [
    "Grip the bar with arms straight.",
    "Engage your shoulders (active hang), don't fully slump.",
    "Relax, breathe, and hold.",
    "Step or drop down gently.",
  ],
  pullup: [
    "Start from a dead or active hang.",
    "Pull your shoulder blades down and lead with your chest.",
    "Control the way down — slow negatives count.",
    "Use a band or assistance to match your level.",
  ],
  walkrun: [
    "Keep an easy, conversational pace.",
    "Land softly with relaxed shoulders.",
    "Build duration before speed.",
    "Use walk-jog intervals before continuous jogging.",
  ],
  deepsquat: [
    "Lower into a deep squat with heels down.",
    "Use support if needed to stay balanced.",
    "Keep your chest tall and knees pushed out.",
    "Hold and breathe.",
  ],
  overhead: [
    "Stand tall with your back against a wall.",
    "Reach your arms overhead without flaring your ribs.",
    "Keep your low back flat against the wall.",
    "Only go as far as stays pain-free.",
  ],
  ankle: [
    "Face a wall with your foot a few inches back.",
    "Drive your knee toward the wall, keeping your heel down.",
    "Find the furthest distance where the heel stays planted.",
    "Test both sides.",
  ],
};
