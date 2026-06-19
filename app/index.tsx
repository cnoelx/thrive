import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Redirect, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Celebration } from '@/components/Celebration';
import { categoryColors, colors, font, fonts, radius, spacing } from '@/constants/theme';
import { CATEGORIES, MAX_LEVEL, benchmarksFor, categoryCeiling } from '@/data/benchmarks';
import { WHATS_NEW } from '@/data/whatsNew';
import { achievementContext, unlockedIds } from '@/engine/achievements';
import { todaysWorkout, workoutForDay } from '@/engine/dailyCard';
import { DAY_KEYS } from '@/data/schedule';
import { dateOfDayNumber, weekDays } from '@/engine/history';
import { baselineLevel, completedLevel, effectiveCategoryIds, nextLevel } from '@/engine/progression';
import { currentStreak, isRestDay, pendingStreakMilestone } from '@/engine/streak';
import { refreshReminders, requestNotificationPermission } from '@/lib/notifications';
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
  const loggedDays = useAppStore((s) => s.loggedDays);
  const achievementsSeen = useAppStore((s) => s.achievementsSeen);
  const streakMilestoneSeen = useAppStore((s) => s.streakMilestoneSeen);
  const markStreakMilestoneSeen = useAppStore((s) => s.markStreakMilestoneSeen);
  const whatsNewSeen = useAppStore((s) => s.whatsNewSeen);
  const markWhatsNewSeen = useAppStore((s) => s.markWhatsNewSeen);
  const overallLevelSeen = useAppStore((s) => s.overallLevelSeen);
  const markOverallLevelSeen = useAppStore((s) => s.markOverallLevelSeen);
  const reminderEnabled = useAppStore((s) => s.reminderEnabled);
  const reminderPrompted = useAppStore((s) => s.reminderPrompted);
  const markReminderPrompted = useAppStore((s) => s.markReminderPrompted);
  const reminderCustomTime = useAppStore((s) => s.reminderCustomTime);
  const setReminderCustomTime = useAppStore((s) => s.setReminderCustomTime);
  const reminderHour = useAppStore((s) => s.reminderHour);
  const reminderMinute = useAppStore((s) => s.reminderMinute);
  const setReminder = useAppStore((s) => s.setReminder);
  const setReminderEnabled = useAppStore((s) => s.setReminderEnabled);
  const name = useAppStore((s) => s.name);
  const pullUnlocked = useAppStore((s) => s.pullUnlocked);
  const unlockPull = useAppStore((s) => s.unlockPull);
  const [pullStep, setPullStep] = useState<'closed' | 'explain' | 'confirm'>('closed');
  const [levelsOpen, setLevelsOpen] = useState(false);

  const day = todayNumber();
  const doneToday = lastLoggedDay === day;
  const streakNow = currentStreak(streak, lastLoggedDay, day);
  const streakMilestone = pendingStreakMilestone(streakNow, streakMilestoneSeen);

  const lapsed = streakNow === 0 && lastLoggedDay !== null;
  const hasUnseenAch = unlockedIds(achievementContext({ progress })).some((id) => !achievementsSeen.includes(id));
  // Perfect week = every scheduled (non-rest) day of the current week is logged.
  const weekScheduled = weekDays(day).filter((d) => !isRestDay(d));
  const perfectWeek = weekScheduled.length > 0 && weekScheduled.every((d) => loggedDays.includes(d));

  // Ask for notification permission once, on first app open after onboarding. Granting defaults the
  // reminders on; the effect below then schedules them.
  useEffect(() => {
    if (!onboarded || reminderPrompted) return;
    (async () => {
      const ok = await requestNotificationPermission();
      markReminderPrompted();
      if (ok) setReminderEnabled(true); // turns on the default morning/evening nudges
    })();
  }, [onboarded, reminderPrompted, markReminderPrompted, setReminderEnabled]);

  // Keep the week's reminders fresh on every visit and after each completed workout — the queue
  // re-lays from current state, so completed and rest days fall silent and lapses escalate.
  useEffect(() => {
    if (!onboarded) return;
    refreshReminders({
      lastLoggedDay,
      lapsed,
      enabled: reminderEnabled,
      customTime: reminderCustomTime ? { hour: reminderHour, minute: reminderMinute } : null,
    });
  }, [onboarded, reminderEnabled, reminderCustomTime, reminderHour, reminderMinute, lastLoggedDay, lapsed]);

  if (!onboarded || !profile) return <Redirect href="/onboarding" />;

  const activeCats = effectiveCategoryIds(pullUnlocked);
  const overall = baselineLevel(progress, pullUnlocked);
  const nextOverall = Math.min(overall + 1, MAX_LEVEL);
  const atNextCount = activeCats.filter((c) => completedLevel(progress, c) >= nextOverall).length;
  const atMax = overall >= MAX_LEVEL;
  const overallPct = atMax ? 100 : (atNextCount / activeCats.length) * 100;
  const showCelebration = overall > overallLevelSeen;
  const showWhatsNew = WHATS_NEW.version > whatsNewSeen;
  const celebrateBody =
    overall >= MAX_LEVEL
      ? `You've maxed out every area — the whole program's done. Outstanding work. 👏`
      : overall === 1
        ? `Every area's at Level 1 — your foundation's set. The next tier's within reach everywhere now.`
        : `Every area's at Level ${overall} — the next tier's within reach everywhere. Keep going!`;
  const todayWk = todaysWorkout(progress, pullUnlocked, new Date());
  const movePreview = todayWk.rest ? '' : `${todayWk.items.length} moves`;
  // The week's distinct sessions (skip the rest day) — any can be started on demand from the list below.
  const sessions = DAY_KEYS.map((key) => ({ key, wk: workoutForDay(progress, pullUnlocked, key) })).filter((s) => !s.wk.rest);
  // A streak of 3+ that just broke (missed a workout day) — acknowledge it kindly instead of
  // silently resetting to zero. `streak` still holds the lost length until the next workout.
  const lostStreak = streakNow === 0 && streak >= 3 && lastLoggedDay !== null;
  // The week card always says something: streak first, then today's state.
  const weekLine =
    streakNow >= 2
      ? STREAK_MESSAGES[streakNow % STREAK_MESSAGES.length](streakNow)
      : doneToday
        ? 'Workout done — rest easy, see you tomorrow. 🔥'
        : todayWk.rest
          ? 'Rest day — recovery is training too. 🌿'
          : lostStreak
            ? `Your ${streak}-day run ended — start a new one today 🔥`
            : 'Today’s session is waiting for you.';
  // A locked Pull sinks to the bottom of the areas list (stable sort keeps the rest in order).
  const orderedCats = [...CATEGORIES].sort(
    (a, b) => Number(a.id === 'pull' && !pullUnlocked) - Number(b.id === 'pull' && !pullUnlocked),
  );

  // The switch is the "set my own time" control (default off → internal morning/evening). Turning it
  // on while reminders aren't yet permitted re-asks; turning it off just falls back to the default.
  const toggleCustomTime = async (value: boolean) => {
    if (value && !reminderEnabled) {
      const ok = await requestNotificationPermission();
      markReminderPrompted();
      if (!ok) return; // can't schedule without permission
      setReminderEnabled(true);
    }
    setReminderCustomTime(value);
  };

  const onPickTime = (event: DateTimePickerEvent, selected?: Date) => {
    if (event.type === 'set' && selected) setReminder(true, selected.getHours(), selected.getMinutes());
  };
  const openAndroidTimePicker = () =>
    DateTimePickerAndroid.open({ value: dateFromHM(reminderHour, reminderMinute), onChange: onPickTime, mode: 'time', is24Hour: false });

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + spacing.xl }}>
        {/* Dark hero — greeting, streak, overall level */}
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <Text style={[styles.heroGreeting, { flex: 1 }]}>{name ? `Hi, ${name} 👋` : 'Hi there 👋'}</Text>
            <Pressable onPress={() => router.push('/achievements')} hitSlop={10}>
              <Ionicons name="trophy-outline" size={23} color={colors.onInkMuted} />
              {hasUnseenAch ? <View style={styles.heroDot} /> : null}
            </Pressable>
            <Pressable onPress={() => router.push('/settings')} hitSlop={10}>
              <Ionicons name="settings-outline" size={24} color={colors.onInkMuted} />
            </Pressable>
          </View>

          <Pressable onPress={() => setLevelsOpen(true)} style={styles.heroOverall}>
            <Text style={styles.heroOverallEyebrow}>OVERALL</Text>
            <Text style={styles.heroLevel}>Level {overall}</Text>
            <View style={styles.heroBarTrack}>
              <View style={[styles.heroBarFill, { width: `${overallPct}%` }]} />
            </View>
          </Pressable>
        </View>

        <View style={styles.content}>
          {/* Streak + week strip — tap for the full calendar */}
          <Pressable onPress={() => router.push('/history')} style={styles.streakCard}>
            <View style={styles.weekHeader}>
              <Text style={styles.weekEyebrow}>THIS WEEK</Text>
              <View style={styles.weekHeaderRight}>
                {perfectWeek ? <Text style={styles.perfectTag}>🔥 Perfect week</Text> : null}
                <Text style={styles.weekChevron}>›</Text>
              </View>
            </View>
            <Text style={styles.streakSentence}>{weekLine}</Text>
            <View style={styles.weekStrip}>
              {weekDays(day).map((d, i) => {
                const done = loggedDays.includes(d);
                const isToday = d === day;
                return (
                  <View key={d} style={styles.weekDay}>
                    <Text style={[styles.weekDow, isToday && styles.weekDayLabelToday]}>{'MTWTFSS'[i]}</Text>
                    <View style={styles.weekDotSlot}>
                      {done ? (
                        <Ionicons name="flame" size={isToday ? 30 : 22} color={colors.session} />
                      ) : isRestDay(d) ? (
                        <Ionicons name="bed-outline" size={isToday ? 24 : 18} color={colors.muted} />
                      ) : (
                        <Ionicons name="flame-outline" size={isToday ? 30 : 22} color={isToday ? colors.session : colors.muted} />
                      )}
                    </View>
                    <Text style={[styles.weekDayLabel, isToday && styles.weekDayLabelToday]}>{dateOfDayNumber(d)}</Text>
                  </View>
                );
              })}
            </View>
          </Pressable>

          {/* Today */}
          {todayWk.rest ? (
            <View style={[styles.restCard, styles.sectionGap]}>
              <Text style={styles.restEyebrow}>TODAY</Text>
              <Text style={styles.restTitle}>Rest day</Text>
              <Text style={styles.restSub}>Take it easy today — you&apos;ve earned it.</Text>
            </View>
          ) : (
            <View style={[styles.todayHero, !doneToday && styles.todayHeroHot, styles.sectionGap]}>
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

          {/* Workouts — start any session on demand (freestyle: doesn't log or affect the streak) */}
          <View style={styles.sectionGap}>
            <Text style={styles.workoutsEyebrow}>WORKOUTS</Text>
            <Text style={styles.workoutsSub}>Start any session, anytime — bonus work that won&apos;t touch your streak.</Text>
            <View style={styles.groupCard}>
              {sessions.map((s, i) => (
                <Pressable
                  key={s.key}
                  onPress={() => router.push(`/workout?day=${s.key}`)}
                  style={[styles.areaRow, i > 0 && styles.areaRowDivider]}
                >
                  <View style={styles.sessionIcon}>
                    <Ionicons name={s.wk.focus.includes('Cardio') ? 'walk-outline' : 'barbell-outline'} size={18} color={colors.session} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.areaName}>{s.wk.focus}</Text>
                    <Text style={styles.sessionMoves}>{s.wk.items.length} moves</Text>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </Pressable>
              ))}
            </View>
          </View>

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
                  <View style={[styles.levelBox, !locked && { backgroundColor: lvl > 0 ? categoryColors[cat.id].main : categoryColors[cat.id].soft }]}>
                    <Text style={[styles.levelText, !locked && (lvl > 0 ? styles.levelTextOn : { color: categoryColors[cat.id].main })]}>
                      {locked ? '🔒' : `L${lvl}`}
                    </Text>
                  </View>
                  <View style={{ flex: 1, gap: 7 }}>
                    <Text style={styles.areaName}>{cat.short}</Text>
                    {locked ? (
                      <Text style={styles.areaLockHint}>Tap to unlock</Text>
                    ) : maxed ? (
                      <Text style={[styles.areaMaxedHint, { color: categoryColors[cat.id].main }]}>Maxed out ✓</Text>
                    ) : (
                      <View style={styles.rowBarTrack}>
                        <View style={[styles.rowBarFill, { width: `${fillPct}%`, backgroundColor: categoryColors[cat.id].main }]} />
                      </View>
                    )}
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Workout reminders — on by default; the switch sets your own time */}
          <View style={[styles.reminderCard, styles.sectionGap]}>
            <View style={styles.reminderHead}>
              <View style={{ flex: 1 }}>
                <Text style={styles.reminderTitle}>Reminder time</Text>
                <Text style={styles.reminderSub}>
                  {reminderCustomTime
                    ? 'Reminding you at your chosen time'
                    : 'We’ll nudge you on workout days — switch on to set your own time'}
                </Text>
              </View>
              <Switch
                value={reminderCustomTime}
                onValueChange={toggleCustomTime}
                trackColor={{ true: colors.link, false: colors.track }}
                thumbColor="#ffffff"
              />
            </View>

            {reminderCustomTime ? (
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
                    <Text style={[styles.levelsVal, { color: categoryColors[cat.id].main }, locked && styles.levelsValLocked]}>
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

      <Modal
        visible={showWhatsNew && !showCelebration && !streakMilestone}
        transparent
        animationType="fade"
        onRequestClose={() => markWhatsNewSeen(WHATS_NEW.version)}
      >
        <Pressable style={styles.overlay} onPress={() => markWhatsNewSeen(WHATS_NEW.version)}>
          <Pressable style={styles.levelsSheet} onPress={() => {}}>
            <Text style={styles.overallEyebrow}>WHAT&apos;S NEW ✨</Text>
            <Text style={styles.overallLevel}>Fresh in this update</Text>
            <View style={styles.whatsNewList}>
              {WHATS_NEW.items.map((it, i) => (
                <View key={i} style={styles.whatsNewRow}>
                  <Text style={styles.whatsNewDot}>•</Text>
                  <Text style={styles.whatsNewText}>{it}</Text>
                </View>
              ))}
            </View>
            <Pressable onPress={() => markWhatsNewSeen(WHATS_NEW.version)} style={styles.pullPrimary}>
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
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  heroGreeting: { color: colors.primaryText, fontSize: 24, fontFamily: fonts.display },
  heroDot: { position: 'absolute', top: -1, right: -1, width: 9, height: 9, borderRadius: 5, backgroundColor: colors.session, borderWidth: 1.5, borderColor: colors.inkCard },
  streakCard: { backgroundColor: colors.streakBg, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.streakBorder },
  weekHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  weekHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  perfectTag: { color: colors.session, fontSize: font.eyebrow, fontFamily: fonts.heavy, letterSpacing: 0.5 },
  weekEyebrow: { color: colors.warnText, fontSize: font.eyebrow, fontFamily: fonts.heavy, letterSpacing: 1 },
  streakSentence: { color: colors.ink, fontSize: font.body, fontFamily: fonts.heavy, marginBottom: spacing.md },
  weekStrip: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  weekDay: { flex: 1, alignItems: 'center', gap: 4 },
  weekDow: { color: colors.muted, fontSize: 10, fontFamily: fonts.heavy, letterSpacing: 0.5 },
  weekDotSlot: { height: 34, justifyContent: 'center' }, // keeps date labels aligned despite today's bigger flame
  weekDayLabel: { color: colors.muted, fontSize: 10, fontFamily: fonts.bold },
  weekDayLabelToday: { color: colors.ink, fontFamily: fonts.display },
  weekChevron: { color: colors.link, fontSize: 18, fontFamily: fonts.bold },
  heroOverall: { marginTop: spacing.lg + spacing.xs },
  heroOverallEyebrow: { color: colors.onInkMuted, fontSize: font.eyebrow, fontFamily: fonts.heavy, letterSpacing: 1.5 },
  heroLevel: { color: colors.primaryText, fontSize: font.h2, fontFamily: fonts.display, marginTop: spacing.xs },
  heroBarTrack: { height: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: radius.pill, overflow: 'hidden', marginTop: spacing.md },
  heroBarFill: { height: 8, backgroundColor: colors.accent, borderRadius: radius.pill },

  content: { padding: spacing.lg },
  sectionGap: { marginTop: SECTION_GAP },

  // Today — burns session-orange until done, then cools to "done" green
  todayHero: { backgroundColor: colors.done, borderRadius: radius.lg, padding: spacing.xl },
  todayHeroHot: { backgroundColor: colors.session },
  todayHeroEyebrow: { color: 'rgba(255,255,255,0.85)', fontSize: font.eyebrow, fontFamily: fonts.heavy, letterSpacing: 1 },
  todayHeroTitle: { color: colors.primaryText, fontSize: font.title, fontFamily: fonts.display, marginTop: spacing.xs },
  todayHeroSub: { color: 'rgba(255,255,255,0.85)', fontSize: font.small, marginTop: spacing.xs, fontFamily: fonts.regular },
  todayHeroBtn: { backgroundColor: colors.surface, borderRadius: radius.pill, paddingVertical: spacing.md + 2, alignItems: 'center', marginTop: spacing.lg },
  todayHeroBtnText: { color: colors.session, fontSize: font.body, fontFamily: fonts.heavy }, // only shown on the hot card
  todayDonePill: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: radius.pill, paddingVertical: spacing.md + 2, alignItems: 'center', marginTop: spacing.lg },
  todayDoneText: { color: colors.primaryText, fontSize: font.body, fontFamily: fonts.heavy },

  // Today — rest day (calm, not green)
  restCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, gap: spacing.xs },
  restEyebrow: { color: colors.link, fontSize: font.eyebrow, fontFamily: fonts.heavy, letterSpacing: 1 },
  restTitle: { color: colors.ink, fontSize: font.h2, fontFamily: fonts.heavy, marginTop: 2 },
  restSub: { color: colors.muted, fontSize: font.small, marginTop: 4, fontFamily: fonts.regular },

  // Workouts (on-demand sessions)
  workoutsEyebrow: { color: colors.link, fontSize: font.eyebrow, fontFamily: fonts.heavy, letterSpacing: 1, marginBottom: 2 },
  workoutsSub: { color: colors.muted, fontSize: font.small, fontFamily: fonts.regular, marginBottom: spacing.md },
  sessionIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  sessionMoves: { color: colors.muted, fontSize: font.small, fontFamily: fonts.regular, marginTop: 2 },

  // Areas grouped card
  groupCard: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md },
  areaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  areaRowDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  levelBox: { width: 38, height: 38, borderRadius: 10, backgroundColor: colors.track, alignItems: 'center', justifyContent: 'center' },
  levelText: { color: colors.muted, fontSize: font.small, fontFamily: fonts.display },
  levelTextOn: { color: colors.primaryText },
  areaName: { color: colors.text, fontSize: font.body, fontFamily: fonts.bold },
  areaLockHint: { color: colors.muted, fontSize: font.small, fontFamily: fonts.regular },
  areaMaxedHint: { color: colors.primary, fontSize: font.small, fontFamily: fonts.bold },
  rowBarTrack: { height: 6, backgroundColor: colors.track, borderRadius: radius.pill, overflow: 'hidden' },
  rowBarFill: { height: 6, backgroundColor: colors.primary, borderRadius: radius.pill },
  chevron: { color: colors.muted, fontSize: 22, fontFamily: fonts.regular },

  // Reminder
  reminderCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, gap: spacing.md },
  reminderHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  reminderTitle: { color: colors.text, fontSize: font.body, fontFamily: fonts.heavy },
  reminderSub: { color: colors.muted, fontSize: font.small, marginTop: 1, fontFamily: fonts.regular },
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
  timeButtonText: { color: colors.text, fontSize: font.body, fontFamily: fonts.heavy },
  timeButtonHint: { color: colors.link, fontSize: font.small, fontFamily: fonts.bold },

  // Modals / sheets
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(12,20,16,0.5)', alignItems: 'center', justifyContent: 'center', padding: spacing.xl },

  overallEyebrow: { color: colors.muted, fontSize: font.eyebrow, fontFamily: fonts.heavy, letterSpacing: 1.5 },
  overallLevel: { color: colors.ink, fontSize: font.title, fontFamily: fonts.display },
  overallSub: { color: colors.muted, fontSize: font.small, marginTop: 2, fontFamily: fonts.regular },
  barTrack: { height: 10, backgroundColor: colors.track, borderRadius: radius.pill, overflow: 'hidden', marginTop: 2 },
  barFill: { height: 10, backgroundColor: colors.primary, borderRadius: radius.pill },

  levelsSheet: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.sm, width: '100%', maxWidth: 420 },
  levelsList: { marginTop: spacing.sm },

  whatsNewList: { marginTop: spacing.sm, gap: spacing.sm },
  whatsNewRow: { flexDirection: 'row', gap: spacing.sm },
  whatsNewDot: { color: colors.link, fontSize: font.body, fontFamily: fonts.display, lineHeight: 22 },
  whatsNewText: { flex: 1, color: colors.text, fontSize: font.body, lineHeight: 22, fontFamily: fonts.regular },
  levelsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  levelsCat: { color: colors.text, fontSize: font.body, fontFamily: fonts.bold },
  levelsVal: { color: colors.primary, fontSize: font.body, fontFamily: fonts.heavy },
  levelsValLocked: { color: colors.muted },

  pullSheet: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.sm, width: '100%', maxWidth: 420, alignItems: 'center' },
  pullEmoji: { fontSize: 44 },
  pullTitle: { color: colors.ink, fontSize: font.title, fontFamily: fonts.heavy, textAlign: 'center' },
  pullBody: { color: colors.muted, fontSize: font.body, lineHeight: 22, textAlign: 'center', fontFamily: fonts.regular },
  pullPrimary: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingVertical: spacing.md, paddingHorizontal: spacing.xl, alignItems: 'center', marginTop: spacing.sm, alignSelf: 'stretch' },
  pullPrimaryText: { color: colors.primaryText, fontSize: font.body, fontFamily: fonts.heavy },
  pullSecondary: { paddingVertical: spacing.sm, alignItems: 'center', alignSelf: 'stretch' },
  pullSecondaryText: { color: colors.muted, fontSize: font.body, fontFamily: fonts.bold },
});
