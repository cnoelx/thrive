import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HowToSheet } from '@/components/HowToSheet';
import { ShareCardModal } from '@/components/ShareCardModal';
import { WorkoutCard } from '@/components/WorkoutCard';
import { colors, font, fonts, radius, spacing } from '@/constants/theme';
import { EXERCISE_BY_KEY, formatTarget } from '@/data/benchmarks';
import { estimateCalories } from '@/engine/calories';
import { todaysWorkout, workoutForDay, type WorkoutItem } from '@/engine/dailyCard';
import { DAY_KEYS, type DayKey } from '@/data/schedule';
import { dayLabel } from '@/engine/history';
import { currentStreak } from '@/engine/streak';
import { FINISH_CUE, introCue, restCue, setCue } from '@/engine/voiceCues';
import { refreshReminders, requestNotificationPermission } from '@/lib/notifications';
import { say, stopSpeaking } from '@/lib/speech';
import { useAppStore, type WorkoutFeel } from '@/store/useAppStore';

const KEEP_AWAKE_TAG = 'workout';

function todayNumber(): number {
  const now = new Date();
  return Math.floor((now.getTime() - now.getTimezoneOffset() * 60000) / 86400000);
}

type SetKind = 'goal' | 'work' | 'plain';
type CircuitStep = { item: WorkoutItem; restSec: number | null; target: string; kind: SetKind };

// Circuit: one set of each exercise per round, repeated for as many rounds as the highest set
// count that day. Exercises with fewer sets drop out of the later rounds. No rest after the last set.
// A chasing exercise with distinct work volume splits: round 1 = fresh goal attempt, later rounds =
// the completed level's target (the volume that builds toward the goal).
function buildCircuit(items: WorkoutItem[]): CircuitStep[] {
  const setsOf = (it: WorkoutItem) => it.sets ?? 1;
  const totalRounds = items.length ? Math.max(...items.map(setsOf)) : 0;
  const steps: CircuitStep[] = [];
  for (let r = 1; r <= totalRounds; r++) {
    for (const it of items) {
      if (setsOf(it) < r) continue;
      const mixed = it.chasing && it.workTarget !== it.target && setsOf(it) > 1;
      steps.push({
        item: it,
        restSec: it.restSec ?? null,
        target: mixed && r > 1 ? it.workTarget : it.target,
        kind: mixed ? (r === 1 ? 'goal' : 'work') : 'plain',
      });
    }
  }
  if (steps.length > 0) steps[steps.length - 1].restSec = null;
  return steps;
}

