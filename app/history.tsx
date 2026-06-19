import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ShareCardModal } from '@/components/ShareCardModal';
import { type WorkoutCardData } from '@/components/WorkoutCard';
import { colors, font, fonts, radius, spacing } from '@/constants/theme';
import { dayLabel, dayNumberFromDate, monthGrid, streakEndingAt, type MonthCell } from '@/engine/history';
import { isRestDay } from '@/engine/streak';
import { useAppStore } from '@/store/useAppStore';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
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
  const [shareData, setShareData] = useState<WorkoutCardData | null>(null);
  const openLog = openCell ? workoutLog[openCell.dayNumber] : undefined;
  const atCurrentMonth = shown.year === now.getFullYear() && shown.month === now.getMonth();

  const prevMonth = () =>
    setShown((s) => (s.month === 0 ? { year: s.year - 1, month: 11 } : { year: s.year, month: s.month - 1 }));
  const nextMonth = () =>
    setShown((s) => (s.month === 11 ? { year: s.year + 1, month: 0 } : { year: s.year, month: s.month + 1 }));

  const weeks = monthGrid(shown.year, shown.month);
  // Completed workouts in the shown month, most recent first — the list below the calendar.
  const monthDone = weeks
    .flat()
    .filter((c): c is MonthCell => !!c && loggedDays.includes(c.dayNumber))
    .sort((a, b) => b.date - a.date);

  // Tapping a completed day: show the full card if its move list was saved, else the stats sheet.
  const openDay = (cell: MonthCell) => {
    const log = workoutLog[cell.dayNumber];
    if (log?.items?.length) {
      setShareData({
        focus: log.focus,
        dateLabel: dayLabel(cell.dayNumber),
        streak: streakEndingAt(loggedDays, cell.dayNumber),
        durationMin: log.durationMin,
        calories: log.calories,
        items: log.items.map((it) => ({ name: it.name, sets: it.sets, target: it.target })),
      });
    } else {
      setOpenCell(cell);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.headerSide}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>History</Text>
        <View style={styles.headerSide} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}>
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
                  <Pressable key={cell.dayNumber} style={styles.dayCell} disabled={!done} onPress={() => openDay(cell)}>
                    <View style={[styles.dayDot, isToday && styles.dayDotToday]}>
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

        {/* Done workouts in the shown month */}
        <View style={styles.listCard}>
          <Text style={styles.listTitle}>
            {monthDone.length ? `${monthDone.length} workout${monthDone.length === 1 ? '' : 's'} · ${MONTHS[shown.month]}` : `No workouts yet · ${MONTHS[shown.month]}`}
          </Text>
          {monthDone.map((cell, i) => {
            const log = workoutLog[cell.dayNumber];
            const wd = WEEKDAYS[new Date(shown.year, shown.month, cell.date).getDay()];
            return (
              <Pressable key={cell.dayNumber} onPress={() => openDay(cell)} style={[styles.logRow, i > 0 && styles.logRowDivider]}>
                <View style={styles.logFlame}>
                  <Ionicons name="flame" size={16} color={colors.session} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.logFocus}>{log?.focus ?? 'Workout done'}</Text>
                  <Text style={styles.logMeta}>
                    {MONTHS[shown.month].slice(0, 3)} {cell.date}, {wd}
                    {log?.durationMin ? ` · ${log.durationMin} min` : ''}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </Pressable>
            );
          })}
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

      {shareData ? <ShareCardModal data={shareData} onClose={() => setShareData(null)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  headerSide: { width: 72 },
  back: { color: colors.link, fontSize: font.body, fontFamily: fonts.bold },
  title: { flex: 1, textAlign: 'center', color: colors.ink, fontSize: font.h2, fontFamily: fonts.heavy },

  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },

  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  monthBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  monthBtnText: { color: colors.link, fontSize: 24, fontFamily: fonts.heavy },
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

  listCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, marginTop: spacing.lg },
  listTitle: { color: colors.muted, fontSize: font.eyebrow, fontFamily: fonts.heavy, letterSpacing: 1, textTransform: 'uppercase', marginBottom: spacing.xs },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  logRowDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  logFlame: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  logFocus: { color: colors.ink, fontSize: font.body, fontFamily: fonts.bold },
  logMeta: { color: colors.muted, fontSize: font.small, fontFamily: fonts.regular, marginTop: 1 },

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
