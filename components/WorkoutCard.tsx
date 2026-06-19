// Shareable workout card — the branded "I trained today" image, designed to capture and post.
// Two themes: 'orange' (deepened ember gradient) and 'dark' (ink card with ember accents). The header
// carries the real chevron logo + "Thrive"; moves list as "2 × 30 reps" (sets × target), tagline footer.

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Dimensions, Image, StyleSheet, Text, View } from 'react-native';

import { fonts } from '@/constants/theme';
import { formatTarget } from '@/data/benchmarks';

const CHEVRON = require('../assets/images/chevron.png');

export type CardTheme = 'orange' | 'dark';

export interface WorkoutCardData {
  focus: string;
  dateLabel: string; // e.g. "JUNE 15, 2026"
  streak: number; // < 2 hides the streak chunk
  durationMin?: number;
  calories?: number;
  items: { name: string; sets?: number | null; target: string }[];
}

// Deepened ember (starts at a true orange, not pale apricot) so white text stays legible. A faint top
// scrim darkens the header zone. start/end approximate a ~150° CSS angle.
const EMBER = ['#F88B33', '#E85C13', '#BC3B0B'] as const;
const EMBER_LOC = [0, 0.46, 1] as const;
const INK = ['#16221B', '#0B110D'] as const;
const GRAD_START = { x: 0.12, y: 0.05 };
const GRAD_END = { x: 0.88, y: 0.95 };

const THEME = {
  orange: {
    grad: EMBER,
    scrim: true,
    border: undefined as string | undefined,
    pri: '#fff',
    sec: 'rgba(255,255,255,0.92)',
    ter: 'rgba(255,255,255,0.74)',
    divider: 'rgba(255,255,255,0.24)',
    reps: 'rgba(255,255,255,0.92)',
    accent: '#fff', // chevron + flame
  },
  dark: {
    grad: INK,
    scrim: false,
    border: 'rgba(255,255,255,0.06)',
    pri: '#F4EFE9',
    sec: '#C9C2B8',
    ter: '#8A8278',
    divider: 'rgba(255,255,255,0.09)',
    reps: '#FB923C',
    accent: '#FB923C', // chevron + flame
  },
} as const;

const DEFAULT_W = Math.min(Dimensions.get('window').width - 56, 360);

// Trim parentheticals / arrow-suffixes so the reps column stays tidy (the full version lives in-app).
function shortReps(target: string): string {
  return formatTarget(target.replace(/\s*\(.*?\)\s*/g, '').replace(/\s*→.*/, '').trim());
}

function reps(it: WorkoutCardData['items'][number]): string {
  return `${it.sets ? `${it.sets} × ` : ''}${shortReps(it.target)}`;
}

export function WorkoutCard({ focus, dateLabel, streak, durationMin, calories, items, theme = 'orange', width = DEFAULT_W }: WorkoutCardData & { theme?: CardTheme; width?: number }) {
  const t = THEME[theme];
  const tail = [durationMin ? `${durationMin} min` : null, calories ? `~${calories} kcal` : null].filter(Boolean);
  return (
    <LinearGradient colors={t.grad} locations={theme === 'orange' ? EMBER_LOC : undefined} start={GRAD_START} end={GRAD_END} style={[styles.card, { width }, t.border ? { borderWidth: 1, borderColor: t.border } : null]}>
      {t.scrim ? <LinearGradient colors={['rgba(44,14,3,0.20)', 'rgba(44,14,3,0)']} style={styles.scrim} pointerEvents="none" /> : null}

      <View style={styles.headerRow}>
        <View style={styles.brandWrap}>
          <Image source={CHEVRON} style={[styles.chevron, { tintColor: t.accent }]} />
          <Text style={[styles.brand, { color: t.pri }]}>Thrive</Text>
        </View>
        <Text style={[styles.date, { color: t.ter }]}>{dateLabel}</Text>
      </View>

      <View style={styles.hero}>
        <Text style={[styles.focus, { color: t.pri }]}>{focus}</Text>
        <View style={styles.metaRow}>
          {streak >= 2 ? (
            <>
              <Ionicons name="flame" size={16} color={t.accent} />
              <Text style={[styles.metaText, { color: t.sec }]}>{streak}-day streak</Text>
              {tail.length ? <Text style={[styles.metaDot, { color: t.ter }]}>·</Text> : null}
            </>
          ) : null}
          {tail.map((tx, i) => (
            <View key={i} style={styles.metaInline}>
              <Text style={[styles.metaText, { color: t.sec }]}>{tx}</Text>
              {i < tail.length - 1 ? <Text style={[styles.metaDot, { color: t.ter }]}>·</Text> : null}
            </View>
          ))}
        </View>
      </View>

      <View style={styles.list}>
        {items.map((it, i) => (
          <View key={i} style={[styles.row, i > 0 && { borderTopWidth: 1, borderTopColor: t.divider }]}>
            <Text style={[styles.moveName, { color: t.pri }]} numberOfLines={1}>
              {it.name}
            </Text>
            <Text style={[styles.moveReps, { color: t.reps }]} numberOfLines={1}>
              {reps(it)}
            </Text>
          </View>
        ))}
      </View>

      <Text style={[styles.tagline, { color: t.ter }]}>strong for modern life</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 24, padding: 26, overflow: 'hidden' },
  scrim: { position: 'absolute', left: 0, right: 0, top: 0, height: '30%' },

  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandWrap: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  chevron: { width: 22, height: 14, resizeMode: 'contain' },
  brand: { fontSize: 17, fontFamily: fonts.heavy, letterSpacing: 0.2 },
  date: { fontSize: 11, fontFamily: fonts.regular, letterSpacing: 0.5 },

  hero: { marginTop: 32 },
  focus: { fontSize: 42, fontFamily: fonts.display, letterSpacing: -0.5 },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7, marginTop: 11 },
  metaInline: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  metaText: { fontSize: 14, fontFamily: fonts.bold },
  metaDot: { fontSize: 14 },

  list: { marginTop: 34 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 12 },
  moveName: { flex: 1, fontSize: 16, fontFamily: fonts.bold },
  moveReps: { fontSize: 14, fontFamily: fonts.regular },

  tagline: { marginTop: 28, textAlign: 'center', fontSize: 10, fontFamily: fonts.regular, letterSpacing: 0.5 },
});
