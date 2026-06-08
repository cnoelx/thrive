import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Redirect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, font, radius, spacing } from '@/constants/theme';
import { CATEGORIES, MAX_LEVEL, benchmarksFor } from '@/data/benchmarks';
import { todaysWorkout } from '@/engine/dailyCard';
import { baselineLevel, completedLevel, effectiveCategoryIds, isClaimable, nextLevel } from '@/engine/progression';
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

export default function Home() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const onboarded = useAppStore((s) => s.onboarded);
  const profile = useAppStore((s) => s.profile);
  const progress = useAppStore((s) => s.progress);
  const lastLoggedDay = useAppStore((s) => s.lastLoggedDay);
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

  if (!onboarded || !profile) return <Redirect href="/onboarding" />;

  const activeCats = effectiveCategoryIds(pullUnlocked);
  const overall = baselineLevel(progress, pullUnlocked);
  const nextOverall = Math.min(overall + 1, MAX_LEVEL);
  const atNextCount = activeCats.filter((c) => completedLevel(progress, c) >= nextOverall).length;
  const atMax = overall >= MAX_LEVEL;
  const showCelebration = overall > overallLevelSeen;
  const celebrateBody =
    overall >= MAX_LEVEL
      ? `Every area at Level ${MAX_LEVEL} — you've maxed the program. Outstanding.`
      : overall === 1
        ? `Every area at Level 1. Your baseline is in — the next tier is now in reach everywhere.`
        : `Every area at Level ${overall}. The next tier is now in reach everywhere.`;
  const todayWk = todaysWorkout(progress, pullUnlocked, new Date());
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
      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          paddingTop: insets.top + spacing.lg,
          paddingBottom: insets.bottom + spacing.xl,
          gap: spacing.lg,
        }}
      >
        {/* Greeting + level badge */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            {editingName ? (
              <TextInput
                value={draftName}
                onChangeText={setDraftName}
                placeholder="Your name"
                placeholderTextColor={colors.muted}
                autoFocus
                maxLength={30}
                returnKeyType="done"
                onSubmitEditing={saveName}
                onBlur={saveName}
                style={styles.nameInput}
              />
            ) : (
              <Pressable onPress={startEditName}>
                <Text style={styles.greeting}>{name ? `Hi, ${name} 👋` : 'Welcome 👋'}</Text>
                {name ? null : <Text style={styles.greetingHint}>Tap to add your name</Text>}
              </Pressable>
            )}
          </View>
          <Pressable onPress={() => setLevelsOpen(true)} hitSlop={8} style={styles.levelBadge}>
            <Text style={styles.levelBadgeLabel}>LEVEL</Text>
            <Text style={styles.levelBadgeNum}>{overall}</Text>
          </Pressable>
        </View>

        {/* Today's workout */}
        <View style={styles.todayCard}>
          <Text style={styles.todayEyebrow}>{todayWk.rest ? 'TODAY' : `TODAY · ${todayWk.focus.toUpperCase()}`}</Text>
          <Text style={styles.todayTitle}>{todayWk.rest ? 'Rest day' : `${todayWk.items.length} moves today`}</Text>
          {todayWk.rest ? (
            <Text style={styles.restSub}>Recover well — back at it tomorrow.</Text>
          ) : doneToday ? (
            <View style={styles.doneRow}>
              <Text style={styles.doneText}>✓ Completed today</Text>
            </View>
          ) : (
            <Pressable style={styles.startBtn} onPress={() => router.push('/workout')}>
              <Text style={styles.startText}>{"Start today's workout"}</Text>
            </Pressable>
          )}
        </View>

        {/* Six areas */}
        <View style={{ gap: spacing.sm }}>
          <Text style={styles.sectionLabel}>YOUR AREAS</Text>
          <View style={styles.overallSummary}>
            <Text style={styles.overallSummaryTitle}>Overall · Level {overall}</Text>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${atMax ? 100 : (atNextCount / activeCats.length) * 100}%` }]} />
            </View>
          </View>
          {orderedCats.map((cat) => {
            const locked = cat.id === 'pull' && !pullUnlocked;
            const lvl = completedLevel(progress, cat.id);
            const nextBenches = locked || lvl >= MAX_LEVEL ? [] : benchmarksFor(cat.id, nextLevel(progress, cat.id));
            const ready = nextBenches.some((b) => isClaimable(progress, pullUnlocked, b));
            const claimedNext = nextBenches.filter((b) => progress.claimed[b.id]).length;
            const fillPct = locked ? 0 : lvl >= MAX_LEVEL ? 100 : nextBenches.length ? (claimedNext / nextBenches.length) * 100 : 0;
            return (
              <Pressable
                key={cat.id}
                onPress={() => (locked ? setPullStep('explain') : router.push(`/category/${cat.id}`))}
                style={styles.catRow}
              >
                {fillPct > 0 ? <View style={[styles.tileFill, { width: `${fillPct}%` }]} /> : null}
                <View style={[styles.levelBox, !locked && lvl > 0 && styles.levelBoxOn]}>
                  <Text style={[styles.levelText, !locked && lvl > 0 && styles.levelTextOn]}>{locked ? '🔒' : `L${lvl}`}</Text>
                </View>
                <Text style={styles.catName}>{cat.short}</Text>
                {ready ? (
                  <View style={styles.claimBadge}>
                    <Text style={styles.claimBadgeText}>Level up</Text>
                  </View>
                ) : null}
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Daily reminder */}
        <View style={styles.reminderCard}>
          <View style={styles.reminderHead}>
            <View style={{ flex: 1 }}>
              <Text style={styles.reminderTitle}>Daily reminder</Text>
              <Text style={styles.reminderSub}>A gentle nudge to do today&apos;s workout</Text>
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
                <DateTimePicker
                  value={dateFromHM(reminderHour, reminderMinute)}
                  mode="time"
                  display="compact"
                  onChange={onPickTime}
                />
              </View>
            ) : (
              <Pressable style={styles.timeButton} onPress={openAndroidTimePicker}>
                <Text style={styles.timeButtonText}>{timeLabel(reminderHour, reminderMinute)}</Text>
                <Text style={styles.timeButtonHint}>Change ›</Text>
              </Pressable>
            )
          ) : null}
        </View>

        <View style={styles.devRow}>
          <Pressable onPress={resetAll} style={styles.reset}>
            <Text style={styles.resetText}>Reset (dev)</Text>
          </Pressable>
        </View>
      </ScrollView>

      {showCelebration ? <Celebration overall={overall} body={celebrateBody} onSeen={markOverallLevelSeen} /> : null}

      <Modal visible={pullStep !== 'closed'} transparent animationType="fade" onRequestClose={() => setPullStep('closed')}>
        <Pressable style={styles.overlay} onPress={() => setPullStep('closed')}>
          <Pressable style={styles.pullSheet} onPress={() => {}}>
            {pullStep === 'explain' ? (
              <>
                <Text style={styles.pullEmoji}>🔒</Text>
                <Text style={styles.pullTitle}>Pull is locked</Text>
                <Text style={styles.pullBody}>
                  Pulling needs something to pull on — a bar or rings. Bodyweight alone can&apos;t fake it, so we keep
                  Pull out of your progress until you can train it for real.
                </Text>
                <Text style={styles.pullBody}>Your workouts include Superman for back and posture in the meantime.</Text>
                <Pressable onPress={() => setPullStep('confirm')} style={styles.pullPrimary}>
                  <Text style={styles.pullPrimaryText}>I have a bar or rings</Text>
                </Pressable>
                <Pressable onPress={() => setPullStep('closed')} style={styles.pullSecondary}>
                  <Text style={styles.pullSecondaryText}>Not yet</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.pullTitle}>Unlock Pull?</Text>
                <Text style={styles.pullBody}>
                  Pull starts at Level 1 — you haven&apos;t trained it yet. Your other categories stay exactly as earned,
                  but your overall level will reflect the new starting point.
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
            <Text style={styles.overallEyebrow}>YOUR LEVELS</Text>
            <Text style={styles.overallLevel}>Overall · Level {overall}</Text>
            <Text style={styles.overallSub}>
              {atMax
                ? `Every area at Level ${MAX_LEVEL} — you've maxed the program. 🎉`
                : `The level you've reached in every area. ${atNextCount} of ${activeCats.length} now at Level ${nextOverall} — your overall rises once the lowest catches up.`}
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
                      {locked ? '🔒 Locked' : `Level ${completedLevel(progress, cat.id)}`}
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

