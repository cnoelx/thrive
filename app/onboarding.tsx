import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, font, radius, spacing } from '@/constants/theme';
import type { CategoryId } from '@/data/benchmarks';
import { EQUIPMENT_OPTIONS, GOAL_OPTIONS, PARQ_QUESTIONS, PLACEMENT_ANCHORS } from '@/data/onboarding';
import type { Equipment, GoalId, Option } from '@/data/onboarding';
import { progressFromPlacement } from '@/engine/progression';
import type { ProgressState } from '@/engine/progression';
import { useAppStore } from '@/store/useAppStore';

type Step = 'welcome' | 'parq' | 'equipment' | 'goal' | 'experience';
// NOTE: 'parq' (safety screen), 'equipment', and 'goal' are intentionally left out of the flow
// for now. Their screens still live in the code below — re-add them to ORDER to switch them back on.
const ORDER: Step[] = ['welcome', 'experience'];

type Experience = 'new' | 'experienced';

const EXPERIENCE_OPTIONS: Option<Experience>[] = [
  { id: 'new', label: "I'm new to this", hint: 'Start at the beginning' },
  { id: 'experienced', label: 'Find my level', hint: 'A quick quiz sets where you start' },
];

export default function Onboarding() {
  const router = useRouter();
  const onboarded = useAppStore((s) => s.onboarded);
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);
  const insets = useSafeAreaInsets();

  const [stepIndex, setStepIndex] = useState(0);
  const [parqYes, setParqYes] = useState(false);
  // Equipment & goal screens are out of the flow for now, so these default quietly.
  const [equipment, setEquipment] = useState<Equipment | null>('none');
  const [goal, setGoal] = useState<GoalId | null>('health');
  const [experience, setExperience] = useState<Experience | null>(null);

  // Placement (only for "I already train").
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState<Partial<Record<CategoryId, number>>>({});

  if (onboarded) return <Redirect href="/" />;

  const finish = (initialProgress?: ProgressState) => {
    if (equipment && goal) {
      completeOnboarding({ equipment, goal, healthFlag: parqYes }, initialProgress);
      router.replace('/');
    }
  };

  // ---- Placement: one tap per category ----
  if (placing) {
    const setLevel = (categoryId: CategoryId, level: number) =>
      setPlaced((prev) => {
        const cur = prev[categoryId] ?? 0;
        const out = { ...prev };
        if (level === 0 || cur === level) delete out[categoryId]; // tap again to clear
        else out[categoryId] = level;
        return out;
      });

    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.kicker}>FIND YOUR LEVEL</Text>
          <Text style={styles.h1}>What can you do today?</Text>
          <Text style={styles.body}>Tap the most you can do. Skip anything you can&apos;t.</Text>

          <View style={{ gap: spacing.md, marginTop: spacing.sm }}>
            {PLACEMENT_ANCHORS.map((a) => {
              const cur = placed[a.categoryId] ?? 0;
              return (
                <View key={a.categoryId} style={styles.placeCard}>
                  <View style={styles.placeHead}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.placeExercise}>{a.exercise}</Text>
                      {a.unit ? <Text style={styles.placeUnit}>{a.unit}</Text> : null}
                    </View>
                    {cur > 0 ? (
                      <View style={styles.levelTag}>
                        <Text style={styles.levelTagText}>Level {cur}</Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.chipRow}>
                    <Chip label="Not yet" selected={cur === 0} onPress={() => setLevel(a.categoryId, 0)} />
                    {a.thresholds.map((t) => (
                      <Chip
                        key={t.level}
                        label={t.label}
                        selected={cur === t.level}
                        onPress={() => setLevel(a.categoryId, t.level)}
                      />
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          <Pressable onPress={() => setPlacing(false)} hitSlop={8} style={styles.backBtn}>
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <Pressable onPress={() => finish(progressFromPlacement(placed))} style={styles.nextBtn}>
            <Text style={styles.nextText}>Place me</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ---- Standard steps ----
  const step: Step = ORDER[stepIndex] ?? 'welcome';

  const canAdvance =
    step === 'welcome' ||
    step === 'parq' ||
    (step === 'equipment' && equipment !== null) ||
    (step === 'goal' && goal !== null) ||
    (step === 'experience' && experience !== null);

  const next = () => {
    if (step === 'experience') {
      if (experience === 'experienced') {
        setPlacing(true);
      } else {
        finish(); // "new" → start at Level 0
      }
      return;
    }
    setStepIndex((i) => Math.min(i + 1, ORDER.length - 1));
  };
  const back = () => setStepIndex((i) => Math.max(i - 1, 0));

  const ctaLabel = step === 'experience' ? (experience === 'experienced' ? 'Continue' : 'Start') : 'Continue';

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {step === 'welcome' && <Welcome />}
        {step === 'parq' && <Parq parqYes={parqYes} setParqYes={setParqYes} />}
        {step === 'equipment' && (
          <ChoiceStep
            title="What can you train with?"
            subtitle="Just for your Pull exercises — change it anytime."
            options={EQUIPMENT_OPTIONS}
            value={equipment}
            onChange={setEquipment}
          />
        )}
        {step === 'goal' && (
          <ChoiceStep
            title="What brings you here?"
            subtitle="We'll keep this in mind. Everyone starts with the same strong foundation."
            options={GOAL_OPTIONS}
            value={goal}
            onChange={setGoal}
          />
        )}
        {step === 'experience' && (
          <ChoiceStep
            title="Where should we start you?"
            subtitle="Either way, you'll level up as you train."
            options={EXPERIENCE_OPTIONS}
            value={experience}
            onChange={setExperience}
          />
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        {stepIndex > 0 ? (
          <Pressable onPress={back} hitSlop={8} style={styles.backBtn}>
            <Text style={styles.backText}>Back</Text>
          </Pressable>
        ) : (
          <View style={{ width: 56 }} />
        )}
        <Text style={styles.progress}>
          {stepIndex + 1} / {ORDER.length}
        </Text>
        <Pressable onPress={next} disabled={!canAdvance} style={[styles.nextBtn, !canAdvance && styles.nextBtnDisabled]}>
          <Text style={styles.nextText}>{ctaLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Welcome() {
  return (
    <View style={styles.welcomeWrap}>
      <Image source={require('../assets/images/icon.png')} style={styles.logo} />
      <Text style={styles.wordmark}>Thrive</Text>
      <Text style={styles.tagline}>Strong for modern life</Text>
    </View>
  );
}

function Parq({ parqYes, setParqYes }: { parqYes: boolean; setParqYes: (v: boolean) => void }) {
  return (
    <View style={{ gap: spacing.md }}>
      <Text style={styles.kicker}>SAFETY CHECK</Text>
      <Text style={styles.h1}>Quick safety check</Text>
      <Text style={styles.body}>Read these. If any apply to you, it&apos;s worth a quick word with your doctor first.</Text>
      <View style={styles.parqCard}>
        {PARQ_QUESTIONS.map((q, i) => (
          <View key={i} style={[styles.parqRow, i === 0 && styles.parqRowFirst]}>
            <Text style={styles.parqDot}>•</Text>
            <Text style={styles.parqQ}>{q}</Text>
          </View>
        ))}
      </View>
      <Pressable onPress={() => setParqYes(!parqYes)} style={[styles.toggle, parqYes && styles.toggleOn]}>
        <View style={[styles.checkbox, parqYes && styles.checkboxOn]}>
          {parqYes ? <Text style={styles.checkmark}>{'✓'}</Text> : null}
        </View>
        <Text style={styles.toggleText}>One or more of these applies to me</Text>
      </Pressable>
      {parqYes ? (
        <View style={styles.warn}>
          <Text style={styles.warnText}>
            Please check with a doctor before starting. You can still continue — just take it easy and stop if anything
            hurts.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function ChoiceStep<T extends string>(props: {
  title: string;
  subtitle?: string;
  options: Option<T>[];
  value: T | null;
  onChange: (v: T) => void;
}) {
  const { title, subtitle, options, value, onChange } = props;
  return (
    <View style={{ gap: spacing.md }}>
      <Text style={styles.h1}>{title}</Text>
      {subtitle ? <Text style={styles.body}>{subtitle}</Text> : null}
      <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
        {options.map((opt) => {
          const selected = opt.id === value;
          return (
            <Pressable key={opt.id} onPress={() => onChange(opt.id)} style={[styles.option, selected && styles.optionSelected]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionLabel}>{opt.label}</Text>
                {opt.hint ? <Text style={styles.optionHint}>{opt.hint}</Text> : null}
              </View>
              <View style={[styles.check, selected && styles.checkOn]}>
                {selected ? <Text style={styles.checkTick}>{'✓'}</Text> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, selected && styles.chipOn]}>
      <Text style={[styles.chipText, selected && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md, flexGrow: 1 },
  kicker: { color: colors.primary, fontSize: font.small, fontWeight: '700', letterSpacing: 1 },
  h1: { color: colors.text, fontSize: font.title, fontWeight: '800' },
  body: { color: colors.muted, fontSize: font.body, lineHeight: 22 },

  // Welcome (page 1, minimal: logo + text)
  welcomeWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  logo: {
    width: 96,
    height: 96,
    borderRadius: 24,
    shadowColor: '#0C1410',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  wordmark: { color: colors.ink, fontSize: 44, fontWeight: '900', letterSpacing: -1, marginTop: spacing.sm },
  tagline: { color: colors.muted, fontSize: font.body },
  parqCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.lg },
  parqRow: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  parqRowFirst: { borderTopWidth: 0 },
  parqDot: { color: colors.primary, fontSize: font.body, lineHeight: 20, fontWeight: '900' },
  parqQ: { flex: 1, color: colors.text, fontSize: font.small, lineHeight: 20 },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  toggleOn: { borderColor: colors.primary },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkmark: { color: colors.primaryText, fontSize: 14, fontWeight: '900' },
  toggleText: { color: colors.text, fontSize: font.body, flex: 1 },
  warn: { backgroundColor: colors.warnBg, borderRadius: radius.md, padding: spacing.md },
  warnText: { color: colors.warnText, fontSize: font.small, lineHeight: 19 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  optionSelected: { borderColor: colors.primary, backgroundColor: '#F0FAF4' },
  optionLabel: { color: colors.ink, fontSize: font.body, fontWeight: '800' },
  optionHint: { color: colors.muted, fontSize: font.small, marginTop: 2 },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkTick: { color: colors.primaryText, fontSize: 14, fontWeight: '900' },

  // placement
  placeCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.lg },
  placeExercise: { color: colors.text, fontSize: font.body, fontWeight: '800' },
  placeUnit: { color: colors.muted, fontSize: font.small, marginTop: 1 },
  placeHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  levelTag: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 3 },
  levelTagText: { color: colors.primaryText, fontSize: font.small, fontWeight: '800' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontSize: font.small, fontWeight: '700' },
  chipTextOn: { color: colors.primaryText },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  backBtn: { paddingVertical: spacing.sm, width: 56 },
  backText: { color: colors.muted, fontSize: font.body },
  progress: { color: colors.muted, fontSize: font.small },
  nextBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.pill, minWidth: 110, alignItems: 'center' },
  nextBtnDisabled: { backgroundColor: '#A7E3C2' },
  nextText: { color: colors.primaryText, fontSize: font.body, fontWeight: '800' },
});
