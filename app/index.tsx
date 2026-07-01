import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Redirect, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Celebration } from '@/components/Celebration';
import { Flame } from '@/components/Flame';
import { RhythmCard } from '@/components/RhythmCard';
import { categoryColors, colors, font, fonts, radius, spacing } from '@/constants/theme';
import { CATEGORIES, MAX_LEVEL, benchmarksFor, categoryCeiling } from '@/data/benchmarks';
import { WHATS_NEW } from '@/data/whatsNew';
import { achievementContext, unlockedIds } from '@/engine/achievements';
import { sessionsTrainingCategory, todaysWorkout } from '@/engine/dailyCard';
import { dateOfDayNumber, weekDays } from '@/engine/history';
import { baselineLevel, completedLevel, effectiveCategoryIds, levelCap, nextLevel } from '@/engine/progression';
import { currentStreak, isRestDay, pendingStreakMilestone } from '@/engine/streak';
import { refreshReminders, refreshRhythmReminders, requestNotificationPermission } from '@/lib/notifications';
import { useAppStore } from '@/store/useAppStore';

function todayNumber(): number {
  const now = new Date();
  return Math.floor((now.getTime() - now.getTimezoneOffset() * 60000) / 86400000);
}

function dateFromHM(h: number, m: number): Date {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

// Friendly streak line — a few variations, picked deterministically by streak length so it's stable
// for a given value but varies as the streak grows.
const STREAK_MESSAGES: ((n: number) => string)[] = [
  (n) => `You're on a ${n}-day streak — awesome!`,
  (n) => `${n} days in a row. You're on fire!`,
  (n) => `${n}-day streak — keep it rolling!`,
  (n) => `${n} days straight. Look at you go!`,
  (n) => `${n}-day streak. Unstoppable!`,
];

// Sessions training an area (since its last level-up) before we prompt "ready to level up?" — enough
// reps that they've plausibly outgrown the level. Already claiming a next-level benchmark overrides it.
const READY_SESSIONS = 3;

// Days before the dismissed "set a reminder time" banner returns (no cap — it keeps coming back
// weekly until they actually set a time, since a personalised reminder is the strongest habit lever).
const REMINDER_NUDGE_DAYS = 7;

export default function Home() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const onboarded = useAppStore((s) => s.onboarded);
  const profile = useAppStore((s) => s.profile);
  const progress = useAppStore((s) => s.progress);
  const lastLoggedDay = useAppStore((s) => s.lastLoggedDay);
  const streak = useAppStore((s) => s.streak);
  const loggedDays = useAppStore((s) => s.loggedDays);
  const sessions = useAppStore((s) => s.sessions);
  const lastLevelDay = useAppStore((s) => s.lastLevelDay);
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
  const reminderNudgeDay = useAppStore((s) => s.reminderNudgeDay);
  const dismissReminderNudge = useAppStore((s) => s.dismissReminderNudge);
  const name = useAppStore((s) => s.name);
  const pullUnlocked = useAppStore((s) => s.pullUnlocked);
  const unlockPull = useAppStore((s) => s.unlockPull);
  const rhythmRemindersEnabled = useAppStore((s) => s.rhythmRemindersEnabled);
  const rhythmLocation = useAppStore((s) => s.rhythmLocation);
  const circadian = useAppStore((s) => s.circadian);
  const [pullStep, setPullStep] = useState<'closed' | 'explain' | 'confirm'>('closed');
  const [levelsOpen, setLevelsOpen] = useState(false);
  const [reminderPicker, setReminderPicker] = useState(false);
  const [reminderTemp, setReminderTemp] = useState<Date | null>(null);

  const day = todayNumber();
  const doneToday = lastLoggedDay === day;
  // The "Today's Workout" card + its reminder track the SCHEDULED session specifically — a freestyle/
  // run keeps the streak (week strip + history) but doesn't satisfy today's program work (option B).
  const scheduledDoneToday = sessions.some((ss) => ss.day === day && ss.scheduled);
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
      // Skip today's workout reminder only when the SCHEDULED session is done — a freestyle/run
      // doesn't excuse the program workout (option B), so the reminder should still fire.
      lastLoggedDay: scheduledDoneToday ? day : null,
      lapsed,
      enabled: reminderEnabled,
      customTime: reminderCustomTime ? { hour: reminderHour, minute: reminderMinute } : null,
    });
  }, [onboarded, reminderEnabled, reminderCustomTime, reminderHour, reminderMinute, scheduledDoneToday, day, lapsed]);

  // Rhythm nudges (sleep + sunrise/sunset light) — re-armed on open and whenever a log changes, so
  // logged items go silent. Independent of the workout reminders above.
  useEffect(() => {
    if (!onboarded) return;
    refreshRhythmReminders({ enabled: rhythmRemindersEnabled, location: rhythmLocation, circadian });
  }, [onboarded, rhythmRemindersEnabled, rhythmLocation, circadian]);

  if (!onboarded || !profile) return <Redirect href="/onboarding" />;

  const activeCats = effectiveCategoryIds(pullUnlocked);
  const overall = baselineLevel(progress, pullUnlocked);
  const nextOverall = Math.min(overall + 1, MAX_LEVEL);
  const atNextCount = activeCats.filter((c) => completedLevel(progress, c) >= nextOverall).length;
  const atMax = overall >= MAX_LEVEL;
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
  // Rhythm leads the home cards by default; the workout takes the prime slot only while it's actually
  // owed — a training day, the scheduled session not done, and (when a reminder time is set) at/after
  // that time — so an evening-planned workout doesn't hog the morning.
  const workoutExpected =
    !todayWk.rest && !scheduledDoneToday && (!reminderCustomTime || new Date().getHours() * 60 + new Date().getMinutes() >= reminderHour * 60 + reminderMinute);
  const workoutCard = todayWk.rest ? (
    <View style={[styles.restCard, styles.sectionGap]}>
      <Text style={styles.restEyebrow}>TODAY</Text>
      <Text style={styles.restTitle}>Rest day</Text>
      <Text style={styles.restSub}>Take it easy today — you&apos;ve earned it.</Text>
    </View>
  ) : (
    <View style={[styles.todayHero, !scheduledDoneToday && styles.todayHeroHot, styles.sectionGap]}>
      <Text style={styles.todayHeroEyebrow}>TODAY&apos;S WORKOUT</Text>
      <Text style={styles.todayHeroTitle}>{todayWk.focus}</Text>
      <Text style={styles.todayHeroSub}>{movePreview}</Text>
      {scheduledDoneToday ? (
        <View style={styles.todayDonePill}>
          <Text style={styles.todayDoneText}>✓ Done for today</Text>
        </View>
      ) : (
        <Pressable style={styles.todayHeroBtn} onPress={() => router.push('/workout')}>
          <Text style={styles.todayHeroBtnText}>Start workout →</Text>
        </Pressable>
      )}
    </View>
  );
  const rhythmCard = (
    <View style={styles.sectionGap}>
      <RhythmCard />
    </View>
  );
  // A streak of 3+ that just broke (missed a workout day) — acknowledge it kindly instead of
  // silently resetting to zero. `streak` still holds the lost length until the next workout.
  const lostStreak = streakNow === 0 && streak >= 3 && lastLoggedDay !== null;
  // The week card always says something: streak first, then today's state.
  const weekLine =
    streakNow >= 2
      ? STREAK_MESSAGES[streakNow % STREAK_MESSAGES.length](streakNow)
      : scheduledDoneToday
        ? 'Workout done — rest easy, see you tomorrow.'
        : doneToday
          ? 'Nice — you trained today. Today’s session is still here too.'
          : todayWk.rest
          ? 'Rest day — recovery is training too. 🌿'
          : lostStreak
            ? `Your ${streak}-day run ended — start a new one today`
            : 'Today’s session is waiting for you.';
  // A locked Pull sinks to the bottom of the areas list (stable sort keeps the rest in order).
  const orderedCats = [...CATEGORIES].sort(
    (a, b) => Number(a.id === 'pull' && !pullUnlocked) - Number(b.id === 'pull' && !pullUnlocked),
  );
  // Per-area progress, computed once — feeds the hero's segmented overall bar AND the breakdown sheet.
  const areaData = orderedCats.map((cat) => {
    const locked = cat.id === 'pull' && !pullUnlocked;
    const lvl = completedLevel(progress, cat.id);
    const maxed = !locked && lvl >= categoryCeiling(cat.id);
    const nextBenches = locked || maxed ? [] : benchmarksFor(cat.id, nextLevel(progress, cat.id));
    const claimedNext = nextBenches.filter((b) => progress.claimed[b.id]).length;
    const fillPct = nextBenches.length ? (claimedNext / nextBenches.length) * 100 : 0;
    const canLevelUp = !locked && !maxed && nextLevel(progress, cat.id) <= levelCap(progress, pullUnlocked);
    // Only "ready" when plausibly so: part-way into the next level, or enough sessions since the last level-up here.
    const ready =
      canLevelUp &&
      claimedNext < nextBenches.length &&
      (claimedNext > 0 || sessionsTrainingCategory(sessions, cat.id, pullUnlocked, lastLevelDay[cat.id] ?? -1) >= READY_SESSIONS);
    // "Done" for the overall level = already at (or past) the next overall tier — an amber segment.
    const doneForOverall = !locked && (maxed || lvl >= nextOverall);
    return { cat, locked, lvl, maxed, fillPct, ready, doneForOverall };
  });
  const readyCat = areaData.find((a) => a.ready)?.cat ?? null;
  const holdouts = areaData.filter((a) => !a.locked && !a.doneForOverall);
  // One hero line: the concrete win (an area ready to advance) wins; else name the overall holdout(s).
  const overallNudge = atMax
    ? 'Every area maxed out ✓'
    : readyCat
      ? `✨ ${readyCat.short} ready to level up`
      : holdouts.length === 1
        ? `${holdouts[0].cat.short}'s the holdout`
        : `${holdouts.length} areas to catch up`;
  // The "set your own reminder time" banner: shown until they pick a time; dismissing it brings it
  // back a week later (no cap).
  const showReminderBanner = !reminderCustomTime && (reminderNudgeDay === null || day - reminderNudgeDay >= REMINDER_NUDGE_DAYS);

  // The top banner's "set a reminder time" → pick a time, which switches the default morning/afternoon
  // beats for one reminder at the chosen time. Setting a time hides the banner for good.
  const saveBannerTime = async (d: Date) => {
    if (!reminderEnabled) {
      const ok = await requestNotificationPermission();
      markReminderPrompted();
      if (!ok) return; // can't schedule without permission
    }
    setReminder(true, d.getHours(), d.getMinutes());
    setReminderCustomTime(true);
  };
  const openReminderPicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: dateFromHM(reminderHour, reminderMinute),
        mode: 'time',
        is24Hour: false,
        onChange: (e, d) => {
          if (e.type === 'set' && d) saveBannerTime(d);
        },
      });
    } else {
      setReminderTemp(dateFromHM(reminderHour, reminderMinute));
      setReminderPicker(true);
    }
  };

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
            {/* One segment per area — amber = at the next tier, ember = still catching up (the holdout). */}
            <View style={styles.heroSegRow}>
              {areaData
                .filter((a) => !a.locked)
                .map((a) => (
                  <View key={a.cat.id} style={styles.heroSeg}>
                    <View style={styles.heroSegTrack}>
                      <View
                        style={[
                          styles.heroSegFill,
                          a.doneForOverall
                            ? { width: '100%', backgroundColor: colors.streakInk }
                            : { width: `${Math.max(a.fillPct, 12)}%`, backgroundColor: colors.accent },
                        ]}
                      />
                    </View>
                    <Text style={[styles.heroSegLabel, !a.doneForOverall && { color: colors.accent }]} numberOfLines={1}>
                      {a.cat.short}
                    </Text>
                  </View>
                ))}
            </View>
            <Text style={styles.heroNudge}>{overallNudge} ›</Text>
          </Pressable>
        </View>

        <View style={styles.content}>
          {/* Set-your-reminder-time nudge — tap to pick a time, × to dismiss (returns in a week) */}
          {showReminderBanner ? (
            <Pressable onPress={openReminderPicker} style={styles.remindBanner}>
              <Ionicons name="notifications-outline" size={20} color={colors.link} />
              <View style={{ flex: 1 }}>
                <Text style={styles.remindBannerTitle}>Set a reminder time</Text>
                <Text style={styles.remindBannerSub}>Pick a time so you never miss a day</Text>
              </View>
              <Pressable onPress={() => dismissReminderNudge(day)} hitSlop={12}>
                <Ionicons name="close" size={20} color={colors.muted} />
              </Pressable>
            </Pressable>
          ) : null}

          {/* Streak + week strip — tap for the full calendar */}
          <Pressable onPress={() => router.push('/history')} style={styles.streakCard}>
            <View style={styles.weekHeader}>
              <Text style={styles.weekEyebrow}>THIS WEEK</Text>
              <View style={styles.weekHeaderRight}>
                {perfectWeek ? (
                  <View style={styles.perfectTag}>
                    <Flame tone="done" size={13} />
                    <Text style={styles.perfectTagText}>Perfect week</Text>
                  </View>
                ) : null}
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
                        <Flame tone="done" size={isToday ? 30 : 22} />
                      ) : isRestDay(d) ? (
                        <Ionicons name="bed-outline" size={isToday ? 24 : 18} color={colors.muted} />
                      ) : (
                        <Flame tone={isToday ? 'active' : 'idle'} size={isToday ? 30 : 22} />
                      )}
                    </View>
                    <Text style={[styles.weekDayLabel, isToday && styles.weekDayLabelToday]}>{dateOfDayNumber(d)}</Text>
                  </View>
                );
              })}
            </View>
          </Pressable>

          {/* Workout & Rhythm — Rhythm leads unless the workout's actually owed right now (see
              workoutExpected); the workout never gets pushed down once it's time to do it. */}
          {workoutExpected ? (
            <>
              {workoutCard}
              {rhythmCard}
            </>
          ) : (
            <>
              {rhythmCard}
              {workoutCard}
            </>
          )}

          {/* Workouts library — set apart at the bottom; not part of the daily program */}
          <Pressable onPress={() => router.push('/workouts')} style={[styles.libraryBtn, styles.sectionGap]}>
            <View style={styles.libraryIcon}>
              <Ionicons name="barbell-outline" size={20} color={colors.session} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.libraryTitle}>Workouts</Text>
              <Text style={styles.librarySub}>Start any session on demand</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* iOS time picker for the reminder banner (Android uses the native dialog) */}
      {reminderPicker ? (
        <Modal transparent animationType="fade" visible onRequestClose={() => setReminderPicker(false)}>
          <Pressable style={styles.remindModalOverlay} onPress={() => setReminderPicker(false)}>
            <Pressable style={styles.remindModalSheet} onPress={() => {}}>
              <DateTimePicker
                mode="time"
                display="spinner"
                value={reminderTemp ?? dateFromHM(reminderHour, reminderMinute)}
                onChange={(_, d) => d && setReminderTemp(d)}
              />
              <Pressable
                style={styles.remindModalBtn}
                onPress={() => {
                  if (reminderTemp) saveBannerTime(reminderTemp);
                  setReminderPicker(false);
                }}
              >
                <Text style={styles.remindModalBtnText}>Done</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}

      {showCelebration ? (
        <Celebration title={`You hit Level ${overall}!`} body={celebrateBody} onDone={() => markOverallLevelSeen(overall)} />
      ) : null}

      {!showCelebration && streakMilestone ? (
        <Celebration
          title={`${streakMilestone}-day streak!`}
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
              {areaData.map((a, i) => (
                <Pressable
                  key={a.cat.id}
                  onPress={() => {
                    setLevelsOpen(false);
                    if (a.locked) setPullStep('explain');
                    else router.push(`/category/${a.cat.id}`);
                  }}
                  style={[styles.areaRow, i > 0 && styles.areaRowDivider]}
                >
                  <View style={[styles.levelBox, !a.locked && { backgroundColor: a.lvl > 0 ? categoryColors[a.cat.id].main : categoryColors[a.cat.id].soft }]}>
                    <Text style={[styles.levelText, !a.locked && (a.lvl > 0 ? styles.levelTextOn : { color: categoryColors[a.cat.id].main })]}>
                      {a.locked ? '🔒' : `L${a.lvl}`}
                    </Text>
                  </View>
                  <View style={{ flex: 1, gap: 7 }}>
                    <Text style={styles.areaName}>{a.cat.short}</Text>
                    {a.locked ? (
                      <Text style={styles.areaLockHint}>Tap to unlock</Text>
                    ) : a.maxed ? (
                      <Text style={[styles.areaMaxedHint, { color: categoryColors[a.cat.id].main }]}>Maxed out ✓</Text>
                    ) : (
                      <>
                        <View style={styles.rowBarTrack}>
                          <View style={[styles.rowBarFill, { width: `${a.fillPct}%`, backgroundColor: categoryColors[a.cat.id].main }]} />
                        </View>
                        {a.ready ? <Text style={styles.areaLevelUp}>Ready to level up? →</Text> : null}
                      </>
                    )}
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </Pressable>
              ))}
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
  perfectTag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  perfectTagText: { color: colors.session, fontSize: font.eyebrow, fontFamily: fonts.heavy, letterSpacing: 0.5 },
  weekEyebrow: { color: colors.link, fontSize: font.eyebrow, fontFamily: fonts.heavy, letterSpacing: 1 },
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
  heroSegRow: { flexDirection: 'row', gap: 5, marginTop: spacing.md },
  heroSeg: { flex: 1, gap: 5 },
  heroSegTrack: { height: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: radius.pill, overflow: 'hidden' },
  heroSegFill: { height: 8, borderRadius: radius.pill },
  heroSegLabel: { color: colors.onInkMuted, fontSize: 10, fontFamily: fonts.bold, textAlign: 'center' },
  heroNudge: { color: colors.accent, fontSize: font.small, fontFamily: fonts.bold, marginTop: spacing.md },

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

  // Workouts library button (bottom of home — on-demand sessions, outside the daily program)
  libraryBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg },
  libraryIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  libraryTitle: { color: colors.text, fontSize: font.body, fontFamily: fonts.heavy },
  librarySub: { color: colors.muted, fontSize: font.small, fontFamily: fonts.regular, marginTop: 1 },

  // Area rows — shared by the "where you're at" breakdown sheet
  areaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  areaRowDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  levelBox: { width: 38, height: 38, borderRadius: 10, backgroundColor: colors.track, alignItems: 'center', justifyContent: 'center' },
  levelText: { color: colors.muted, fontSize: font.small, fontFamily: fonts.display },
  levelTextOn: { color: colors.primaryText },
  areaName: { color: colors.text, fontSize: font.body, fontFamily: fonts.bold },
  areaLockHint: { color: colors.muted, fontSize: font.small, fontFamily: fonts.regular },
  areaMaxedHint: { color: colors.primary, fontSize: font.small, fontFamily: fonts.bold },
  areaLevelUp: { color: colors.link, fontSize: font.small, fontFamily: fonts.heavy },
  rowBarTrack: { height: 6, backgroundColor: colors.track, borderRadius: radius.pill, overflow: 'hidden' },
  rowBarFill: { height: 6, backgroundColor: colors.primary, borderRadius: radius.pill },
  chevron: { color: colors.muted, fontSize: 22, fontFamily: fonts.regular },

  // Reminder banner — ember wash nudge at the top of home
  remindBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.streakBg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.streakBorder, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, marginBottom: spacing.lg },
  remindBannerTitle: { color: colors.ink, fontSize: font.body, fontFamily: fonts.heavy },
  remindBannerSub: { color: colors.muted, fontSize: font.small, fontFamily: fonts.regular, marginTop: 1 },
  remindModalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(12,20,16,0.5)', alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  remindModalSheet: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, width: '100%', maxWidth: 420 },
  remindModalBtn: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  remindModalBtnText: { color: colors.primaryText, fontSize: font.body, fontFamily: fonts.heavy },

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
  pullSheet: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.sm, width: '100%', maxWidth: 420, alignItems: 'center' },
  pullEmoji: { fontSize: 44 },
  pullTitle: { color: colors.ink, fontSize: font.title, fontFamily: fonts.heavy, textAlign: 'center' },
  pullBody: { color: colors.muted, fontSize: font.body, lineHeight: 22, textAlign: 'center', fontFamily: fonts.regular },
  pullPrimary: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingVertical: spacing.md, paddingHorizontal: spacing.xl, alignItems: 'center', marginTop: spacing.sm, alignSelf: 'stretch' },
  pullPrimaryText: { color: colors.primaryText, fontSize: font.body, fontFamily: fonts.heavy },
  pullSecondary: { paddingVertical: spacing.sm, alignItems: 'center', alignSelf: 'stretch' },
  pullSecondaryText: { color: colors.muted, fontSize: font.body, fontFamily: fonts.bold },
});
