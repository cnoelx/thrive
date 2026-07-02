// On-demand workout library — every distinct session in the week, startable anytime. These are
// freestyle: the workout screen (launched with ?day=<key>) runs the full guided session but doesn't
// log or touch the streak. Reached from the "Workouts" button at the bottom of home.

import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, font, fonts, radius, spacing } from '@/constants/theme';
import { CARDIO_ACTIVITIES } from '@/data/cardio';
import { DAY_KEYS } from '@/data/schedule';
import { workoutForDay } from '@/engine/dailyCard';
import { useAppStore } from '@/store/useAppStore';

export default function Workouts() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const progress = useAppStore((s) => s.progress);
  const pullUnlocked = useAppStore((s) => s.pullUnlocked);
  const sessions = DAY_KEYS.map((key) => ({ key, wk: workoutForDay(progress, pullUnlocked, key) })).filter((s) => !s.wk.rest);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.headerSide}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>Workouts</Text>
        <View style={styles.headerSide} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}>
        <Text style={styles.intro}>Start any session whenever you like. These are bonus — they don&apos;t affect your streak or progress.</Text>
        <View style={styles.card}>
          {sessions.map((s, i) => (
            <Pressable key={s.key} onPress={() => router.push(`/workout?day=${s.key}`)} style={[styles.row, i > 0 && styles.rowDivider]}>
              <View style={styles.icon}>
                <Ionicons name={s.wk.focus.includes('Cardio') ? 'walk-outline' : 'barbell-outline'} size={18} color={colors.session} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{s.wk.focus}</Text>
                <Text style={styles.moves}>{s.wk.items.length} moves</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}
        </View>

        {/* Freestyle cardio — timed activities outside the program; the player clocks Begin → Finish */}
        <Text style={styles.sectionLabel}>CARDIO</Text>
        <View style={styles.card}>
          {CARDIO_ACTIVITIES.map((a, i) => (
            <Pressable key={a.key} onPress={() => router.push(`/workout?cardio=${a.key}`)} style={[styles.row, i > 0 && styles.rowDivider]}>
              <View style={styles.icon}>
                <MaterialCommunityIcons name={a.icon} size={19} color={colors.session} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{a.name}</Text>
                <Text style={styles.moves}>{a.target}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  headerSide: { width: 72 },
  back: { color: colors.link, fontSize: font.body, fontFamily: fonts.bold },
  title: { flex: 1, textAlign: 'center', color: colors.ink, fontSize: font.h2, fontFamily: fonts.heavy },
  intro: { color: colors.muted, fontSize: font.small, fontFamily: fonts.regular, lineHeight: 19, marginBottom: spacing.lg },
  sectionLabel: { color: colors.link, fontSize: font.eyebrow, fontFamily: fonts.heavy, letterSpacing: 1, marginTop: spacing.xl, marginBottom: spacing.sm },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  icon: { width: 38, height: 38, borderRadius: 10, backgroundColor: colors.streakBg, alignItems: 'center', justifyContent: 'center' },
  name: { color: colors.text, fontSize: font.body, fontFamily: fonts.bold },
  moves: { color: colors.muted, fontSize: font.small, fontFamily: fonts.regular, marginTop: 2 },
  chevron: { color: colors.muted, fontSize: 22, fontFamily: fonts.regular },
});
