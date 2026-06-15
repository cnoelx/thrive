import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, font, fonts, radius, spacing } from '@/constants/theme';
import { dayNumberFromDate, longestStreak, monthGrid, type MonthCell } from '@/engine/history';
import { isRestDay } from '@/engine/streak';
import { useAppStore } from '@/store/useAppStore';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const FEEL_LABELS = { hard: 'Felt hard 🥵', right: 'Felt right 🙂', easy: 'Felt easy 😎' } as const;

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
            <View style={styles.statNumRow}>
              <Ionicons name="flame" size={18} color={colors.session} />
              <Text style={styles.statNum}>{longestStreak(loggedDays)}</Text>
            </View>
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
                    <View style={[styles.dayDot, !done && isToday && styles.dayDotToday]}>
                      {done ? (
                        <Ionicons name="flame" size={18} color={colors.session} />
                      ) : rest && !future ? (
                        <Ionicons name="bed-outline" size={16} color={colors.muted} />
                      ) : (
                        <Text style={[styles.dayText, future && styles.dayTextFuture, !done && isToday && styles.dayTextToday]}>{cell.date}</Text>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}

          {/* Legend */}
          <View style={styles.legendRow}>
            <Ionicons name="flame" size={14} color={colors.session} />
            <Text style={styles.legendText}>Workout done</Text>
            <Ionicons name="bed-outline" size={14} color={colors.muted} style={{ marginLeft: spacing.md }} />
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
                <View style={styles.sheetStats}>
                  {(() => {
                    const moves = openLog.moves ?? openLog.items?.length;
                    return moves ? (
                      <View style={styles.sStat}>
                        <Text style={styles.sStatVal}>{moves}</Text>
                        <Text style={styles.sStatLbl}>{moves === 1 ? 'Move' : 'Moves'}</Text>
                      </View>
                    ) : null;
                  })()}
                  {openLog.totalSets ? (
                    <View style={styles.sStat}>
                      <Text style={styles.sStatVal}>{openLog.totalSets}</Text>
                      <Text style={styles.sStatLbl}>Sets</Text>
                    </View>
                  ) : null}
                  {openLog.durationMin ? (
                    <View style={styles.sStat}>
                      <Text style={styles.sStatVal}>{openLog.durationMin}</Text>
                      <Text style={styles.sStatLbl}>Min</Text>
                    </View>
                  ) : null}
                  {openLog.calories ? (
                    <View style={styles.sStat}>
                      <Text style={styles.sStatVal}>~{openLog.calories}</Text>
                      <Text style={styles.sStatLbl}>kcal</Text>
                    </View>
                  ) : null}
                </View>
                {openLog.feel ? (
                  <View style={styles.feelPill}>
                    <Text style={styles.feelPillText}>{FEEL_LABELS[openLog.feel]}</Text>
                  </View>
                ) : null}
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
  back: { color: colors.primary, fontSize: font.body, fontFamily: fonts.bold },
  title: { color: colors.ink, fontSize: font.h2, fontFamily: fonts.heavy },

  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  statCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, alignItems: 'center', gap: 2 },
  statNumRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statNum: { color: colors.ink, fontSize: font.h2, fontFamily: fonts.display },
  statLabel: { color: colors.muted, fontSize: font.small, fontFamily: fonts.regular },

  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },

  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  monthBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  monthBtnText: { color: colors.primary, fontSize: 24, fontFamily: fonts.heavy },
  monthBtnOff: { color: colors.track },
  monthTitle: { color: colors.ink, fontSize: font.body, fontFamily: fonts.heavy },

  weekRow: { flexDirection: 'row', marginTop: 4 },
  weekHead: { flex: 1, textAlign: 'center', color: colors.muted, fontSize: font.eyebrow, fontFamily: fonts.heavy },

  dayCell: { flex: 1, alignItems: 'center', paddingVertical: 3 },
  dayDot: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  dayDotToday: { borderWidth: 2, borderColor: colors.session },
  dayText: { color: colors.text, fontSize: font.small, fontFamily: fonts.bold },
  dayTextFuture: { color: colors.track },
  dayTextToday: { color: colors.session, fontFamily: fonts.heavy },

  legendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.lg },
  legendText: { color: colors.muted, fontSize: font.small, fontFamily: fonts.regular },

  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(12,20,16,0.5)', alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  sheet: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.xs, width: '100%', maxWidth: 420 },
  sheetSub: { color: colors.muted, fontSize: font.eyebrow, fontFamily: fonts.heavy, letterSpacing: 1.5 },
  sheetTitle: { color: colors.ink, fontSize: font.h2, fontFamily: fonts.heavy },
  sheetStats: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  sStat: { flex: 1, backgroundColor: colors.bg, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center', gap: 2 },
  sStatVal: { color: colors.ink, fontSize: font.h2, fontFamily: fonts.display },
  sStatLbl: { color: colors.muted, fontSize: font.eyebrow, fontFamily: fonts.regular },
  feelPill: { alignSelf: 'flex-start', backgroundColor: colors.bg, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, marginTop: spacing.md },
  feelPillText: { color: colors.text, fontSize: font.small, fontFamily: fonts.bold },
  sheetMuted: { color: colors.muted, fontSize: font.small, lineHeight: 19, fontFamily: fonts.regular },
  sheetClose: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.md },
  sheetCloseText: { color: colors.primaryText, fontSize: font.body, fontFamily: fonts.heavy },
});
