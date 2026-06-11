import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HowToSheet } from '@/components/HowToSheet';
import { colors, font, radius, spacing } from '@/constants/theme';
import { EXERCISE_BY_KEY, formatTarget } from '@/data/benchmarks';
import { todaysWorkout, type WorkoutItem } from '@/engine/dailyCard';
import { useAppStore } from '@/store/useAppStore';

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

// Summary rows for the finish card and the saved day log. Mixed (goal + work) exercises get a
// precomposed line; plain items keep sets × target.
function summarize(items: WorkoutItem[]): { name: string; sets: number | null; target: string }[] {
  return items.map((it) => {
    const mixed = it.chasing && it.workTarget !== it.target && (it.sets ?? 1) > 1;
    if (!mixed) return { name: it.name, sets: it.sets, target: it.target };
    return { name: it.name, sets: null, target: `goal try ${formatTarget(it.target)} · ${(it.sets ?? 1) - 1} × ${formatTarget(it.workTarget)}` };
  });
}

export default function Workout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const progress = useAppStore((s) => s.progress);
  const pullUnlocked = useAppStore((s) => s.pullUnlocked);
  const logToday = useAppStore((s) => s.logToday);
  const lastLoggedDay = useAppStore((s) => s.lastLoggedDay);

  const day = todayNumber();
  const workout = useMemo(() => todaysWorkout(progress, pullUnlocked, new Date()), [progress, pullUnlocked]);
  const steps = useMemo(() => buildCircuit(workout.items), [workout.items]);

  const [stepIndex, setStepIndex] = useState(0);
  const [resting, setResting] = useState(false);
  const [restLeft, setRestLeft] = useState(0);
  const [finished, setFinished] = useState(false);
  const [showHowTo, setShowHowTo] = useState(false);

  const goNext = () => {
    setResting(false);
    if (stepIndex + 1 >= steps.length) {
      if (lastLoggedDay !== day) {
        logToday(day, { focus: workout.focus, items: summarize(workout.items) });
      }
      setFinished(true);
    } else {
      setStepIndex(stepIndex + 1);
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
    return (
      <View style={styles.screenCenter}>
        <Text style={styles.bigEmoji}>🎉</Text>
        <Text style={styles.completeTitle}>Nice work! 👏</Text>
        <Text style={styles.completeBody}>That&apos;s today done. See you tomorrow.</Text>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryFocus}>{workout.focus}</Text>
          {summarize(workout.items).map((it, i) => (
            <View key={i} style={styles.summaryRow}>
              <Text style={styles.summaryName}>{it.name}</Text>
              <Text style={styles.summaryTarget}>
                {it.sets ? `${it.sets} × ` : ''}
                {formatTarget(it.target)}
              </Text>
            </View>
          ))}
        </View>
        <Pressable onPress={() => router.back()} style={styles.primaryBtn}>
          <Text style={styles.primaryText}>Done</Text>
        </Pressable>
      </View>
    );
  }

  const step = steps[stepIndex];
  const next = steps[stepIndex + 1];
  const isLast = stepIndex + 1 >= steps.length;
  const completed = resting ? stepIndex + 1 : stepIndex;
  const pct = (completed / steps.length) * 100;

  const onDoneSet = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (step.restSec && step.restSec > 0) {
      setRestLeft(step.restSec);
      setResting(true);
    } else {
      goNext();
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Text style={styles.close}>✕</Text>
        </Pressable>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${pct}%` }]} />
        </View>
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
              <Pressable onPress={() => setShowHowTo(true)} hitSlop={10}>
                <Ionicons name="information-circle-outline" size={22} color={colors.muted} />
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
            <Pressable onPress={onDoneSet} style={styles.primaryBtn}>
              <Text style={styles.primaryText}>{isLast ? 'Finish workout' : 'Done'}</Text>
            </Pressable>
          </>
        )}
      </View>

      {showHowTo ? <HowToSheet exKey={step.item.exKey} name={step.item.name} onClose={() => setShowHowTo(false)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screenCenter: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  bigEmoji: { fontSize: 56 },
  completeTitle: { color: colors.ink, fontSize: font.title, fontWeight: '800', textAlign: 'center' },
  completeBody: { color: colors.muted, fontSize: font.body, textAlign: 'center', lineHeight: 22 },

  summaryCard: { alignSelf: 'stretch', backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginTop: spacing.sm, gap: spacing.sm },
  summaryFocus: { color: colors.muted, fontSize: font.eyebrow, fontWeight: '800', letterSpacing: 1 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  summaryName: { color: colors.text, fontSize: font.small, fontWeight: '700', flexShrink: 1 },
  summaryTarget: { color: colors.muted, fontSize: font.small, textAlign: 'right', flexShrink: 1 },

  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  close: { color: colors.muted, fontSize: 22, fontWeight: '700' },
  progressTrack: { flex: 1, height: 8, backgroundColor: colors.track, borderRadius: radius.pill, overflow: 'hidden' },
  progressFill: { height: 8, backgroundColor: colors.primary, borderRadius: radius.pill },

  body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.xs },

  exerciseName: { color: colors.ink, fontSize: 30, fontWeight: '900', textAlign: 'center', marginTop: 2, flexShrink: 1 },
  checkEyebrow: { color: colors.muted, fontSize: font.small, fontWeight: '800', letterSpacing: 1.5, marginTop: spacing.sm },
  targetBig: { color: colors.primary, fontSize: 40, fontWeight: '900', marginTop: spacing.xs },
  chasingHint: { color: colors.muted, fontSize: font.small, textAlign: 'center' },
  note: { color: colors.muted, fontSize: font.small, textAlign: 'center', fontStyle: 'italic' },
  primaryBtn: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingVertical: spacing.md + 2, paddingHorizontal: spacing.xl, alignItems: 'center', marginTop: spacing.xxl, minWidth: 200 },
  primaryText: { color: colors.primaryText, fontSize: font.body, fontWeight: '800' },

  restLabel: { color: colors.muted, fontSize: font.small, fontWeight: '800', letterSpacing: 2 },
  countdown: { color: colors.text, fontSize: 64, fontWeight: '900', marginTop: spacing.xs },
  upNext: { color: colors.muted, fontSize: font.body, textAlign: 'center', marginTop: spacing.sm },
  btnRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  secondaryBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.lg, backgroundColor: colors.surface },
  secondaryText: { color: colors.text, fontSize: font.body, fontWeight: '700' },

  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
});
