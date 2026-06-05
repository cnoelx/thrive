import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, font, radius, spacing } from '@/constants/theme';
import { formatTarget } from '@/data/benchmarks';
import { FORM_CUES } from '@/data/formCues';
import { todaysWorkout, type WorkoutItem } from '@/engine/dailyCard';
import { useAppStore } from '@/store/useAppStore';

function todayNumber(): number {
  const now = new Date();
  return Math.floor((now.getTime() - now.getTimezoneOffset() * 60000) / 86400000);
}

type CircuitStep = { item: WorkoutItem; restSec: number | null };

// Circuit: one set of each exercise per round, repeated for as many rounds as the highest set
// count that day. Exercises with fewer sets drop out of the later rounds. No rest after the last set.
function buildCircuit(items: WorkoutItem[]): CircuitStep[] {
  const setsOf = (it: WorkoutItem) => it.sets ?? 1;
  const totalRounds = items.length ? Math.max(...items.map(setsOf)) : 0;
  const steps: CircuitStep[] = [];
  for (let r = 1; r <= totalRounds; r++) {
    for (const it of items) {
      if (setsOf(it) >= r) steps.push({ item: it, restSec: it.restSec ?? null });
    }
  }
  if (steps.length > 0) steps[steps.length - 1].restSec = null;
  return steps;
}

function clock(sec: number): string {
  const s = Math.max(0, sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function Workout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const progress = useAppStore((s) => s.progress);
  const logToday = useAppStore((s) => s.logToday);
  const lastLoggedDay = useAppStore((s) => s.lastLoggedDay);

  const day = todayNumber();
  const workout = useMemo(() => todaysWorkout(progress, new Date()), [progress]);
  const steps = useMemo(() => buildCircuit(workout.items), [workout.items]);

  const [stepIndex, setStepIndex] = useState(0);
  const [resting, setResting] = useState(false);
  const [restLeft, setRestLeft] = useState(0);
  const [finished, setFinished] = useState(false);
  const [showHowTo, setShowHowTo] = useState(false);

  const goNext = () => {
    setResting(false);
    if (stepIndex + 1 >= steps.length) {
      if (lastLoggedDay !== day) logToday(day);
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
        <Text style={styles.completeBody}>Nothing scheduled today. Recover well.</Text>
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
        <Text style={styles.completeTitle}>Workout complete</Text>
        <Text style={styles.completeBody}>Nice work — that&apos;s today done.</Text>
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
            {next ? <Text style={styles.upNext}>Up next: {next.item.name}</Text> : null}
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
            <Text style={styles.targetBig}>{formatTarget(step.item.target)}</Text>
            {step.item.note ? <Text style={styles.note}>{step.item.note}</Text> : null}
            <Pressable onPress={onDoneSet} style={styles.primaryBtn}>
              <Text style={styles.primaryText}>{isLast ? 'Finish workout' : 'Done'}</Text>
            </Pressable>
          </>
        )}
      </View>

      <Modal visible={showHowTo} transparent animationType="fade" onRequestClose={() => setShowHowTo(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowHowTo(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.sheetSub}>HOW TO DO IT</Text>
            <Text style={styles.sheetTitle}>{step.item.name}</Text>
            {(FORM_CUES[step.item.exKey] ?? []).map((cue, i) => (
              <View key={i} style={styles.cueRow}>
                <Text style={styles.cueDot}>•</Text>
                <Text style={styles.cueText}>{cue}</Text>
              </View>
            ))}
            <Text style={styles.disclaimer}>General guidance — not a substitute for a coach. Stop if anything hurts.</Text>
            <Pressable onPress={() => setShowHowTo(false)} style={styles.sheetClose}>
              <Text style={styles.sheetCloseText}>Got it</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screenCenter: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  bigEmoji: { fontSize: 56 },
  completeTitle: { color: colors.text, fontSize: font.title, fontWeight: '800', textAlign: 'center' },
  completeBody: { color: colors.muted, fontSize: font.body, textAlign: 'center', lineHeight: 22 },

  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  close: { color: colors.muted, fontSize: 22, fontWeight: '700' },
  progressTrack: { flex: 1, height: 8, backgroundColor: colors.track, borderRadius: radius.pill, overflow: 'hidden' },
  progressFill: { height: 8, backgroundColor: colors.primary, borderRadius: radius.pill },

  body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.xs },

  exerciseName: { color: colors.text, fontSize: 30, fontWeight: '900', textAlign: 'center', marginTop: 2, flexShrink: 1 },
  targetBig: { color: colors.primary, fontSize: 40, fontWeight: '900', marginTop: spacing.sm },
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
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(12,20,16,0.5)', alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  sheet: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.sm, width: '100%', maxWidth: 420 },
  sheetSub: { color: colors.primary, fontSize: font.eyebrow, fontWeight: '800', letterSpacing: 1, marginBottom: spacing.xs },
  sheetTitle: { color: colors.text, fontSize: font.h2, fontWeight: '800' },
  cueRow: { flexDirection: 'row', gap: spacing.sm },
  cueDot: { color: colors.primary, fontSize: font.body, fontWeight: '900', lineHeight: 22 },
  cueText: { flex: 1, color: colors.text, fontSize: font.body, lineHeight: 22 },
  disclaimer: { color: colors.muted, fontSize: font.small, fontStyle: 'italic', marginTop: spacing.sm },
  sheetClose: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.md },
  sheetCloseText: { color: colors.primaryText, fontSize: font.body, fontWeight: '800' },
});
