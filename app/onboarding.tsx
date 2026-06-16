import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, font, fonts, radius, spacing } from '@/constants/theme';
import type { CategoryId } from '@/data/benchmarks';
import { GOAL_OPTIONS, PARQ_QUESTIONS, PLACEMENT_ANCHORS } from '@/data/onboarding';
import type { Equipment, GoalId, Option } from '@/data/onboarding';
import { progressFromPlacement, startLevelsFromMax } from '@/engine/progression';
import type { ProgressState } from '@/engine/progression';
import { useAppStore } from '@/store/useAppStore';

type Step = 'welcome' | 'name' | 'body' | 'parq' | 'equipment' | 'goal' | 'experience';
// NOTE: 'parq' (safety screen) and 'goal' are intentionally left out of the flow for now. Their
// screens still live in the code below — re-add them to ORDER to switch them back on.
const ORDER: Step[] = ['welcome', 'name', 'body', 'equipment', 'experience'];

type PullEquipment = 'bar' | 'rings' | 'neither';
const EQUIPMENT_CARDS: { id: PullEquipment; emoji: string; label: string; hint: string }[] = [
  { id: 'bar', emoji: '🏋️', label: "I've got a pull-up bar", hint: 'Doorway, wall-mounted, or similar' },
  { id: 'rings', emoji: '🪢', label: "I've got rings or TRX", hint: 'Gymnastic rings or suspension straps' },
  { id: 'neither', emoji: '🤲', label: 'Neither right now', hint: "We'll swap in a back exercise instead" },
];

type Experience = 'new' | 'experienced';

const EXPERIENCE_OPTIONS: Option<Experience>[] = [
  { id: 'new', label: "I'm new to this", hint: "We'll start you at the beginning" },
  { id: 'experienced', label: 'Find my level', hint: 'A few quick taps set where you start' },
];

