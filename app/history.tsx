import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, font, radius, spacing } from '@/constants/theme';
import { formatTarget } from '@/data/benchmarks';
import { dayNumberFromDate, longestStreak, monthGrid, type MonthCell } from '@/engine/history';
import { isRestDay } from '@/engine/streak';
import { useAppStore } from '@/store/useAppStore';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function History() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const loggedDays = useAppStore((s) => s.loggedDays);
  const workoutLog = useAppStore((s) => s.workoutLog);

  const now = new Date();
  const today = dayNumberFromDate(now);
  const [shown, setShown] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [openCell, setOpenCell] = useState<MonthCell | null>(null);
  const openLog = openCell ? workoutLog[openCell.dayNumber] : undefined;
  const atCurrentMonth = shown.year === now.getFullYear() && shown.month === now.getMonth();

  const prevMonth = () =>
    setShown((s) => (s.month === 0 ? { year: s.year - 1, month: 11 } : { year: s.year, month: s.month - 1 }));
  const nextMonth = () =>
    setShown((s) => (s.month === 11 ? { year: s.year + 1, month: 0 } : { year: s.year, month: s.month + 1 }));

  const weeks = monthGrid(shown.year, shown.month);
  const monthCount = weeks.flat().filter((c) => c !== null && loggedDays.includes(c.dayNumber)).length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>History</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}>
        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{loggedDays.length}</Text>
            <Text style={styles.statLabel}>Workouts</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>🔥 {longestStreak(loggedDays)}</Text>
            <Text style={styles.statLabel}>Best streak</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{monthCount}</Text>
            <Text style={styles.statLabel}>In {MONTHS[shown.month].slice(0, 3)}</Text>
          </View>
        </View>

        <View style={styles.card}>
          {/* Month switcher */}
          <View style={styles.monthRow}>
            <Pressable onPress={prevMonth} hitSlop={10} style={styles.monthBtn}>
              <Text style={styles.monthBtnText}>‹</Text>
            </Pressable>
            <Text style={styles.monthTitle}>
              {MONTHS[shown.month]} {shown.year}
            </Text>
            <Pressable onPress={nextMonth} hitSlop={10} style={styles.monthBtn} disabled={atCurrentMonth}>
              <Text style={[styles.monthBtnText, atCurrentMonth && styles.monthBtnOff]}>›</Text>
            </Pressable>
          </View>

          {/* Weekday header */}
          <View style={styles.weekRow}>
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((l, i) => (
              <Text key={i} style={styles.weekHead}>
                {l}
              </Text>
            ))}
          </View>

          {/* Day grid */}
          {weeks.map((week, wi) => (
            <View key={wi} style={styles.weekRow}>
              {/* Keyed by dayNumber so month switches remount cells — Android drops the border
                  radius when a background is added to a recycled radius-only view. */}
              {week.map((cell, ci) => {
                if (!cell) return <View key={`e${ci}`} style={styles.dayCell} />;
                const done = loggedDays.includes(cell.dayNumber);
                const isToday = cell.dayNumber === today;
                const future = cell.dayNumber > today;
                const rest = isRestDay(cell.dayNumber);
                return (
                  <Pressable key={cell.dayNumber} style={styles.dayCell} disabled={!done} onPress={() => setOpenCell(cell)}>
                    <View
                      style={[
                        styles.dayDot,
                        done && styles.dayDotDone,
                        !done && rest && !future && styles.dayDotRest,
                        !done && isToday && styles.dayDotToday,
                      ]}
                    >
                      <Text style={[styles.dayText, done && styles.dayTextDone, future && styles.dayTextFuture, !done && isToday && styles.dayTextToday]}>
                        {cell.date}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}

          {/* Legend */}
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
            <Text style={styles.legendText}>Workout done</Text>
            <View style={[styles.legendDot, { backgroundColor: colors.track, marginLeft: spacing.md }]} />
            <Text style={styles.legendText}>Rest day</Text>
          </View>
        </View>
      </ScrollView>

      {/* Day summary — what that workout contained (older days may predate recording) */}
      <Modal visible={openCell !== null} transparent animationType="fade" onRequestClose={() => setOpenCell(null)}>
        <Pressable style={styles.overlay} onPress={() => setOpenCell(null)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.sheetSub}>
              {MONTHS[shown.month].toUpperCase()} {openCell?.date}, {shown.year}
            </Text>
            {openLog ? (
              <>
                <Text style={styles.sheetTitle}>{openLog.focus}</Text>
                <View style={{ gap: spacing.sm, marginTop: spacing.xs }}>
                  {openLog.items.map((it, i) => (
                    <View key={i} style={styles.sheetRow}>
                      <Text style={styles.sheetName}>{it.name}</Text>
                      <Text style={styles.sheetTarget}>
                        {it.sets ? `${it.sets} × ` : ''}
                        {formatTarget(it.target)}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            ) : (
              <>
                <Text style={styles.sheetTitle}>Workout done ✓</Text>
                <Text style={styles.sheetMuted}>No details for this day — summaries started being saved with a later update.</Text>
              </>
            )}
            <Pressable onPress={() => setOpenCell(null)} style={styles.sheetClose}>
              <Text style={styles.sheetCloseText}>Got it</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  back: { color: colors.primary, fontSize: font.body, fontWeight: '700' },
  title: { color: colors.ink, fontSize: font.h2, fontWeight: '800' },

  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  statCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, alignItems: 'center', gap: 2 },
  statNum: { color: colors.ink, fontSize: font.h2, fontWeight: '900' },
  statLabel: { color: colors.muted, fontSize: font.small },

  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },

  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  monthBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  monthBtnText: { color: colors.primary, fontSize: 24, fontWeight: '800' },
  monthBtnOff: { color: colors.track },
  monthTitle: { color: colors.ink, fontSize: font.body, fontWeight: '800' },

  weekRow: { flexDirection: 'row', marginTop: 4 },
  weekHead: { flex: 1, textAlign: 'center', color: colors.muted, fontSize: font.eyebrow, fontWeight: '800' },

  dayCell: { flex: 1, alignItems: 'center', paddingVertical: 3 },
  dayDot: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  dayDotDone: { backgroundColor: colors.primary },
  dayDotRest: { backgroundColor: colors.track },
  dayDotToday: { borderWidth: 2, borderColor: colors.primary },
  dayText: { color: colors.text, fontSize: font.small, fontWeight: '600' },
  dayTextDone: { color: colors.primaryText, fontWeight: '800' },
  dayTextFuture: { color: colors.track },
  dayTextToday: { color: colors.primary, fontWeight: '800' },

  legendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.lg },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendText: { color: colors.muted, fontSize: font.small },

  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(12,20,16,0.5)', alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  sheet: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.xs, width: '100%', maxWidth: 420 },
  sheetSub: { color: colors.muted, fontSize: font.eyebrow, fontWeight: '800', letterSpacing: 1.5 },
  sheetTitle: { color: colors.ink, fontSize: font.h2, fontWeight: '800' },
  sheetMuted: { color: colors.muted, fontSize: font.small, lineHeight: 19 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  sheetName: { color: colors.text, fontSize: font.small, fontWeight: '700', flexShrink: 1 },
  sheetTarget: { color: colors.muted, fontSize: font.small, textAlign: 'right', flexShrink: 1 },
  sheetClose: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.md },
  sheetCloseText: { color: colors.primaryText, fontSize: font.body, fontWeight: '800' },
});
