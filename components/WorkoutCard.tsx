// Shareable workout card — the branded "I trained today" image, designed to capture and post.
// Two themes: 'orange' (deepened ember gradient) and 'dark' (ink card with ember accents). The header
// carries the real chevron logo + "Thrive"; moves list as "2 × 30 reps" (sets × target), tagline footer.
//
// IMPORTANT: both themes render the EXACT same view tree — same number of gradient stops, the scrim is
// always present (transparent on dark), same border (transparent on orange). Only colour *values*
// differ. Toggling theme must not mount/unmount children or change a gradient's colour count, or Expo's
// native LinearGradient corrupts on Android (renders black / stale). All sizes scale from `width` so the
// card looks right whether it's the full-screen card or matted small inside a Story frame.

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

const THEME = {
  orange: {
    grad: ['#F88B33', '#E85C13', '#BC3B0B'], // deepened ember — starts at a true orange, not pale apricot
    scrim: ['rgba(44,14,3,0.20)', 'rgba(44,14,3,0)'], // top darkening so the header stays legible
    border: 'transparent',
    pri: '#fff',
    sec: 'rgba(255,255,255,0.92)',
    ter: 'rgba(255,255,255,0.74)',
    divider: 'rgba(255,255,255,0.24)',
    reps: 'rgba(255,255,255,0.92)',
    accent: '#fff', // chevron + flame
  },
  dark: {
    grad: ['#1E2A22', '#16221B', '#0A0F0C'], // ink
    scrim: ['rgba(0,0,0,0)', 'rgba(0,0,0,0)'], // present but invisible (keeps the view tree identical)
    border: 'rgba(255,255,255,0.07)',
    pri: '#F4EFE9',
    sec: '#C9C2B8',
    ter: '#8A8278',
    divider: 'rgba(255,255,255,0.09)',
    reps: '#FB923C',
    accent: '#FB923C', // chevron + flame
  },
} as const;

const GRAD_START = { x: 0.12, y: 0.05 };
const GRAD_END = { x: 0.88, y: 0.95 };
const SCRIM_START = { x: 0, y: 0 };
const SCRIM_END = { x: 0, y: 1 };

const BASE = 360; // design width — every size scales from this
const DEFAULT_W = Math.min(Dimensions.get('window').width - 56, BASE);

// Trim parentheticals / arrow-suffixes so the reps column stays tidy (the full version lives in-app).
function shortReps(target: string): string {
  return formatTarget(target.replace(/\s*\(.*?\)\s*/g, '').replace(/\s*→.*/, '').trim());
}

function reps(it: WorkoutCardData['items'][number]): string {
  return `${it.sets ? `${it.sets} × ` : ''}${shortReps(it.target)}`;
}

export function WorkoutCard({ focus, dateLabel, streak, durationMin, calories, items, theme = 'orange', width = DEFAULT_W }: WorkoutCardData & { theme?: CardTheme; width?: number }) {
  const t = THEME[theme];
  const s = width / BASE; // scale factor
  const tail = [durationMin ? `${durationMin} min` : null, calories ? `~${calories} kcal` : null].filter(Boolean);
  return (
    <LinearGradient colors={t.grad} start={GRAD_START} end={GRAD_END} style={[styles.card, { width, borderRadius: 26 * s, paddingHorizontal: 26 * s, paddingVertical: 34 * s, borderWidth: 1, borderColor: t.border }]}>
      <LinearGradient colors={t.scrim} start={SCRIM_START} end={SCRIM_END} style={styles.scrim} pointerEvents="none" />

      <View style={styles.headerRow}>
        <View style={[styles.brandWrap, { gap: 7 * s }]}>
          <Image source={CHEVRON} style={{ width: 22 * s, height: 14 * s, resizeMode: 'contain', tintColor: t.accent }} />
          <Text style={{ fontSize: 17 * s, fontFamily: fonts.heavy, letterSpacing: 0.2, color: t.pri }}>Thrive</Text>
        </View>
        <Text style={{ fontSize: 11 * s, fontFamily: fonts.regular, letterSpacing: 0.5, color: t.ter }}>{dateLabel}</Text>
      </View>

      <View style={{ marginTop: 40 * s }}>
        <Text style={{ fontSize: 42 * s, lineHeight: 44 * s, fontFamily: fonts.display, letterSpacing: -0.5, color: t.pri }}>{focus}</Text>
        <View style={[styles.metaRow, { gap: 7 * s, marginTop: 13 * s }]}>
          {streak >= 2 ? (
            <>
              <Ionicons name="flame" size={16 * s} color={t.accent} />
              <Text style={{ fontSize: 14 * s, fontFamily: fonts.bold, color: t.sec }}>{streak}-day streak</Text>
              {tail.length ? <Text style={{ fontSize: 14 * s, color: t.ter }}>·</Text> : null}
            </>
          ) : null}
          {tail.map((tx, i) => (
            <View key={i} style={[styles.metaInline, { gap: 7 * s }]}>
              <Text style={{ fontSize: 14 * s, fontFamily: fonts.bold, color: t.sec }}>{tx}</Text>
              {i < tail.length - 1 ? <Text style={{ fontSize: 14 * s, color: t.ter }}>·</Text> : null}
            </View>
          ))}
        </View>
      </View>

      <View style={{ marginTop: 42 * s }}>
        {items.map((it, i) => (
          <View key={i} style={[styles.row, { gap: 12 * s, paddingVertical: 16 * s }, i > 0 && { borderTopWidth: 1, borderTopColor: t.divider }]}>
            <Text style={{ flex: 1, fontSize: 16 * s, fontFamily: fonts.bold, color: t.pri }} numberOfLines={1}>
              {it.name}
            </Text>
            <Text style={{ fontSize: 14 * s, fontFamily: fonts.regular, color: t.reps }} numberOfLines={1}>
              {reps(it)}
            </Text>
          </View>
        ))}
      </View>

      <Text style={{ marginTop: 36 * s, textAlign: 'center', fontSize: 11 * s, fontFamily: fonts.regular, letterSpacing: 0.5, color: t.ter }}>strong for modern life</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden' },
  scrim: { position: 'absolute', left: 0, right: 0, top: 0, height: '30%' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandWrap: { flexDirection: 'row', alignItems: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  metaInline: { flexDirection: 'row', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
