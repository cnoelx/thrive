// Minimal shared visual tokens for V1 — a single light theme, kept deliberately simple.

export const colors = {
  bg: '#F6F7F9',
  surface: '#FFFFFF',
  text: '#11161D',
  muted: '#6B7280',
  border: '#E6E8EC',
  track: '#ECEEF1',
  primary: '#16A34A',
  primaryText: '#FFFFFF',
  warnBg: '#FEF3C7',
  warnText: '#92400E',

  ink: '#0C1410', // near-black for bold headings

  // Dark hero block on the home screen
  inkCard: '#0C1410', // ink-black hero background (green-tinted near-black)
  onInkMuted: '#8A9590', // muted text on the dark hero
  accent: '#22C55E', // vivid green highlight on dark
  streakInk: '#FBBF24', // amber streak text on dark
  streakBg: '#FEF3C7', // warm amber — THIS WEEK card background
  streakBorder: '#FCD34D', // amber border around the streak card
  session: '#EA580C', // hot orange — a pending or live workout session (cools to green when done)
} as const;

// Per-area identity colours — used for level badges and progress bars so the five training areas
// read at a glance. Actions and "done" states stay `primary` green everywhere.
// move = brand green (the heart of the program), cardio = rose (heart rate), mobility = teal (calm).
export const categoryColors: Record<string, { main: string; soft: string }> = {
  move: { main: '#16A34A', soft: '#DCFCE7' },
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