// Level-up celebration: a real Modal (so Back dismisses it, never under system UI) that fades +
// pops in, then auto-closes after a beat. Tap anywhere or Back also closes it early.
function Celebration({ overall, body, onSeen }: { overall: number; body: string; onSeen: (n: number) => void }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;
  const done = useRef(false);

  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => onSeen(overall));
  }, [opacity, onSeen, overall]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
    ]).start();
    const t = setTimeout(finish, 2600);
    return () => clearTimeout(t);
  }, [finish, scale]);

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={finish}>
      <Animated.View style={[styles.overlay, { opacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={finish} />
        <Animated.View style={[styles.celebrate, { transform: [{ scale }] }]} pointerEvents="none">
          <Text style={styles.celebrateEmoji}>🎉</Text>
          <Text style={styles.celebrateTitle}>Level {overall} reached</Text>
          <Text style={styles.celebrateBody}>{body}</Text>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  todayCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, gap: spacing.xs },
  todayEyebrow: { color: colors.primary, fontSize: font.eyebrow, fontWeight: '800', letterSpacing: 1.5 },
  todayTitle: { color: colors.ink, fontSize: font.h2, fontWeight: '800', marginTop: 2 },
  restSub: { color: colors.muted, fontSize: font.small, marginTop: 4 },
  startBtn: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingVertical: spacing.md + 2, alignItems: 'center', marginTop: spacing.md },
  startText: { color: colors.primaryText, fontSize: font.body, fontWeight: '800' },
  doneRow: { backgroundColor: '#EAF7F0', borderRadius: radius.pill, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.md },
  doneText: { color: colors.primary, fontSize: font.body, fontWeight: '800' },

  greeting: { color: colors.ink, fontSize: font.h2, fontWeight: '800' },
  greetingHint: { color: colors.muted, fontSize: font.small, marginTop: 2 },
  nameInput: { color: colors.ink, fontSize: font.h2, fontWeight: '800', borderBottomWidth: 2, borderBottomColor: colors.primary, paddingVertical: spacing.xs },
  overallEyebrow: { color: colors.muted, fontSize: font.eyebrow, fontWeight: '800', letterSpacing: 1.5 },
  overallLevel: { color: colors.ink, fontSize: font.title, fontWeight: '900' },
  overallSub: { color: colors.muted, fontSize: font.small, marginTop: 2 },
  barTrack: { height: 10, backgroundColor: colors.track, borderRadius: radius.pill, overflow: 'hidden', marginTop: 2 },
  barFill: { height: 10, backgroundColor: colors.primary, borderRadius: radius.pill },

  sectionLabel: { color: colors.muted, fontSize: font.eyebrow, fontWeight: '800', letterSpacing: 1.5, marginBottom: spacing.xs },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  tileFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: 'rgba(22,163,74,0.12)' },
  levelBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.track, alignItems: 'center', justifyContent: 'center' },
  levelBoxOn: { backgroundColor: colors.primary },
  levelText: { color: colors.muted, fontSize: font.small, fontWeight: '900' },
  levelTextOn: { color: colors.primaryText },
  catName: { color: colors.text, fontSize: font.body, fontWeight: '700', flex: 1 },
  claimBadge: { backgroundColor: '#EAF7F0', borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  claimBadgeText: { color: colors.primary, fontSize: 11, fontWeight: '800' },
  chevron: { color: colors.muted, fontSize: 22 },

  overallSummary: { gap: spacing.xs, marginBottom: spacing.xs },
  overallSummaryTitle: { color: colors.ink, fontSize: font.body, fontWeight: '900' },

  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  levelBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  levelBadgeLabel: { color: colors.primaryText, fontSize: font.small, fontWeight: '800', letterSpacing: 0.5, opacity: 0.9 },
  levelBadgeNum: { color: colors.primaryText, fontSize: font.h2, fontWeight: '900' },
  levelsSheet: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.sm, width: '100%', maxWidth: 420 },
  levelsList: { marginTop: spacing.sm },
  levelsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  levelsCat: { color: colors.text, fontSize: font.body, fontWeight: '700' },
  levelsVal: { color: colors.primary, fontSize: font.body, fontWeight: '800' },
  levelsValLocked: { color: colors.muted },

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

  devRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.lg, paddingTop: spacing.sm },
  reset: { alignItems: 'center', paddingVertical: spacing.sm },
  resetText: { color: colors.muted, fontSize: font.small, textDecorationLine: 'underline' },

  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(12,20,16,0.5)', alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  celebrate: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, alignItems: 'center', gap: spacing.md },
  celebrateEmoji: { fontSize: 56 },
  celebrateTitle: { color: colors.ink, fontSize: font.title, fontWeight: '800', textAlign: 'center' },
  celebrateBody: { color: colors.muted, fontSize: font.body, lineHeight: 22, textAlign: 'center' },

  pullSheet: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.sm, width: '100%', maxWidth: 420, alignItems: 'center' },
  pullEmoji: { fontSize: 44 },
  pullTitle: { color: colors.ink, fontSize: font.title, fontWeight: '800', textAlign: 'center' },
  pullBody: { color: colors.muted, fontSize: font.body, lineHeight: 22, textAlign: 'center' },
  pullPrimary: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingVertical: spacing.md, paddingHorizontal: spacing.xl, alignItems: 'center', marginTop: spacing.sm, alignSelf: 'stretch' },
  pullPrimaryText: { color: colors.primaryText, fontSize: font.body, fontWeight: '800' },
  pullSecondary: { paddingVertical: spacing.sm, alignItems: 'center', alignSelf: 'stretch' },
  pullSecondaryText: { color: colors.muted, fontSize: font.body, fontWeight: '700' },
});