export default function Onboarding() {
  const router = useRouter();
  const onboarded = useAppStore((s) => s.onboarded);
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);
  const setName = useAppStore((s) => s.setName);
  const setWeight = useAppStore((s) => s.setWeight);
  const unlockPull = useAppStore((s) => s.unlockPull);
  const insets = useSafeAreaInsets();

  const [stepIndex, setStepIndex] = useState(0);
  const [parqYes, setParqYes] = useState(false);
  // Goal screen is out of the flow for now, so it defaults quietly. Equipment is replaced by the
  // new pullUnlocked-driven step; the legacy 'equipment' field on Profile stays defaulted.
  const [equipment] = useState<Equipment | null>('none');
  const [goal, setGoal] = useState<GoalId | null>('health');
  const [experience, setExperience] = useState<Experience | null>(null);
  const [nameDraft, setNameDraft] = useState('');
  const [weightDraft, setWeightDraft] = useState('');
  const [pullEquip, setPullEquip] = useState<PullEquipment | null>(null);

  // Placement (only for "I already train").
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState<Partial<Record<CategoryId, number>>>({});

  if (onboarded) return <Redirect href="/" />;

  const finish = (initialProgress?: ProgressState) => {
    if (equipment && goal) {
      setName(nameDraft.trim());
      const kg = Math.round(parseFloat(weightDraft.replace(',', '.')));
      const today = Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000);
      setWeight(Number.isFinite(kg) && kg > 0 ? kg : null, today);
      if (pullEquip === 'bar' || pullEquip === 'rings') unlockPull();
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
          <Text style={styles.body}>
            For each exercise, pick the most you can do in one go. We&apos;ll start you one notch below your max —
            workouts repeat it over a few sets.
          </Text>

          <View style={{ gap: spacing.lg, marginTop: spacing.sm }}>
            {PLACEMENT_ANCHORS.filter((a) => a.categoryId !== 'pull' || pullEquip === 'bar' || pullEquip === 'rings').map((a) => {
              const cur = placed[a.categoryId] ?? 0;
              return (
                <View key={a.categoryId} style={styles.placeCard}>
                  <View style={styles.placeHead}>
                    <Text style={styles.placeExercise}>{a.exercise}</Text>
                    {cur > 0 ? (
                      <View style={styles.levelTag}>
                        <Text style={styles.levelTagText}>Start: Level {cur - 1}</Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.levelList}>
                    <LevelRow label="Not yet" selected={cur === 0} onPress={() => setLevel(a.categoryId, 0)} />
                    {a.thresholds.map((t) => (
                      <LevelRow key={t.level} label={t.label} selected={cur === t.level} onPress={() => setLevel(a.categoryId, t.level)} />
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
          <Pressable onPress={() => finish(progressFromPlacement(startLevelsFromMax(placed)))} style={styles.nextBtn}>
            <Text style={styles.nextText}>Set my levels</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ---- Standard steps ----
  const step: Step = ORDER[stepIndex] ?? 'welcome';

  const canAdvance =
    step === 'welcome' ||
    step === 'name' ||
    step === 'body' ||
    step === 'parq' ||
    (step === 'equipment' && pullEquip !== null) ||
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
        {step === 'name' && <NameStep value={nameDraft} onChange={setNameDraft} />}
        {step === 'body' && <WeightStep value={weightDraft} onChange={setWeightDraft} />}
        {step === 'parq' && <Parq parqYes={parqYes} setParqYes={setParqYes} />}
        {step === 'equipment' && <EquipmentStep value={pullEquip} onChange={setPullEquip} />}
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
            subtitle="Either way works — you'll level up as you go."
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

function EquipmentStep({ value, onChange }: { value: PullEquipment | null; onChange: (v: PullEquipment) => void }) {
  return (
    <View style={{ gap: spacing.md }}>
      <Text style={styles.h1}>What do you have at home?</Text>
      <Text style={styles.body}>This sets up your Pull training — we&apos;ll only include it if you&apos;ve got something to pull on.</Text>
      <View style={{ gap: spacing.md, marginTop: spacing.sm }}>
        {EQUIPMENT_CARDS.map((card) => {
          const selected = card.id === value;
          return (
            <Pressable key={card.id} onPress={() => onChange(card.id)} style={[styles.equipCard, selected && styles.equipCardSelected]}>
              <Text style={styles.equipEmoji}>{card.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.equipLabel}>{card.label}</Text>
                <Text style={styles.equipHint}>{card.hint}</Text>
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

function NameStep({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <View style={{ gap: spacing.md }}>
      <Text style={styles.h1}>What should we call you?</Text>
      <Text style={styles.body}>Just so we can say hi. Change it whenever you like.</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="Your name"
        placeholderTextColor={colors.muted}
        autoFocus
        maxLength={30}
        returnKeyType="done"
        style={styles.nameInput}
      />
    </View>
  );
}

function WeightStep({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <View style={{ gap: spacing.md }}>
      <Text style={styles.h1}>Your weight?</Text>
      <Text style={styles.body}>Optional — only used to estimate calories after workouts. It stays on your phone.</Text>
      <View style={styles.weightRow}>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder="70"
          placeholderTextColor={colors.muted}
          keyboardType="numeric"
          maxLength={3}
          returnKeyType="done"
          style={styles.weightInput}
        />
        <Text style={styles.weightUnit}>kg</Text>
      </View>
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

function LevelRow({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.levelRow, selected && styles.levelRowOn]}>
      <View style={[styles.radio, selected && styles.radioOn]}>{selected ? <View style={styles.radioDot} /> : null}</View>
      <Text style={[styles.levelRowText, selected && styles.levelRowTextOn]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md, flexGrow: 1 },
  kicker: { color: colors.link, fontSize: font.small, fontFamily: fonts.bold, letterSpacing: 1 },
  h1: { color: colors.ink, fontSize: font.title, fontFamily: fonts.heavy },
  body: { color: colors.muted, fontSize: font.body, lineHeight: 22, fontFamily: fonts.regular },
  equipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  equipCardSelected: { borderColor: colors.primary, backgroundColor: '#F3F4F6' },
  equipEmoji: { fontSize: 48, width: 64, textAlign: 'center' },
  equipLabel: { color: colors.ink, fontSize: font.body, fontFamily: fonts.heavy },
  equipHint: { color: colors.muted, fontSize: font.small, marginTop: 2, fontFamily: fonts.regular },
  nameInput: {
    color: colors.ink,
    fontSize: font.title,
    fontFamily: fonts.heavy,
    borderBottomWidth: 2,
    borderBottomColor: colors.link,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  weightRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, marginTop: spacing.sm },
  weightInput: {
    color: colors.ink,
    fontSize: font.title,
    fontFamily: fonts.heavy,
    borderBottomWidth: 2,
    borderBottomColor: colors.link,
    paddingVertical: spacing.sm,
    minWidth: 88,
    textAlign: 'center',
  },
  weightUnit: { color: colors.muted, fontSize: font.h2, fontFamily: fonts.bold },

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
  wordmark: { color: colors.ink, fontSize: 44, fontFamily: fonts.display, letterSpacing: -1, marginTop: spacing.sm },
  tagline: { color: colors.muted, fontSize: font.body, fontFamily: fonts.regular },
  parqCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.lg },
  parqRow: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  parqRowFirst: { borderTopWidth: 0 },
  parqDot: { color: colors.link, fontSize: font.body, lineHeight: 20, fontFamily: fonts.display },
  parqQ: { flex: 1, color: colors.text, fontSize: font.small, lineHeight: 20, fontFamily: fonts.regular },
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
  checkmark: { color: colors.primaryText, fontSize: 14, fontFamily: fonts.display },
  toggleText: { color: colors.text, fontSize: font.body, flex: 1, fontFamily: fonts.regular },
  warn: { backgroundColor: colors.warnBg, borderRadius: radius.md, padding: spacing.md },
  warnText: { color: colors.warnText, fontSize: font.small, lineHeight: 19, fontFamily: fonts.regular },
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
  optionSelected: { borderColor: colors.primary, backgroundColor: '#F3F4F6' },
  optionLabel: { color: colors.ink, fontSize: font.body, fontFamily: fonts.heavy },
  optionHint: { color: colors.muted, fontSize: font.small, marginTop: 2, fontFamily: fonts.regular },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkTick: { color: colors.primaryText, fontSize: 14, fontFamily: fonts.display },

  // placement
  placeCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.lg },
  placeExercise: { flex: 1, color: colors.ink, fontSize: font.h2, fontFamily: fonts.heavy },
  placeHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  levelTag: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 3 },
  levelTagText: { color: colors.primaryText, fontSize: font.small, fontFamily: fonts.heavy },
  levelList: { marginTop: spacing.md, gap: 6 },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  levelRowOn: { borderColor: colors.primary, backgroundColor: '#F3F4F6' },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  levelRowText: { flex: 1, color: colors.text, fontSize: font.small, fontFamily: fonts.bold, lineHeight: 19 },
  levelRowTextOn: { color: colors.ink, fontFamily: fonts.bold },

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
  backText: { color: colors.muted, fontSize: font.body, fontFamily: fonts.regular },
  progress: { color: colors.muted, fontSize: font.small, fontFamily: fonts.regular },
  nextBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.pill, minWidth: 110, alignItems: 'center' },
  nextBtnDisabled: { backgroundColor: '#A7E3C2' },
  nextText: { color: colors.primaryText, fontSize: font.body, fontFamily: fonts.heavy },
});
