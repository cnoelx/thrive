import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, font, radius, spacing } from '@/constants/theme';
import { CATEGORIES, benchmarksFor, formatTarget, isCheckpoint } from '@/data/benchmarks';
import { RUNWAY, completedLevel, isClaimable, lockReason, nextLevel } from '@/engine/progression';
import { useAppStore } from '@/store/useAppStore';

export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const progress = useAppStore((s) => s.progress);
  const profile = useAppStore((s) => s.profile);
  const pullUnlocked = useAppStore((s) => s.pullUnlocked);
  const claimBenchmark = useAppStore((s) => s.claimBenchmark);
  const unclaimBenchmark = useAppStore((s) => s.unclaimBenchmark);

  const category = CATEGORIES.find((cat) => cat.id === id);
  if (!category || !profile) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.body}>Category not found.</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const c = category.id;
  const completed = completedLevel(progress, c);
  const next = nextLevel(progress, c);
  const reason = lockReason(progress, pullUnlocked, c);
  const checkpoint = isCheckpoint(c);

  const benches = reason === 'maxed' || reason === 'noEquipment' ? [] : benchmarksFor(c, next);
  const claimedCount = benches.filter((b) => progress.claimed[b.id]).length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl, gap: spacing.lg }}>
        <View style={styles.titleRow}>
          <View style={[styles.levelBox, completed > 0 && styles.levelBoxOn]}>
            <Text style={[styles.levelBoxText, completed > 0 && styles.levelBoxTextOn]}>L{completed}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{category.short}</Text>
            <Text style={styles.sub}>
              {reason === 'noEquipment'
                ? 'Locked — needs a bar or rings'
                : reason === 'maxed'
                  ? 'All levels complete 🎉'
                  : `Working toward Level ${next} · ${claimedCount}/${benches.length}`}
            </Text>
          </View>
        </View>

        {reason === 'noEquipment' ? (
          <View style={[styles.banner, styles.bannerLock]}>
            <Text style={styles.bannerText}>🔒 Pull needs a bar or rings. Unlock it from the Pull tile on the home screen.</Text>
          </View>
        ) : reason === 'runway' ? (
          <View style={[styles.banner, styles.bannerLock]}>
            <Text style={styles.bannerText}>🔒 Get all areas to Level {next - RUNWAY} to unlock Level {next} here.</Text>
          </View>
        ) : reason === 'maxed' ? (
          <View style={[styles.banner, styles.bannerGood]}>
            <Text style={styles.bannerText}>You&apos;ve completed every level here. Outstanding. 🎉</Text>
          </View>
        ) : (
          <View style={[styles.banner, styles.bannerGood]}>
            <Text style={styles.bannerText}>
              {checkpoint
                ? 'Hold each one with good form to level up.'
                : 'Do each one with good form to level up.'}
            </Text>
          </View>
        )}

        <View style={{ gap: spacing.sm }}>
          {benches.map((b) => {
            const done = !!progress.claimed[b.id];
            const claimable = isClaimable(progress, pullUnlocked, b);
            return (
              <View key={b.id} style={[styles.benchRow, done && styles.benchRowDone]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.benchTitle}>{b.exercise}</Text>
                  <Text style={styles.benchTarget}>Target: {formatTarget(b.target)}</Text>
                  <Text style={styles.benchWhy}>{b.why}</Text>
                </View>
                {done ? (
                  <Pressable onPress={() => unclaimBenchmark(b.id)} hitSlop={8} style={styles.doneCircle}>
                    <Text style={styles.doneTick}>{'✓'}</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={() => claimBenchmark(b.id)}
                    disabled={!claimable}
                    style={[styles.claimBtn, !claimable && styles.claimBtnOff]}
                  >
                    <Text style={[styles.claimText, !claimable && styles.claimTextOff]}>I can do this</Text>
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  back: { color: colors.primary, fontSize: font.body, fontWeight: '700' },

  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  levelBox: { width: 48, height: 48, borderRadius: 12, backgroundColor: colors.track, alignItems: 'center', justifyContent: 'center' },
  levelBoxOn: { backgroundColor: colors.primary },
  levelBoxText: { color: colors.muted, fontSize: font.body, fontWeight: '900' },
  levelBoxTextOn: { color: colors.primaryText },
  title: { color: colors.text, fontSize: font.title, fontWeight: '800' },
  sub: { color: colors.muted, fontSize: font.small, marginTop: 2 },

  banner: { borderRadius: radius.md, padding: spacing.md },
  bannerLock: { backgroundColor: colors.warnBg },
  bannerGood: { backgroundColor: '#EAF7F0' },
  bannerText: { color: colors.text, fontSize: font.small, lineHeight: 19 },

  benchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  benchRowDone: { backgroundColor: '#F3FAF6', borderColor: colors.primary },
  benchTitle: { color: colors.text, fontSize: font.body, fontWeight: '700' },
  benchTarget: { color: colors.text, fontSize: font.small, marginTop: 1 },
  benchWhy: { color: colors.muted, fontSize: font.small, marginTop: 2, fontStyle: 'italic' },
  claimBtn: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  claimBtnOff: { backgroundColor: colors.track },
  claimText: { color: colors.primaryText, fontSize: font.small, fontWeight: '800' },
  claimTextOff: { color: colors.muted },
  doneCircle: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  doneTick: { color: colors.primaryText, fontSize: 15, fontWeight: '900' },

  body: { color: colors.text, fontSize: font.body },
});
