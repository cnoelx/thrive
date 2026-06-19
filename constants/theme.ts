// Minimal shared visual tokens for V1 — a single light theme, kept deliberately simple.

export const colors = {
  bg: '#F6F7F9',
  surface: '#FFFFFF',
  text: '#11161D',
  muted: '#6B7280',
  border: '#E6E8EC',
  track: '#ECEEF1',
  primary: '#111827', // ink — primary actions & buttons (brand moved off green to ink + ember)
  primaryText: '#FFFFFF',
  link: '#EA580C', // ember — tappable accents & small highlights on light surfaces (back links, "Change", chevrons, bullet dots, input underlines, the reminder switch)
  warnBg: '#FEF3C7',
  warnText: '#92400E',

  // Completion is the one job green keeps — it's the universal "done" signal, not the brand.
  done: '#16A34A', // calm green — completed/claimed ticks and the cooled "done today" card
  doneSoft: '#DCFCE7', // soft green wash behind a completed row

  ink: '#0C1410', // near-black for bold headings

  // Dark hero block on the home screen
  inkCard: '#0C1410', // ink-black hero background
  onInkMuted: '#8A9590', // muted text on the dark hero
  accent: '#FB923C', // ember highlight on dark — the brand accent
  streakInk: '#FBBF24', // amber streak text on dark
  streakBg: '#FFF1E8', // soft ember wash — THIS WEEK card background (on-brand warmth, not caution-yellow)
  streakBorder: '#FED7AA', // soft ember border around the streak card
  session: '#EA580C', // hot orange — a pending or live workout session (cools to "done" green)
} as const;

// Per-area identity colours — used for level badges and progress bars so the five training areas
// read at a glance. Primary actions are ink; the green `done` token marks completion.
// move = ember (the heart of the program), cardio = rose (heart rate), mobility = teal (calm).
export const categoryColors: Record<string, { main: string; soft: string }> = {
  move: { main: '#EA580C', soft: '#FED7AA' },
  push: { main: '#2563EB', soft: '#DBEAFE' },
  pull: { main: '#7C3AED', soft: '#EDE9FE' },
  cardio: { main: '#E11D48', soft: '#FFE4E6' },
  mobility: { main: '#0D9488', soft: '#CCFBF1' },
};

// Outfit (Google Fonts), loaded in app/_layout. Custom fonts don't respond to fontWeight — always
// set one of these families instead. Hierarchy: display (hero numbers/titles) > heavy (headings,
// buttons) > bold (emphasis) > regular (body).
export const fonts = {
  regular: 'Outfit_500Medium',
  bold: 'Outfit_700Bold',
  heavy: 'Outfit_800ExtraBold',
  display: 'Outfit_900Black',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;
export const font = { display: 34, title: 28, h2: 20, body: 16, small: 13, eyebrow: 12 } as const;
