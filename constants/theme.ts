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

  // bold & energetic additions
  ink: '#0C1410', // near-black base for bold blocks + big headings
  inkCard: '#10211A', // dark hero-card background (deep green-black)
  accent: '#22C55E', // vivid green for CTAs / highlights on dark
  onInk: '#FFFFFF', // text on dark blocks
  onInkMuted: '#9FB3A8', // muted text on dark blocks
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;
export const font = { display: 34, title: 28, h2: 20, body: 16, small: 13, eyebrow: 12 } as const;
