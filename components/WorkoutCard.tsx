// Shareable workout card — the branded "I trained today" image, designed to screenshot and post.
// Design: solid warm session-orange (OTA-safe — a true gradient needs a native module, deferred to
// the next APK build), faint flame watermark, focus name as hero, a streak·time·kcal meta line
// (flame only marks the streak), the moves listed with reps, tagline footer.

import { Ionicons } from '@expo/vector-icons';
import { Dimensions, StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/constants/theme';
import { formatTarget } from '@/data/benchmarks';

export interface WorkoutCardData {
  focus: string;
  dateLabel: string; // e.g. "JUNE 15, 2026"
  streak: number; // < 2 hides the streak chunk
  durationMin?: number;
  calories?: number;
  items: { name: string; target: string }[];
}

const W = Math.min(Dimensions.get('window').width - 56, 360);

// Trim parentheticals / arrow-suffixes so the reps column stays tidy (the full version lives in-app).
function shortReps(target: string): string {
  return formatTarget(target.replace(/\s*\(.*?\)\s*/g, '').replace(/\s*→.*/, '').trim());
}

export function WorkoutCard({ focus, dateLabel, streak, durationMin, calories, items }: WorkoutCardData) {
  const tail = [durationMin ? `${durationMin} min` : null, calories ? `~${calories} kcal` : null].filter(Boolean);
  return (
    <View style={styles.card}>
      {/* a soft deeper-orange wash bottom-right hints at depth without a native gradient */}
      <View style={styles.deepen} />
      <Ionicons name="flame" size={200} color="rgba(255,255,255,0.08)" style={styles.watermark} />

      <View style={styles.headerRow}>
        <Text style={styles.brand}>THRIVE</Text>
        <Text style={styles.date}>{dateLabel}</Text>
      </View>

      <View style={styles.hero}>
        <Text style={styles.focus}>{focus}</Text>
        <View style={styles.metaRow}>
          {streak >= 2 ? (
            <>
              <Ionicons name="flame" size={16} color="#fff" />
              <Text style={styles.metaText}>{streak}-day streak</Text>
              {tail.length ? <Text style={styles.metaDot}>·</Text> : null}
            </>
          ) : null}
          {tail.map((t, i) => (
            <View key={i} style={styles.metaInline}>
              <Text style={styles.metaText}>{t}</Text>
              {i < tail.length - 1 ? <Text style={styles.metaDot}>·</Text> : null}
            </View>
          ))}
        </View>
      </View>

      <View style={styles.list}>
        {items.map((it, i) => (
          <View key={i} style={[styles.row, i < items.length - 1 && styles.rowDivider]}>
            <Text style={styles.moveName} numberOfLines={1}>
              {it.name}
            </Text>
            <Text style={styles.moveReps} numberOfLines={1}>
              {shortReps(it.target)}
            </Text>
          </View>
        ))}
      </View>

      <Text style={styles.tagline}>strong for modern life</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: W, borderRadius: 24, padding: 26, overflow: 'hidden', backgroundColor: colors.session },
  deepen: { position: 'absolute', right: -60, bottom: -80, width: 280, height: 280, borderRadius: 140, backgroundColor: 'rgba(154,52,18,0.45)' },
  watermark: { position: 'absolute', left: -50, top: -44 },

  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { color: '#fff', fontSize: 14, fontFamily: fonts.heavy, letterSpacing: 2.5 },
  date: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontFamily: fonts.regular, letterSpacing: 0.5 },

  hero: { marginTop: 32 },
  focus: { color: '#fff', fontSize: 42, fontFamily: fonts.display, letterSpacing: -0.5 },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7, marginTop: 11 },
  metaInline: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  metaText: { color: 'rgba(255,255,255,0.95)', fontSize: 14, fontFamily: fonts.bold },
  metaDot: { color: 'rgba(255,255,255,0.55)', fontSize: 14 },

  list: { marginTop: 34 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 12 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.18)' },
  moveName: { flex: 1, color: '#fff', fontSize: 16, fontFamily: fonts.bold },
  moveReps: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontFamily: fonts.regular },

  tagline: { marginTop: 28, textAlign: 'center', color: 'rgba(255,255,255,0.65)', fontSize: 10, fontFamily: fonts.regular, letterSpacing: 0.5 },
});
