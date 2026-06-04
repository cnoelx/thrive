import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, font, radius, spacing } from '@/constants/theme';
import { CATEGORY_BY_ID } from '@/data/benchmarks';
import { todaysWorkout } from '@/engine/dailyCard';
import { useAppStore } from '@/store/useAppStore';

function todayNumber(): number {
  const now = new Date();
  return Math.floor((now.getTime() - now.getTimezoneOffset() * 60000) / 86400000);
}

export default function Workout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const progress = useAppStore((s) => s.progress);
  const logToday = useAppStore((s) => s.logToday);
  const lastLoggedDay = useAppStore((s) => s.lastLoggedDay);

  const day = todayNumber();
  const workout = useMemo(() => todaysWorkout(progress, new Date()), [progress]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const doneCount = workout.items.filter((i) => checked[i.exKey]).length;
  const allDone = workout.items.length > 0 && doneCount === workout.items.length;

  const toggle = (k: string) => setChecked((p) => ({ ...p, [k]: !p[k] }));

  const finish = () => {
    if (lastLoggedDay !== day) logToday(day);
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Text style={styles.close}>✕</Text>
        </Pressable>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md }}>
        <Text style={styles.kicker}>{workout.focus.toUpperCase()}</Text>
        <Text style={styles.title}>Check off as you go</Text>

        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${(doneCount / Math.max(workout.items.length, 1)) * 100}%` }]} />
        </View>
        <Text style={styles.progressText}>
          {doneCount} of {workout.items.length} done
        </Text>

        <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          {workout.items.map((item) => {
            const isChecked = !!checked[item.exKey];
            const detail = item.sets != null ? `${item.sets} sets × ${item.target}` : item.target;
            return (
              <Pressable key={item.exKey} onPress={() => toggle(item.exKey)} style={[styles.row, isChecked && styles.rowDone]}>
                <View style={[styles.box, isChecked && styles.boxOn]}>
                  {isChecked ? <Text style={styles.tick}>{'✓'}</Text> : null}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tag}>{CATEGORY_BY_ID[item.categoryId].short}</Text>
                  <Text style={[styles.move, isChecked && styles.moveDone]}>{item.name}</Text>
                  <Text style={styles.target}>
                    {detail}
                    {item.note ? ` · ${item.note}` : ''}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Pressable onPress={finish} disabled={!allDone} style={[styles.finishBtn, !allDone && styles.finishBtnOff]}>
          <Text style={[styles.finishText, !allDone && styles.finishTextOff]}>
            {allDone ? 'Complete workout' : `Check all ${workout.items.length} to finish`}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  close: { color: colors.muted, fontSize: 22, fontWeight: '700' },
  kicker: { color: colors.primary, fontSize: font.eyebrow, fontWeight: '800', letterSpacing: 1.5 },
  title: { color: colors.text, fontSize: font.title, fontWeight: '800', marginTop: 2 },
  barTrack: { height: 10, backgroundColor: colors.track, borderRadius: radius.pill, overflow: 'hidden', marginTop: spacing.md },
  barFill: { height: 10, backgroundColor: colors.primary, borderRadius: radius.pill },
  progressText: { color: colors.muted, fontSize: font.small },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowDone: { backgroundColor: '#F3FAF6', borderColor: colors.primary },
  box: { width: 26, height: 26, borderRadius: 8, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  tick: { color: colors.primaryText, fontSize: 15, fontWeight: '900' },
  tag: { color: colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  move: { color: colors.text, fontSize: font.body, fontWeight: '700', marginTop: 1 },
  moveDone: { textDecorationLine: 'line-through', color: colors.muted },
  target: { color: colors.muted, fontSize: font.small },

  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  finishBtn: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingVertical: spacing.md + 2, alignItems: 'center' },
  finishBtnOff: { backgroundColor: colors.track },
  finishText: { color: colors.primaryText, fontSize: font.body, fontWeight: '800' },
  finishTextOff: { color: colors.muted },
});
