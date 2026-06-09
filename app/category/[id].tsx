import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Celebration } from '@/components/Celebration';
import { colors, font, radius, spacing } from '@/constants/theme';
import { CATEGORIES, EXERCISE_BY_KEY, benchmarksFor, categoryCeiling, formatTarget, isCheckpoint } from '@/data/benchmarks';
import { RUNWAY, completedLevel, isClaimable, levelCap, lockReason } from '@/engine/progression';
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
  // Which level the screen shows. Starts at the level you're working on and only ever moves FORWARD,
  // via the "Start Level N" button once the current level is complete — there's no going back to old
  // levels. It's NOT auto-advanced on the final claim, so a just-completed level stays on screen and
  // its ✓ can be tapped to undo before you move on.
  const initialWorking = category ? Math.min(completedLevel(progress, category.id) + 1, categoryCeiling(category.id)) : 1;
  const [viewLevel, setViewLevel] = useState(initialWorking);
  const [celebrateLevel, setCelebrateLevel] = useState<number | null>(null);

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
  const ceiling = categoryCeiling(c);
  const workingLevel = Math.min(completed + 1, ceiling);
  const reason = lockReason(progress, pullUnlocked, c);
  const checkpoint = isCheckpoint(c);

  const vLevel = reason === 'noEquipment' ? 1 : Math.min(Math.max(viewLevel, 1), workingLevel);
  const benches = reason === 'noEquipment' ? [] : benchmarksFor(c, vLevel);
  const claimedCount = benches.filter((b) => progress.claimed[b.id]).length;
  const levelDone = benches.length > 0 && claimedCount === benches.length;
  const runwayLocked = reason === 'runway' && vLevel >= workingLevel;
  const nextLevelUnlocked = vLevel < ceiling && vLevel + 1 <= levelCap(progress, pullUnlocked);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl, gap: spacing.lg }}>
        <View style={styles.titleRow}>
          <View style={[styles.levelBox, levelDone && styles.levelBoxOn]}>
            <Text style={[styles.levelBoxText, levelDone && styles.levelBoxTextOn]}>L{vLevel}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{category.short}</Text>
            <Text style={styles.sub}>
              {reason === 'noEquipment'
                ? 'Locked — needs a bar or rings'
                : runwayLocked
                  ? 'Locked for now'
                  : levelDone
                    ? `Level ${vLevel} complete ✓`
                    : `Level ${vLevel}`}
            </Text>
          </View>
        </View>

        {reason !== 'noEquipment' && benches.length > 0 ? (
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${(claimedCount / benches.length) * 100}%` }]} />
          </View>
        ) : null}

        {reason === 'noEquipment' ? (
          <View style={[styles.banner, styles.bannerLock]}>
            <Text style={styles.bannerText}>🔒 Pull needs a bar or rings. You can unlock it from the Pull tile on the home screen.</Text>
          </View>
        ) : runwayLocked ? (
          <View style={[styles.banner, styles.bannerLock]}>
            <Text style={styles.bannerText}>🔒 Get every area to Level {vLevel - RUNWAY} to unlock Level {vLevel} here.</Text>
          </View>
        ) : levelDone ? (
          <View style={[styles.banner, styles.bannerGood]}>
            <Text style={styles.bannerText}>
              {vLevel >= ceiling
                ? "You've finished every level here. Amazing work. 🎉"
                : `Nice — all checked off! Tap Unlock below — or tap a ✓ to undo.`}
            </Text>
          </View>
        ) : (
          <View style={[styles.banner, styles.bannerGood]}>
            <Text style={styles.bannerText}>
              {checkpoint ? "Hold each one with good form and you'll level up." : "Do each one with good form — that's your level up."}
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
                  <Text style={styles.benchTarget}>{EXERCISE_BY_KEY[b.exKey]?.check ? 'Check:' : 'Target:'} {formatTarget(b.target)}</Text>
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

        {reason === 'none' && vLevel < ceiling ? (
          nextLevelUnlocked ? (
            <Pressable
              onPress={() => setCelebrateLevel(vLevel)}
              disabled={!levelDone}
              style={[styles.advanceBtn, !levelDone && styles.advanceBtnOff]}
            >
              <Text style={[styles.advanceText, !levelDone && styles.advanceTextOff]}>Unlock Level {vLevel + 1} →</Text>
            </Pressable>
          ) : (
            <View style={[styles.banner, styles.bannerLock]}>
              <Text style={styles.bannerText}>🔒 Level {vLevel + 1} unlocks once every area reaches Level {vLevel + 1 - RUNWAY}.</Text>
            </View>
          )
        ) : null}
      </ScrollView>

      {celebrateLevel !== null ? (
        <Celebration
          title={`Level ${celebrateLevel + 1} unlocked!`}
          body={`${category.short}: Level ${celebrateLevel} complete — time for Level ${celebrateLevel + 1}!`}
          onDone={() => {
            setViewLevel(celebrateLevel + 1);
            setCelebrateLevel(null);
          }}
        />
      ) : null}
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
  title: { color: colors.ink, fontSize: font.title, fontWeight: '800' },
  sub: { color: colors.muted, fontSize: font.small, marginTop: 2 },
  progressTrack: { height: 8, backgroundColor: colors.track, borderRadius: radius.pill, overflow: 'hidden' },
  progressFill: { height: 8, backgroundColor: colors.primary, borderRadius: radius.pill },

  advanceBtn: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingVertical: spacing.md + 2, alignItems: 'center' },
  advanceBtnOff: { backgroundColor: colors.track },
  advanceText: { color: colors.primaryText, fontSize: font.body, fontWeight: '800' },
  advanceTextOff: { color: colors.muted },

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
