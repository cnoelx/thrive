import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Celebration } from '@/components/Celebration';
import { colors, font, radius, spacing } from '@/constants/theme';
import { CATEGORIES, MAX_LEVEL, benchmarksFor, categoryCeiling } from '@/data/benchmarks';
import { todaysWorkout } from '@/engine/dailyCard';
import { baselineLevel, completedLevel, effectiveCategoryIds, nextLevel } from '@/engine/progression';
import { currentStreak, pendingStreakMilestone } from '@/engine/streak';
import { cancelReminders, requestNotificationPermission, scheduleDailyReminder } from '@/lib/notifications';
import { useAppStore } from '@/store/useAppStore';

function todayNumber(): number {
  const now = new Date();
  return Math.floor((now.getTime() - now.getTimezoneOffset() * 60000) / 86400000);
}

function timeLabel(h: number, m: number): string {
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}
function dateFromHM(h: number, m: number): Date {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

// Friendly streak line — a few variations, picked deterministically by streak length so it's stable
// for a given value but varies as the streak grows.
const STREAK_MESSAGES: ((n: number) => string)[] = [
  (n) => `🔥 You're on a ${n}-day streak — awesome!`,
  (n) => `🔥 ${n} days in a row. You're on fire!`,
  (n) => `🔥 ${n}-day streak — keep it rolling!`,
  (n) => `🔥 ${n} days straight. Look at you go!`,
  (n) => `🔥 ${n}-day streak. Unstoppable!`,
];

export default function Home() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const onboarded = useAppStore((s) => s.onboarded);
  const profile = useAppStore((s) => s.profile);
  const progress = useAppStore((s) => s.progress);
  const lastLoggedDay = useAppStore((s) => s.lastLoggedDay);
  const streak = useAppStore((s) => s.streak);
  const streakMilestoneSeen = useAppStore((s) => s.streakMilestoneSeen);
  const markStreakMilestoneSeen = useAppStore((s) => s.markStreakMilestoneSeen);
  const overallLevelSeen = useAppStore((s) => s.overallLevelSeen);
  const markOverallLevelSeen = useAppStore((s) => s.markOverallLevelSeen);
  const reminderEnabled = useAppStore((s) => s.reminderEnabled);
  const reminderHour = useAppStore((s) => s.reminderHour);
  const reminderMinute = useAppStore((s) => s.reminderMinute);
  const setReminder = useAppStore((s) => s.setReminder);
  const resetAll = useAppStore((s) => s.resetAll);
  const name = useAppStore((s) => s.name);
  const setName = useAppStore((s) => s.setName);
  const pullUnlocked = useAppStore((s) => s.pullUnlocked);
  const unlockPull = useAppStore((s) => s.unlockPull);
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [pullStep, setPullStep] = useState<'closed' | 'explain' | 'confirm'>('closed');
  const [levelsOpen, setLevelsOpen] = useState(false);

  const day = todayNumber();
  const doneToday = lastLoggedDay === day;
  const streakNow = currentStreak(streak, lastLoggedDay, day);
  const streakMilestone = pendingStreakMilestone(streakNow, streakMilestoneSeen);

  if (!onboarded || !profile) return <Redirect href="/onboarding" />;

  const activeCats = effectiveCategoryIds(pullUnlocked);
  const overall = baselineLevel(progress, pullUnlocked);
  const nextOverall = Math.min(overall + 1, MAX_LEVEL);
  const atNextCount = activeCats.filter((c) => completedLevel(progress, c) >= nextOverall).length;
  const atMax = overall >= MAX_LEVEL;
  const overallPct = atMax ? 100 : (atNextCount / activeCats.length) * 100;
  const showCelebration = overall > overallLevelSeen;
  const celebrateBody =
    overall >= MAX_LEVEL
      ? `You've maxed out every area — the whole program's done. Outstanding work. 👏`
      : overall === 1
        ? `Every area's at Level 1 — your foundation's set. The next tier's within reach everywhere now.`
        : `Every area's at Level ${overall} — the next tier's within reach everywhere. Keep going!`;
  const todayWk = todaysWorkout(progress, pullUnlocked, new Date());
  const movePreview = todayWk.rest ? '' : `${todayWk.items.length} moves`;
  // A locked Pull sinks to the bottom of the areas list (stable sort keeps the rest in order).
  const orderedCats = [...CATEGORIES].sort(
    (a, b) => Number(a.id === 'pull' && !pullUnlocked) - Number(b.id === 'pull' && !pullUnlocked),
  );

  const toggleReminder = async (value: boolean) => {
    if (value) {
      const ok = await requestNotificationPermission();
      if (!ok) {
        Alert.alert('Notifications are off', 'Allow notifications for Thrive in your phone settings to get reminders.');
        return;
      }
      await scheduleDailyReminder(reminderHour, reminderMinute);
      setReminder(true, reminderHour, reminderMinute);
    } else {
      await cancelReminders();
      setReminder(false, reminderHour, reminderMinute);
    }
  };

  const changeReminder = async (hour: number, minute: number) => {
    setReminder(true, hour, minute);
    await scheduleDailyReminder(hour, minute);
  };

  const onPickTime = (event: DateTimePickerEvent, selected?: Date) => {
    if (event.type === 'set' && selected) changeReminder(selected.getHours(), selected.getMinutes());
  };

  const openAndroidTimePicker = () => {
    DateTimePickerAndroid.open({
      value: dateFromHM(reminderHour, reminderMinute),
      onChange: onPickTime,
      mode: 'time',
      is24Hour: false,
    });
  };

  const startEditName = () => {
    setDraftName(name);
    setEditingName(true);
  };
  const saveName = () => {
    setName(draftName.trim());
    setEditingName(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + spacing.xl }}>
        {/* Dark hero — greeting, streak, overall level */}
        <View style={styles.hero}>
          {editingName ? (
            <TextInput
              value={draftName}
              onChangeText={setDraftName}
              placeholder="Your name"
              placeholderTextColor={colors.onInkMuted}
              autoFocus
              maxLength={30}
              returnKeyType="done"
              onSubmitEditing={saveName}
              onBlur={saveName}
              style={styles.heroNameInput}
            />
          ) : (
            <Pressable onPress={startEditName}>
              <Text style={styles.heroGreeting}>{name ? `Hi, ${name} 👋` : 'Hi there 👋'}</Text>
              {name ? null : <Text style={styles.heroGreetingHint}>Tap to tell us your name</Text>}
            </Pressable>
          )}

          {streakNow >= 2 ? (
            <Text style={styles.heroStreak}>{STREAK_MESSAGES[streakNow % STREAK_MESSAGES.length](streakNow)}</Text>
          ) : null}

          <Pressable onPress={() => setLevelsOpen(true)} style={styles.heroOverall}>
            <Text style={styles.heroOverallEyebrow}>OVERALL</Text>
            <Text style={styles.heroLevel}>Level {overall}</Text>
            <View style={styles.heroBarTrack}>
              <View style={[styles.heroBarFill, { width: `${overallPct}%` }]} />
            </View>
          </Pressable>
        </View>

        <View style={styles.content}>
          {/* Today */}
          {todayWk.rest ? (
            <View style={styles.restCard}>
              <Text style={styles.restEyebrow}>TODAY</Text>
              <Text style={styles.restTitle}>Rest day</Text>
              <Text style={styles.restSub}>Take it easy today — you&apos;ve earned it.</Text>
            </View>
          ) : (
            <View style={styles.todayHero}>
              <Text style={styles.todayHeroEyebrow}>TODAY&apos;S WORKOUT</Text>
              <Text style={styles.todayHeroTitle}>{todayWk.focus}</Text>
              <Text style={styles.todayHeroSub}>{movePreview}</Text>
              {doneToday ? (
                <View style={styles.todayDonePill}>
                  <Text style={styles.todayDoneText}>✓ Done for today</Text>
                </View>
              ) : (
                <Pressable style={styles.todayHeroBtn} onPress={() => router.push('/workout')}>
                  <Text style={styles.todayHeroBtnText}>Start workout →</Text>
                </Pressable>
              )}
            </View>
          )}

          {/* Training areas — one grouped card, per-row progress */}
          <View style={[styles.groupCard, styles.sectionGap]}>
            {orderedCats.map((cat, i) => {
              const locked = cat.id === 'pull' && !pullUnlocked;
              const lvl = completedLevel(progress, cat.id);
              const maxed = !locked && lvl >= categoryCeiling(cat.id);
              const nextBenches = locked || maxed ? [] : benchmarksFor(cat.id, nextLevel(progress, cat.id));
              const claimedNext = nextBenches.filter((b) => progress.claimed[b.id]).length;
              const fillPct = nextBenches.length ? (claimedNext / nextBenches.length) * 100 : 0;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => (locked ? setPullStep('explain') : router.push(`/category/${cat.id}`))}
                  style={[styles.areaRow, i > 0 && styles.areaRowDivider]}
                >
                  <View style={[styles.levelBox, !locked && lvl > 0 && styles.levelBoxOn]}>
                    <Text style={[styles.levelText, !locked && lvl > 0 && styles.levelTextOn]}>{locked ? '🔒' : `L${lvl}`}</Text>
                  </View>
                  <View style={{ flex: 1, gap: 7 }}>
                    <Text style={styles.areaName}>{cat.short}</Text>
                    {locked ? (
                      <Text style={styles.areaLockHint}>Tap to unlock</Text>
                    ) : maxed ? (
                      <Text style={styles.areaMaxedHint}>Maxed out ✓</Text>
                    ) : (
                      <View style={styles.rowBarTrack}>
                        <View style={[styles.rowBarFill, { width: `${fillPct}%` }]} />
                      </View>
                    )}
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Daily reminder */}
          <View style={[styles.reminderCard, styles.sectionGap]}>
            <View style={styles.reminderHead}>
              <View style={{ flex: 1 }}>
                <Text style={styles.reminderTitle}>Daily reminder</Text>
                <Text style={styles.reminderSub}>Pick a time and we&apos;ll remind you each day</Text>
              </View>
              <Switch
                value={reminderEnabled}
                onValueChange={toggleReminder}
                trackColor={{ true: colors.primary, false: colors.track }}
                thumbColor="#ffffff"
              />
            </View>
            {reminderEnabled ? (
              Platform.OS === 'ios' ? (
                <View style={styles.timeButton}>
                  <Text style={styles.timeButtonText}>Remind me at</Text>
                  <DateTimePicker value={dateFromHM(reminderHour, reminderMinute)} mode="time" display="compact" onChange={onPickTime} />
                </View>
              ) : (
                <Pressable style={styles.timeButton} onPress={openAndroidTimePicker}>
                  <Text style={styles.timeButtonText}>{timeLabel(reminderHour, reminderMinute)}</Text>
                  <Text style={styles.timeButtonHint}>Change ›</Text>
                </Pressable>
              )
            ) : null}
          </View>

          {__DEV__ ? (
            <View style={styles.devRow}>
              <Pressable onPress={resetAll} style={styles.reset}>
                <Text style={styles.resetText}>Reset (dev)</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {showCelebration ? (
        <Celebration title={`You hit Level ${overall}!`} body={celebrateBody} onDone={() => markOverallLevelSeen(overall)} />
      ) : null}

      {!showCelebration && streakMilestone ? (
        <Celebration
          title={`🔥 ${streakMilestone}-day streak!`}
          body={`${streakMilestone} workouts in a row — keep the fire going!`}
          onDone={() => markStreakMilestoneSeen(streakMilestone)}
        />
      ) : null}

      <Modal visible={pullStep !== 'closed'} transparent animationType="fade" onRequestClose={() => setPullStep('closed')}>
        <Pressable style={styles.overlay} onPress={() => setPullStep('closed')}>
          <Pressable style={styles.pullSheet} onPress={() => {}}>
            {pullStep === 'explain' ? (
              <>
                <Text style={styles.pullEmoji}>🔒</Text>
                <Text style={styles.pullTitle}>Pull&apos;s locked for now</Text>
                <Text style={styles.pullBody}>
                  Pulling needs something to pull on — a bar or rings. There&apos;s no faking it with bodyweight, so
                  we&apos;ll leave Pull out of your progress until you can train it properly.
                </Text>
                <Text style={styles.pullBody}>In the meantime, your workouts include Superman to look after your back and posture.</Text>
                <Pressable onPress={() => setPullStep('confirm')} style={styles.pullPrimary}>
                  <Text style={styles.pullPrimaryText}>I&apos;ve got a bar or rings</Text>
                </Pressable>
                <Pressable onPress={() => setPullStep('closed')} style={styles.pullSecondary}>
                  <Text style={styles.pullSecondaryText}>Not yet</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.pullTitle}>Unlock Pull?</Text>
                <Text style={styles.pullBody}>
                  Pull starts at Level 1 — you haven&apos;t trained it yet. Everything else stays exactly as you earned
                  it, but your overall level will reflect the new starting point.
                </Text>
                <Pressable
                  onPress={() => {
                    unlockPull();
                    setPullStep('closed');
                  }}
                  style={styles.pullPrimary}
                >
                  <Text style={styles.pullPrimaryText}>Unlock Pull</Text>
                </Pressable>
                <Pressable onPress={() => setPullStep('explain')} style={styles.pullSecondary}>
                  <Text style={styles.pullSecondaryText}>Back</Text>
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={levelsOpen} transparent animationType="fade" onRequestClose={() => setLevelsOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setLevelsOpen(false)}>
          <Pressable style={styles.levelsSheet} onPress={() => {}}>
            <Text style={styles.overallEyebrow}>WHERE YOU&apos;RE AT</Text>
            <Text style={styles.overallLevel}>Overall · Level {overall}</Text>
            <Text style={styles.overallSub}>
              {atMax
                ? `Every area maxed out — you've finished the whole program. 🎉`
                : `The level you've hit across the board. ${atNextCount} of ${activeCats.length} areas are at Level ${nextOverall} now — your overall goes up once the rest catch up.`}
            </Text>
            {!atMax ? (
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${(atNextCount / activeCats.length) * 100}%` }]} />
              </View>
            ) : null}
            <View style={styles.levelsList}>
              {orderedCats.map((cat) => {
                const locked = cat.id === 'pull' && !pullUnlocked;
                return (
                  <View key={cat.id} style={styles.levelsRow}>
                    <Text style={styles.levelsCat}>{cat.short}</Text>
                    <Text style={[styles.levelsVal, locked && styles.levelsValLocked]}>
                      {locked
                        ? '🔒 Locked'
                        : completedLevel(progress, cat.id) >= categoryCeiling(cat.id)
                          ? `Level ${completedLevel(progress, cat.id)} · Maxed`
                          : `Level ${completedLevel(progress, cat.id)}`}
                    </Text>
                  </View>
                );
              })}
            </View>
            <Pressable onPress={() => setLevelsOpen(false)} style={styles.pullPrimary}>
              <Text style={styles.pullPrimaryText}>Got it</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const SECTION_GAP = spacing.xl + spacing.xs; // ~28: breathe between sections

const styles = StyleSheet.create({
  // Dark hero
  hero: { backgroundColor: colors.inkCard, paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxl },
  heroGreeting: { color: colors.primaryText, fontSize: 24, fontWeight: '900' },
  heroGreetingHint: { color: colors.onInkMuted, fontSize: font.small, marginTop: 2 },
  heroNameInput: { color: colors.primaryText, fontSize: 24, fontWeight: '900', borderBottomWidth: 2, borderBottomColor: colors.accent, paddingVertical: spacing.xs },
  heroStreak: { color: colors.streakInk, fontSize: font.body, fontWeight: '800', marginTop: spacing.md },
  heroOverall: { marginTop: spacing.xl + spacing.xs },
  heroOverallEyebrow: { color: colors.onInkMuted, fontSize: font.eyebrow, fontWeight: '800', letterSpacing: 1.5 },
  heroLevel: { color: colors.primaryText, fontSize: font.h2, fontWeight: '900', marginTop: spacing.xs },
  heroBarTrack: { height: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: radius.pill, overflow: 'hidden', marginTop: spacing.md },
  heroBarFill: { height: 8, backgroundColor: colors.accent, borderRadius: radius.pill },

  content: { padding: spacing.lg },
  sectionGap: { marginTop: SECTION_GAP },

  // Today — green action hero
  todayHero: { backgroundColor: colors.primary, borderRadius: radius.lg, padding: spacing.xl },
  todayHeroEyebrow: { color: 'rgba(255,255,255,0.85)', fontSize: font.eyebrow, fontWeight: '800', letterSpacing: 1 },
  todayHeroTitle: { color: colors.primaryText, fontSize: font.title, fontWeight: '900', marginTop: spacing.xs },
  todayHeroSub: { color: 'rgba(255,255,255,0.85)', fontSize: font.small, marginTop: spacing.xs },
  todayHeroBtn: { backgroundColor: colors.surface, borderRadius: radius.pill, paddingVertical: spacing.md + 2, alignItems: 'center', marginTop: spacing.lg },
  todayHeroBtnText: { color: colors.primary, fontSize: font.body, fontWeight: '800' },
  todayDonePill: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: radius.pill, paddingVertical: spacing.md + 2, alignItems: 'center', marginTop: spacing.lg },
  todayDoneText: { color: colors.primaryText, fontSize: font.body, fontWeight: '800' },

  // Today — rest day (calm, not green)
  restCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, gap: spacing.xs },
  restEyebrow: { color: colors.primary, fontSize: font.eyebrow, fontWeight: '800', letterSpacing: 1 },
  restTitle: { color: colors.ink, fontSize: font.h2, fontWeight: '800', marginTop: 2 },
  restSub: { color: colors.muted, fontSize: font.small, marginTop: 4 },

  // Areas grouped card
  groupCard: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md },
  areaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  areaRowDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  levelBox: { width: 38, height: 38, borderRadius: 10, backgroundColor: colors.track, alignItems: 'center', justifyContent: 'center' },
  levelBoxOn: { backgroundColor: colors.primary },
  levelText: { color: colors.muted, fontSize: font.small, fontWeight: '900' },
  levelTextOn: { color: colors.primaryText },
  areaName: { color: colors.text, fontSize: font.body, fontWeight: '700' },
  areaLockHint: { color: colors.muted, fontSize: font.small },
  areaMaxedHint: { color: colors.primary, fontSize: font.small, fontWeight: '700' },
  rowBarTrack: { height: 6, backgroundColor: colors.track, borderRadius: radius.pill, overflow: 'hidden' },
  rowBarFill: { height: 6, backgroundColor: colors.primary, borderRadius: radius.pill },
  chevron: { color: colors.muted, fontSize: 22 },

  // Reminder
  reminderCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, gap: spacing.md },
  reminderHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  reminderTitle: { color: colors.text, fontSize: font.body, fontWeight: '800' },
  reminderSub: { color: colors.muted, fontSize: font.small, marginTop: 1 },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  timeButtonText: { color: colors.text, fontSize: font.body, fontWeight: '800' },
  timeButtonHint: { color: colors.primary, fontSize: font.small, fontWeight: '700' },

  devRow: { flexDirection: 'row', justifyContent: 'center', paddingTop: spacing.lg },
  reset: { alignItems: 'center', paddingVertical: spacing.sm },
  resetText: { color: colors.muted, fontSize: font.small, textDecorationLine: 'underline' },

  // Modals / sheets
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(12,20,16,0.5)', alignItems: 'center', justifyContent: 'center', padding: spacing.xl },

  overallEyebrow: { color: colors.muted, fontSize: font.eyebrow, fontWeight: '800', letterSpacing: 1.5 },
  overallLevel: { color: colors.ink, fontSize: font.title, fontWeight: '900' },
  overallSub: { color: colors.muted, fontSize: font.small, marginTop: 2 },
  barTrack: { height: 10, backgroundColor: colors.track, borderRadius: radius.pill, overflow: 'hidden', marginTop: 2 },
  barFill: { height: 10, backgroundColor: colors.primary, borderRadius: radius.pill },

  levelsSheet: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.sm, width: '100%', maxWidth: 420 },
  levelsList: { marginTop: spacing.sm },
  levelsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  levelsCat: { color: colors.text, fontSize: font.body, fontWeight: '700' },
  levelsVal: { color: colors.primary, fontSize: font.body, fontWeight: '800' },
  levelsValLocked: { color: colors.muted },

  pullSheet: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.sm, width: '100%', maxWidth: 420, alignItems: 'center' },
  pullEmoji: { fontSize: 44 },
  pullTitle: { color: colors.ink, fontSize: font.title, fontWeight: '800', textAlign: 'center' },
  pullBody: { color: colors.muted, fontSize: font.body, lineHeight: 22, textAlign: 'center' },
  pullPrimary: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingVertical: spacing.md, paddingHorizontal: spacing.xl, alignItems: 'center', marginTop: spacing.sm, alignSelf: 'stretch' },
  pullPrimaryText: { color: colors.primaryText, fontSize: font.body, fontWeight: '800' },
  pullSecondary: { paddingVertical: spacing.sm, alignItems: 'center', alignSelf: 'stretch' },
  pullSecondaryText: { color: colors.muted, fontSize: font.body, fontWeight: '700' },
});