function clock(sec: number): string {
  const s = Math.max(0, sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// Pull a hold duration out of a time-based target ("50s", "free 90s", "full 30s/side"). Only fires when
// the target's PRIMARY quantity (its first number) is seconds — so rep targets that merely mention a
// tempo ("negatives ×3 … lower for 5s", "20/leg + 2s hold") and minute cardio ("20–30 min") are skipped.
function holdSeconds(target: string): { secs: number; perSide: boolean } | null {
  const m = target.match(/^[^\d]*(\d+)(s?)/);
  if (!m || m[2] !== 's') return null;
  return { secs: parseInt(m[1], 10), perSide: /\/side/.test(target) };
}

// How old (in days) the stored weight may get before the finish screen asks about it.
const WEIGHT_NUDGE_DAYS = 30;

// How long a declined reminder offer stays quiet before the finish screen asks again.
const REMINDER_REOFFER_DAYS = 7;

// Sunrise — the live session's own bright, warm room (heat = effort; the home card glows the same
// orange until done). Rest day and the finish screen stay on the app's cool light theme.
const sunrise = {
  bg: '#FFF7ED', // warm cream canvas
  ink: '#431407', // warm near-black headings
  hot: colors.session, // #EA580C — big effort numbers, actions, progress
  soft: '#D97706', // gentler heat for the rest countdown
  muted: '#B45309', // secondary text
  track: '#FED7AA', // progress track / light borders
};

const FEELS: { id: WorkoutFeel; emoji: string; label: string }[] = [
  { id: 'hard', emoji: '🥵', label: 'Too hard' },
  { id: 'right', emoji: '🙂', label: 'Just right' },
  { id: 'easy', emoji: '😎', label: 'Too easy' },
];


export default function Workout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const progress = useAppStore((s) => s.progress);
  const pullUnlocked = useAppStore((s) => s.pullUnlocked);
  const logToday = useAppStore((s) => s.logToday);
  const rateWorkout = useAppStore((s) => s.rateWorkout);
  const lastLoggedDay = useAppStore((s) => s.lastLoggedDay);
  const streak = useAppStore((s) => s.streak);
  const weightKg = useAppStore((s) => s.weightKg);
  const weightSetDay = useAppStore((s) => s.weightSetDay);
  const setWeight = useAppStore((s) => s.setWeight);
  const reminderEnabled = useAppStore((s) => s.reminderEnabled);
  const reminderOfferDay = useAppStore((s) => s.reminderOfferDay);
  const setReminderEnabled = useAppStore((s) => s.setReminderEnabled);
  const dismissReminderOffer = useAppStore((s) => s.dismissReminderOffer);
  const voiceCoach = useAppStore((s) => s.voiceCoach);
  const setVoiceCoach = useAppStore((s) => s.setVoiceCoach);

  const day = todayNumber();
  // Launched with ?day=<key> from the home "Workouts" list = a freestyle session: full guided workout,
  // but it never logs or touches the streak/calendar. No param = today's scheduled workout.
  const params = useLocalSearchParams<{ day?: string }>();
  const freestyleDay = params.day && (DAY_KEYS as readonly string[]).includes(params.day) ? (params.day as DayKey) : null;
  const freestyle = freestyleDay !== null;
  const workout = useMemo(
    () => (freestyleDay ? workoutForDay(progress, pullUnlocked, freestyleDay) : todaysWorkout(progress, pullUnlocked, new Date())),
    [progress, pullUnlocked, freestyleDay],
  );
  const steps = useMemo(() => buildCircuit(workout.items), [workout.items]);

  const [started, setStarted] = useState(false); // false = showing the pre-workout overview
  const [stepIndex, setStepIndex] = useState(0);
  const [resting, setResting] = useState(false);
  const [restLeft, setRestLeft] = useState(0);
  const [finished, setFinished] = useState(false);
  const [durationMin, setDurationMin] = useState(0);
  const [feel, setFeel] = useState<WorkoutFeel | null>(null);
  const [showShare, setShowShare] = useState(false);
  const [infoItem, setInfoItem] = useState<{ exKey: string; name: string } | null>(null);
  const [startedAt, setStartedAt] = useState(0); // set when the user taps Begin
  const [holdLeft, setHoldLeft] = useState<number | null>(null); // hold-timer seconds left (null = not running)
  const [holdSide, setHoldSide] = useState<1 | 2>(1); // which side of a per-side hold we're on

  // Speak a cue when voice coaching is on. Cues fire from the transition points (Begin, Done, rest,
  // finish) rather than from effects, so each line maps to one user action — no double-speak.
  const coach = (line: string) => {
    if (voiceCoach) say(line);
  };
  const stepCue = (s: CircuitStep) => setCue({ name: s.item.name, target: s.target });

  const goNext = () => {
    setResting(false);
    if (stepIndex + 1 >= steps.length) {
      const mins = Math.max(1, Math.round((Date.now() - startedAt) / 60000));
      setDurationMin(mins);
      if (!freestyle && lastLoggedDay !== day) {
        logToday(day, {
          focus: workout.focus,
          moves: workout.items.length,
          durationMin: mins,
          totalSets: steps.length,
          ...(weightKg ? { calories: estimateCalories(weightKg, mins) } : {}),
          // Stored for the shareable workout card (name + the goal target per move).
          items: workout.items.map((it) => ({ name: it.name, sets: it.sets, target: it.target })),
        });
      }
      coach(FINISH_CUE);
      setFinished(true);
    } else {
      setStepIndex(stepIndex + 1);
      coach(stepCue(steps[stepIndex + 1]));
    }
  };

  // Finish the current set: rest if this step has rest, otherwise advance. Shared by the Done button
  // and the hold timer's auto-advance.
  const finishSet = () => {
    const cur = steps[stepIndex];
    const nxt = steps[stepIndex + 1];
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (cur?.restSec && cur.restSec > 0) {
      setRestLeft(cur.restSec);
      setResting(true);
      coach(restCue(cur.restSec, nxt ? nxt.item.name : null));
    } else {
      goNext();
    }
  };

  // Tick the rest countdown down once per second while resting.
  useEffect(() => {
    if (!resting) return;
    const id = setInterval(() => setRestLeft((s) => (s <= 0 ? 0 : s - 1)), 1000);
    return () => clearInterval(id);
  }, [resting]);

  // When the rest hits zero, buzz and move on.
  useEffect(() => {
    if (resting && restLeft <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      goNext();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resting, restLeft]);

  // Tick the hold timer down once per second while a hold is running.
  useEffect(() => {
    if (holdLeft === null) return;
    const id = setInterval(() => setHoldLeft((s) => (s === null ? null : s <= 0 ? 0 : s - 1)), 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holdLeft === null]);

  // Soft ticks in the last 3s; at zero, switch sides (per-side holds) or auto-advance the set.
  useEffect(() => {
    if (holdLeft === null) return;
    if (holdLeft > 0) {
      if (holdLeft <= 3) Haptics.selectionAsync();
      return;
    }
    const h = holdSeconds(steps[stepIndex]?.target ?? '');
    if (h?.perSide && holdSide === 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      coach('Switch sides.');
      setHoldSide(2);
      setHoldLeft(h.secs);
    } else {
      setHoldLeft(null);
      setHoldSide(1);
      finishSet();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holdLeft]);

  // Starting a new set (or entering rest) clears any running hold timer.
  useEffect(() => {
    setHoldLeft(null);
    setHoldSide(1);
  }, [stepIndex, resting]);

  // Keep the screen awake through the live session so the coach can talk and the timer stays visible.
  useEffect(() => {
    if (!started || finished) return;
    activateKeepAwakeAsync(KEEP_AWAKE_TAG);
    return () => {
      deactivateKeepAwake(KEEP_AWAKE_TAG);
    };
  }, [started, finished]);

  // Silence the coach when leaving the workout.
  useEffect(() => () => stopSpeaking(), []);

  if (steps.length === 0) {
    return (
      <View style={styles.screenCenter}>
        <Text style={styles.bigEmoji}>🌿</Text>
        <Text style={styles.completeTitle}>Rest day</Text>
        <Text style={styles.completeBody}>Nothing scheduled today — take the rest, you&apos;ve earned it.</Text>
        <Pressable onPress={() => router.back()} style={styles.primaryBtn}>
          <Text style={styles.primaryText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  if (finished) {
    const kcal = weightKg ? estimateCalories(weightKg, durationMin) : null;
    const cardData = {
      focus: workout.focus,
      dateLabel: dayLabel(day),
      streak: currentStreak(streak, lastLoggedDay, day),
      durationMin,
      calories: kcal ?? undefined,
      items: workout.items.map((it) => ({ name: it.name, sets: it.sets, target: it.target })),
    };
    // Freestyle session: a clean "nice work" + share, no logging / feel / nudges (it doesn't count).
    if (freestyle) {
      return (
        <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={[styles.finishScroll, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl }]}>
          <Text style={styles.bigEmoji}>💪</Text>
          <Text style={styles.completeTitle}>Nice work!</Text>
          <Text style={styles.completeBody}>That&apos;s {workout.focus} done — a bonus session, just for the work.</Text>
          <View style={styles.cardWrap}>
            <WorkoutCard {...cardData} />
          </View>
          <Pressable onPress={() => setShowShare(true)} style={styles.shareBtn}>
            <Ionicons name="share-social-outline" size={18} color={colors.session} />
            <Text style={styles.shareBtnText}>Share workout</Text>
          </Pressable>
          <Pressable onPress={() => router.back()} style={styles.primaryBtn}>
            <Text style={styles.primaryText}>Done</Text>
          </Pressable>
          {showShare ? <ShareCardModal data={cardData} onClose={() => setShowShare(false)} /> : null}
        </ScrollView>
      );
    }
    const offerReminder = !reminderEnabled && (reminderOfferDay === null || day - reminderOfferDay >= REMINDER_REOFFER_DAYS);
    const acceptReminder = async () => {
      const ok = await requestNotificationPermission();
      if (!ok) {
        Alert.alert('Notifications are off', 'Allow notifications for Thrive in your phone settings to get reminders.');
        dismissReminderOffer(day);
        return;
      }
      setReminderEnabled(true);
      await refreshReminders({ lastLoggedDay: day, lapsed: false, enabled: true, customTime: null });
    };
    return (
      <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={[styles.finishScroll, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl }]}>
        <Text style={styles.bigEmoji}>🎉</Text>
        <Text style={styles.completeTitle}>Nice work! 👏</Text>
        <Text style={styles.completeBody}>That&apos;s today done. See you tomorrow.</Text>

        <View style={styles.cardWrap}>
          <WorkoutCard {...cardData} />
        </View>

        {weightKg && weightSetDay !== null && day - weightSetDay >= WEIGHT_NUDGE_DAYS ? (
          <View style={styles.weightCard}>
            <Text style={styles.weightCardText}>Quick check — still about {weightKg} kg?</Text>
            <View style={styles.weightCardRow}>
              <Pressable onPress={() => setWeight(weightKg, day)} style={styles.weightYes}>
                <Text style={styles.weightYesText}>Yes, same</Text>
              </Pressable>
              <Pressable onPress={() => router.push('/settings')} style={styles.weightUpdate}>
                <Text style={styles.weightUpdateText}>Update</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {offerReminder ? (
          <View style={styles.remindCard}>
            <Text style={styles.remindTitle}>Want a daily nudge?</Text>
            <Text style={styles.remindSub}>A morning and evening reminder on workout days, so you don&apos;t lose your streak.</Text>
            <View style={styles.remindRow}>
              <Pressable onPress={acceptReminder} style={styles.remindYes}>
                <Text style={styles.remindYesText}>Remind me</Text>
              </Pressable>
              <Pressable onPress={() => dismissReminderOffer(day)} style={styles.remindNo}>
                <Text style={styles.remindNoText}>Not now</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        <View style={styles.feelCard}>
          <Text style={styles.feelTitle}>How did it feel?</Text>
          <View style={styles.feelRow}>
            {FEELS.map((f) => (
              <Pressable
                key={f.id}
                onPress={() => {
                  setFeel(f.id);
                  rateWorkout(day, f.id);
                }}
                style={[styles.feelBtn, feel === f.id && styles.feelBtnOn]}
              >
                <Text style={styles.feelEmoji}>{f.emoji}</Text>
                <Text style={[styles.feelLabel, feel === f.id && styles.feelLabelOn]}>{f.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Pressable onPress={() => setShowShare(true)} style={styles.shareBtn}>
          <Ionicons name="share-social-outline" size={18} color={colors.session} />
          <Text style={styles.shareBtnText}>Share workout</Text>
        </Pressable>

        <Pressable onPress={() => router.back()} style={styles.primaryBtn}>
          <Text style={styles.primaryText}>Done</Text>
        </Pressable>

        {showShare ? <ShareCardModal data={cardData} onClose={() => setShowShare(false)} /> : null}
      </ScrollView>
    );
  }

  // Pre-workout overview — see today's moves (and any equipment you'll need) before you start.
  if (!started) {
    const needsBar = workout.items.some((i) => i.categoryId === 'pull');
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Text style={styles.close}>✕</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 96 }}>
          <Text style={styles.ovEyebrow}>{freestyle ? 'WORKOUT' : "TODAY'S WORKOUT"}</Text>
          <Text style={styles.ovTitle}>{workout.focus}</Text>
          <Text style={styles.ovMeta}>{workout.items.length} moves · {steps.length} sets</Text>
          {needsBar ? (
            <View style={styles.ovEquip}>
              <Ionicons name="barbell-outline" size={18} color={colors.warnText} />
              <Text style={styles.ovEquipText}>You&apos;ll need a bar or rings for the pulling moves.</Text>
            </View>
          ) : null}
          <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
            {workout.items.map((it, i) => (
              <View key={i} style={styles.ovRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ovName}>{it.name}</Text>
                  <Text style={styles.ovTarget}>
                    {it.sets ? `${it.sets} × ` : ''}
                    {formatTarget(it.target)}
                  </Text>
                </View>
                <Pressable onPress={() => setInfoItem({ exKey: it.exKey, name: it.name })} hitSlop={8}>
                  <Ionicons name="information-circle-outline" size={22} color={colors.muted} />
                </Pressable>
              </View>
            ))}
          </View>
        </ScrollView>
        <View style={[styles.ovFooter, { paddingBottom: insets.bottom + spacing.md }]}>
          <Pressable
            onPress={() => {
              setStartedAt(Date.now());
              setStarted(true);
              coach(`${introCue(workout.focus)} ${stepCue(steps[0])}`);
            }}
            style={styles.beginBtn}
          >
            <Text style={styles.beginBtnText}>Begin workout →</Text>
          </Pressable>
        </View>
        {infoItem ? <HowToSheet exKey={infoItem.exKey} name={infoItem.name} onClose={() => setInfoItem(null)} /> : null}
      </View>
    );
  }

  const step = steps[stepIndex];
  const next = steps[stepIndex + 1];
  const isLast = stepIndex + 1 >= steps.length;
  const completed = resting ? stepIndex + 1 : stepIndex;
  const pct = (completed / steps.length) * 100;

  const hold = holdSeconds(step.target);
  const startHold = () => {
    if (!hold) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setHoldSide(1);
    setHoldLeft(hold.secs);
  };
  const cancelHold = () => {
    setHoldLeft(null);
    setHoldSide(1);
  };

  // Undo an accidental Done: from rest, drop back to the set you just finished; otherwise step back.
  const canGoBack = resting || stepIndex > 0;
  const goBack = () => {
    if (resting) {
      setResting(false);
      coach(stepCue(step)); // re-announce the set you just finished
    } else if (stepIndex > 0) {
      setResting(false);
      setStepIndex(stepIndex - 1);
      coach(stepCue(steps[stepIndex - 1]));
    }
  };

  const toggleVoice = () => {
    const on = !voiceCoach;
    setVoiceCoach(on);
    if (!on) stopSpeaking();
  };

  return (
    <View style={{ flex: 1, backgroundColor: sunrise.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        {/* Undo (step back) on the left with a label; the exit ✕ sits on the right, well away from it.
            The fixed-width slot keeps the progress bar from shifting when Undo appears. */}
        <View style={styles.undoSlot}>
          {canGoBack ? (
            <Pressable onPress={goBack} hitSlop={10} style={styles.undoBtn}>
              <Ionicons name="arrow-undo-outline" size={20} color={sunrise.muted} />
              <Text style={styles.undoText}>Undo</Text>
            </Pressable>
          ) : null}
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${pct}%` }]} />
        </View>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Text style={styles.close}>✕</Text>
        </Pressable>
      </View>

      <View style={styles.body}>
        {resting ? (
          <>
            <Text style={styles.restLabel}>REST</Text>
            <Text style={styles.countdown}>{clock(restLeft)}</Text>
            {next ? <Text style={styles.upNext}>Next up: {next.item.name}</Text> : null}
            <View style={styles.btnRow}>
              <Pressable onPress={() => setRestLeft((s) => s + 15)} style={styles.secondaryBtn}>
                <Text style={styles.secondaryText}>+15s</Text>
              </Pressable>
              <Pressable onPress={goNext} style={styles.secondaryBtn}>
                <Text style={styles.secondaryText}>Skip ›</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <View style={styles.nameRow}>
              <Text style={styles.exerciseName}>{step.item.name}</Text>
              <Pressable onPress={() => setInfoItem({ exKey: step.item.exKey, name: step.item.name })} hitSlop={10}>
                <Ionicons name="information-circle-outline" size={22} color={sunrise.muted} />
              </Pressable>
            </View>
            {EXERCISE_BY_KEY[step.item.exKey]?.check ? <Text style={styles.checkEyebrow}>ONE-TIME CHECK</Text> : null}
            <Text style={styles.targetBig}>{formatTarget(step.target)}</Text>
            {step.kind === 'goal' ? (
              <Text style={styles.chasingHint}>Goal set — Level {step.item.level}: as close as you can</Text>
            ) : step.kind === 'work' ? (
              <Text style={styles.chasingHint}>Work set — solid reps at your level</Text>
            ) : step.item.chasing ? (
              <Text style={styles.chasingHint}>Level {step.item.level} goal — get as close as you can</Text>
            ) : null}
            {step.item.note ? <Text style={styles.note}>{step.item.note}</Text> : null}
            {hold ? (
              holdLeft !== null ? (
                <>
                  <Text style={styles.countdown}>{clock(holdLeft)}</Text>
                  {hold.perSide ? <Text style={styles.upNext}>Side {holdSide} of 2</Text> : null}
                </>
              ) : (
                <Pressable onPress={startHold} style={styles.timerBtn}>
                  <Ionicons name="timer-outline" size={18} color={sunrise.hot} />
                  <Text style={styles.timerBtnText}>Start timer · {hold.secs}s{hold.perSide ? '/side' : ''}</Text>
                </Pressable>
              )
            ) : null}
            <Pressable onPress={finishSet} style={styles.sunBtn}>
              <Text style={styles.sunBtnText}>{isLast ? 'Finish workout' : 'Done'}</Text>
            </Pressable>
            {holdLeft !== null ? (
              <Pressable onPress={cancelHold} hitSlop={8}>
                <Text style={styles.stopText}>Stop timer</Text>
              </Pressable>
            ) : null}
          </>
        )}
      </View>

      {/* Voice control lives down by the workout, labelled, instead of a bare icon in the header. */}
      <View style={[styles.muteBar, { paddingBottom: insets.bottom + spacing.md }]}>
        <Pressable onPress={toggleVoice} hitSlop={10} style={styles.muteBtn}>
          <Ionicons name={voiceCoach ? 'volume-high' : 'volume-mute'} size={18} color={voiceCoach ? sunrise.hot : sunrise.muted} />
          <Text style={[styles.muteText, voiceCoach && { color: sunrise.hot }]}>{voiceCoach ? 'Voice on' : 'Muted'}</Text>
        </Pressable>
      </View>

      {infoItem ? <HowToSheet exKey={infoItem.exKey} name={infoItem.name} onClose={() => setInfoItem(null)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screenCenter: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  bigEmoji: { fontSize: 56 },
  completeTitle: { color: colors.ink, fontSize: font.title, fontFamily: fonts.heavy, textAlign: 'center' },
  completeBody: { color: colors.muted, fontSize: font.body, textAlign: 'center', lineHeight: 22, fontFamily: fonts.regular },

  finishScroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl, gap: spacing.md },

  cardWrap: { marginVertical: spacing.sm },

  weightCard: { alignSelf: 'stretch', backgroundColor: colors.warnBg, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  weightCardText: { color: colors.warnText, fontSize: font.body, fontFamily: fonts.heavy, textAlign: 'center' },
  weightCardRow: { flexDirection: 'row', gap: spacing.sm },
  weightYes: { flex: 1, backgroundColor: colors.primary, borderRadius: radius.pill, paddingVertical: spacing.md, alignItems: 'center' },
  weightYesText: { color: colors.primaryText, fontSize: font.small, fontFamily: fonts.heavy },
  weightUpdate: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.pill, paddingVertical: spacing.md, alignItems: 'center' },
  weightUpdateText: { color: colors.warnText, fontSize: font.small, fontFamily: fonts.heavy },

  remindCard: { alignSelf: 'stretch', backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: spacing.xs },
  remindTitle: { color: colors.ink, fontSize: font.body, fontFamily: fonts.heavy },
  remindSub: { color: colors.muted, fontSize: font.small, fontFamily: fonts.regular },
  remindRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  remindYes: { flex: 1, backgroundColor: colors.primary, borderRadius: radius.pill, paddingVertical: spacing.md, alignItems: 'center' },
  remindYesText: { color: colors.primaryText, fontSize: font.small, fontFamily: fonts.heavy },
  remindNo: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingVertical: spacing.md, alignItems: 'center' },
  remindNoText: { color: colors.muted, fontSize: font.small, fontFamily: fonts.heavy },

  shareBtn: { flexDirection: 'row', alignSelf: 'stretch', justifyContent: 'center', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.session, borderRadius: radius.pill, paddingVertical: spacing.md + 2, marginTop: spacing.lg },
  shareBtnText: { color: colors.session, fontSize: font.body, fontFamily: fonts.heavy },

  feelCard: { alignSelf: 'stretch', backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: spacing.md },
  feelTitle: { color: colors.ink, fontSize: font.body, fontFamily: fonts.heavy },
  feelRow: { flexDirection: 'row', gap: spacing.sm },
  feelBtn: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  feelBtnOn: { borderColor: colors.primary, backgroundColor: '#F3F4F6' },
  feelEmoji: { fontSize: 26 },
  feelLabel: { color: colors.muted, fontSize: font.eyebrow, fontFamily: fonts.bold },
  feelLabelOn: { color: colors.primary, fontFamily: fonts.heavy },

  // Pre-workout overview
  ovEyebrow: { color: colors.session, fontSize: font.eyebrow, fontFamily: fonts.heavy, letterSpacing: 1 },
  ovTitle: { color: colors.ink, fontSize: font.title, fontFamily: fonts.display, marginTop: 2 },
  ovMeta: { color: colors.muted, fontSize: font.small, fontFamily: fonts.regular, marginTop: 2 },
  ovEquip: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.warnBg, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.lg },
  ovEquipText: { flex: 1, color: colors.warnText, fontSize: font.small, fontFamily: fonts.bold },
  ovRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md },
  ovName: { color: colors.ink, fontSize: font.body, fontFamily: fonts.heavy },
  ovTarget: { color: colors.muted, fontSize: font.small, fontFamily: fonts.regular, marginTop: 1 },
  ovFooter: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.lg, paddingTop: spacing.md, backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.border },
  beginBtn: { backgroundColor: colors.session, borderRadius: radius.pill, paddingVertical: spacing.md + 2, alignItems: 'center' },
  beginBtnText: { color: '#FFFFFF', fontSize: font.body, fontFamily: fonts.heavy },

  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  close: { color: sunrise.muted, fontSize: 22, fontFamily: fonts.bold },
  undoSlot: { width: 76, justifyContent: 'center' },
  undoBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  undoText: { color: sunrise.muted, fontSize: font.small, fontFamily: fonts.bold },
  muteBar: { alignItems: 'center', paddingTop: spacing.sm },
  muteBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: radius.pill },
  muteText: { color: sunrise.muted, fontSize: font.small, fontFamily: fonts.bold },
  progressTrack: { flex: 1, height: 8, backgroundColor: sunrise.track, borderRadius: radius.pill, overflow: 'hidden' },
  progressFill: { height: 8, backgroundColor: sunrise.hot, borderRadius: radius.pill },

  body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.xs },

  exerciseName: { color: sunrise.ink, fontSize: 30, fontFamily: fonts.display, textAlign: 'center', marginTop: 2, flexShrink: 1 },
  checkEyebrow: { color: sunrise.muted, fontSize: font.small, fontFamily: fonts.heavy, letterSpacing: 1.5, marginTop: spacing.sm },
  targetBig: { color: sunrise.hot, fontSize: 40, fontFamily: fonts.display, marginTop: spacing.xs },
  chasingHint: { color: sunrise.muted, fontSize: font.small, textAlign: 'center', fontFamily: fonts.regular },
  note: { color: sunrise.muted, fontSize: font.small, textAlign: 'center', fontFamily: fonts.regular },
  sunBtn: { backgroundColor: sunrise.hot, borderRadius: radius.pill, paddingVertical: spacing.md + 2, paddingHorizontal: spacing.xl, alignItems: 'center', marginTop: spacing.xxl, minWidth: 200 },
  sunBtnText: { color: '#FFFFFF', fontSize: font.body, fontFamily: fonts.heavy },
  primaryBtn: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingVertical: spacing.md + 2, paddingHorizontal: spacing.xl, alignItems: 'center', marginTop: spacing.xxl, minWidth: 200 },
  primaryText: { color: colors.primaryText, fontSize: font.body, fontFamily: fonts.heavy },

  restLabel: { color: sunrise.muted, fontSize: font.small, fontFamily: fonts.heavy, letterSpacing: 2 },
  countdown: { color: sunrise.soft, fontSize: 64, fontFamily: fonts.display, marginTop: spacing.xs },
  upNext: { color: sunrise.muted, fontSize: font.body, textAlign: 'center', marginTop: spacing.sm, fontFamily: fonts.regular },
  btnRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  secondaryBtn: { borderWidth: 1, borderColor: sunrise.track, borderRadius: radius.pill, paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.lg, backgroundColor: '#FFFFFF' },
  secondaryText: { color: sunrise.ink, fontSize: font.body, fontFamily: fonts.bold },

  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  timerBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderColor: sunrise.hot, borderRadius: radius.pill, paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.lg, marginTop: spacing.lg, backgroundColor: '#FFFFFF' },
  timerBtnText: { color: sunrise.hot, fontSize: font.body, fontFamily: fonts.bold },
  stopText: { color: sunrise.muted, fontSize: font.small, fontFamily: fonts.bold, marginTop: spacing.md, textDecorationLine: 'underline' },
});
