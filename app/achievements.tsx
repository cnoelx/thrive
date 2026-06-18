import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, font, fonts, radius, spacing } from '@/constants/theme';
import { ACHIEVEMENTS, type AchievementGroup, achievementContext, unlockedIds } from '@/engine/achievements';
import { useAppStore } from '@/store/useAppStore';

const GROUPS: { id: AchievementGroup; label: string }[] = [
  { id: 'push', label: 'PUSH' },
  { id: 'pull', label: 'PULL' },
  { id: 'legs', label: 'LEGS' },
  { id: 'cardio', label: 'CARDIO' },
];

// Achievement icon keys → Ionicons glyphs.
const ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  pushup: 'fitness', pullup: 'barbell', squat: 'body', run: 'walk', trophy: 'trophy',
};

export default function Achievements() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const progress = useAppStore((s) => s.progress);
  const markAchievementsSeen = useAppStore((s) => s.markAchievementsSeen);

  const earned = useMemo(() => new Set(unlockedIds(achievementContext({ progress }))), [progress]);

  // Opening the shelf means you've seen what you've earned — clear the hero dot.
  useEffect(() => {
    markAchievementsSeen([...earned]);
  }, [earned, markAchievementsSeen]);

  const pct = ACHIEVEMENTS.length ? (earned.size / ACHIEVEMENTS.length) * 100 : 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>Achievements</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}>
        <Text style={styles.count}>{earned.size} of {ACHIEVEMENTS.length} earned</Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${pct}%` }]} />
        </View>

        {GROUPS.map((g) => (
          <View key={g.id} style={styles.group}>
            <Text style={styles.groupLabel}>{g.label}</Text>
            <View style={styles.grid}>
              {ACHIEVEMENTS.filter((a) => a.group === g.id).map((a) => {
                const got = earned.has(a.id);
                return (
                  <View key={a.id} style={styles.tile}>
                    <View style={[styles.badge, got ? styles.badgeOn : styles.badgeOff]}>
                      <Ionicons name={ICON[a.icon] ?? 'ribbon'} size={26} color={got ? colors.session : '#B7B7B2'} />
                      {got ? (
                        <View style={styles.check}>
                          <Ionicons name="checkmark" size={11} color="#fff" />
                        </View>
                      ) : null}
                    </View>
                    <Text style={[styles.tileTitle, !got && styles.tileTitleOff]} numberOfLines={2}>
                      {a.title}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  back: { color: colors.link, fontSize: font.body, fontFamily: fonts.bold },
  title: { color: colors.ink, fontSize: font.h2, fontFamily: fonts.heavy },

  count: { color: colors.muted, fontSize: font.small, fontFamily: fonts.heavy, letterSpacing: 0.5 },
  track: { height: 8, borderRadius: radius.pill, backgroundColor: colors.track, overflow: 'hidden', marginTop: spacing.sm },
  fill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.session },

  group: { marginTop: spacing.xl },
  groupLabel: { color: colors.link, fontSize: font.eyebrow, fontFamily: fonts.heavy, letterSpacing: 1, marginBottom: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  tile: { width: '30%', alignItems: 'center' },
  badge: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },
  badgeOn: { backgroundColor: '#FFEDD5' },
  badgeOff: { backgroundColor: '#F1F1F0' },
  check: {
    position: 'absolute',
    bottom: 0,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.done,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.bg,
  },
  tileTitle: { color: colors.text, fontSize: font.small, fontFamily: fonts.bold, textAlign: 'center', marginTop: spacing.sm },
  tileTitleOff: { color: colors.muted },
});
