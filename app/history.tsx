import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ShareCardModal } from '@/components/ShareCardModal';
import { type WorkoutCardData } from '@/components/WorkoutCard';
import { colors, font, fonts, radius, spacing } from '@/constants/theme';
import { dayLabel, dayNumberFromDate, streakEndingAt } from '@/engine/history';
import { currentStreak } from '@/engine/streak';
import { useAppStore, type WorkoutSession } from '@/store/useAppStore';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FEEL_LABELS = { hard: 'Felt hard 🥵', right: 'Felt right 🙂', easy: 'Felt easy 😎' } as const;

const formatTime = (at: number): string => {
  const d = new Date(at);
  const h = d.getHours();
  return `${h % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
};

// "Today · 7:10 pm" / "Yesterday" / "Mon" (this week) / "Mon 3" (older).
const whenLabel = (day: number, at: number, today: number): string => {
  if (day === today) return `Today · ${formatTime(at)}`;
  if (day === today - 1) return 'Yesterday';
  const dt = new Date(day * 86400000 + 43200000);
  return today - day < 7 ? WEEKDAYS[dt.getDay()] : `${WEEKDAYS[dt.getDay()]} ${dt.getDate()}`;
};

// One icon per modality (not per area) — scales as new workout types arrive. Strength wins when a
// session mixes areas (most do); pure cardio → run, pure mobility → yoga.
function SessionIcon({ categories }: { categories?: string[] }) {
  const cats = categories ?? [];
  const strength = cats.some((c) => c === 'move' || c === 'push' || c === 'pull');
  if (!strength && cats.includes('cardio')) return <MaterialCommunityIcons name="run" size={21} color={colors.link} />;
  if (!strength && cats.includes('mobility')) return <MaterialCommunityIcons name="yoga" size={21} color={colors.link} />;
  return <Ionicons name="barbell-outline" size={20} color={colors.link} />;
}

export default function History() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const sessions = useAppStore((s) => s.sessions);
  const loggedDays = useAppStore((s) => s.loggedDays);
  const streak = useAppStore((s) => s.streak);
  const lastLoggedDay = useAppStore((s) => s.lastLoggedDay);

  const today = dayNumberFromDate(new Date());
  const streakNow = currentStreak(streak, lastLoggedDay, today);

  const [openSession, setOpenSession] = useState<WorkoutSession | null>(null);
  const [shareData, setShareData] = useState<WorkoutCardData | null>(null);

  // 4-week streak heatmap ending this week, Monday-aligned.
  const todayWeekday = new Date(today * 86400000 + 43200000).getDay();
  const start = today - ((todayWeekday + 6) % 7) - 21;
  const heatRows = [0, 1, 2, 3].map((r) => Array.from({ length: 7 }, (_, c) => start + r * 7 + c));

  // The feed: every session with detail, newest first. (Backfilled streak days carry no focus and
  // stay out — they're only on the heatmap.)
  const feed = [...sessions].filter((s) => !!s.focus).sort((a, b) => b.at - a.at);

  // Tap a session: the full share card if its move list was saved, else the quick stats sheet.
  const openDetail = (ses: WorkoutSession) => {
    if (ses.items?.length) {
      setShareData({
        focus: ses.focus,
        dateLabel: dayLabel(ses.day),
        streak: streakEndingAt(loggedDays, ses.day),
        durationMin: ses.durationMin,
        calories: ses.calories,
        items: ses.items.map((it) => ({ name: it.name, sets: it.sets, target: it.target })),
      });
    } else {
      setOpenSession(ses);
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
        {/* Streak heatmap */}
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={styles.cardHeadLabel}>Last 4 weeks</Text>
            {streakNow >= 2 ? (
              <View style={styles.streakChip}>
                <Ionicons name="flame" size={14} color={colors.session} />
                <Text style={styles.streakChipText}>{streakNow}-day streak</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.heatRow}>
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((l, i) => (
              <Text key={i} style={styles.weekHead}>
                {l}
              </Text>
            ))}
          </View>
          {heatRows.map((row, ri) => (
            <View key={ri} style={styles.heatRow}>
              {row.map((day) => (
                <View key={day} style={[styles.heatCell, loggedDays.includes(day) ? styles.heatOn : styles.heatOff, day === today && styles.heatToday]} />
              ))}
            </View>
          ))}
          <Text style={styles.heatNote}>A filled square is a day you trained.</Text>
        </View>

        {/* Session feed */}
        <View style={[styles.card, { marginTop: spacing.lg }]}>
          <Text style={styles.listTitle}>Recent sessions</Text>
          {feed.length === 0 ? (
            <Text style={styles.empty}>No workouts logged yet.</Text>
          ) : (
            feed.map((ses, i) => (
              <Pressable key={`${ses.at}-${i}`} onPress={() => openDetail(ses)} style={[styles.logRow, i > 0 && styles.logRowDivider]}>
                <View style={styles.logIcon}>
                  <SessionIcon categories={ses.categories} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.logFocus}>{ses.focus}</Text>
                  {ses.durationMin ? <Text style={styles.logMeta}>{ses.durationMin} min</Text> : null}
                </View>
                <Text style={styles.logWhen}>{whenLabel(ses.day, ses.at, today)}</Text>
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>

      {/* Quick stats sheet — sessions whose move list wasn't saved (older / backfilled). */}
      <Modal visible={openSession !== null} transparent animationType="fade" onRequestClose={() => setOpenSession(null)}>
        <Pressable style={styles.overlay} onPress={() => setOpenSession(null)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.sheetSub}>{openSession ? dayLabel(openSession.day).toUpperCase() : ''}</Text>
            <Text style={styles.sheetTitle}>{openSession?.focus || 'Workout'}</Text>
            <View style={styles.sheetStats}>
              {openSession?.moves ? (
                <View style={styles.sStat}>
                  <Text style={styles.sStatVal}>{openSession.moves}</Text>
                  <Text style={styles.sStatLbl}>{openSession.moves === 1 ? 'Move' : 'Moves'}</Text>
                </View>
              ) : null}
              {openSession?.totalSets ? (
                <View style={styles.sStat}>
                  <Text style={styles.sStatVal}>{openSession.totalSets}</Text>
                  <Text style={styles.sStatLbl}>Sets</Text>
                </View>
              ) : null}
              {openSession?.durationMin ? (
                <View style={styles.sStat}>
                  <Text style={styles.sStatVal}>{openSession.durationMin}</Text>
                  <Text style={styles.sStatLbl}>Min</Text>
                </View>
              ) : null}
              {openSession?.calories ? (
                <View style={styles.sStat}>
                  <Text style={styles.sStatVal}>~{openSession.calories}</Text>
                  <Text style={styles.sStatLbl}>kcal</Text>
                </View>
              ) : null}
            </View>
            {openSession?.feel ? (
              <View style={styles.feelPill}>
                <Text style={styles.feelPillText}>{FEEL_LABELS[openSession.feel]}</Text>
              </View>
            ) : null}
            <Pressable onPress={() => setOpenSession(null)} style={styles.sheetClose}>
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

  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  cardHeadLabel: { color: colors.muted, fontSize: font.small, fontFamily: fonts.bold },
  streakChip: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  streakChipText: { color: colors.session, fontSize: font.small, fontFamily: fonts.bold },

  heatRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  weekHead: { flex: 1, textAlign: 'center', color: colors.muted, fontSize: font.eyebrow, fontFamily: fonts.heavy },
  heatCell: { flex: 1, aspectRatio: 1, borderRadius: 6 },
  heatOn: { backgroundColor: colors.session },
  heatOff: { backgroundColor: colors.track },
  heatToday: { borderWidth: 2, borderColor: colors.ink },
  heatNote: { color: colors.muted, fontSize: font.eyebrow, fontFamily: fonts.regular, marginTop: spacing.md },

  listTitle: { color: colors.link, fontSize: font.eyebrow, fontFamily: fonts.heavy, letterSpacing: 1, textTransform: 'uppercase', marginBottom: spacing.xs },
  empty: { color: colors.muted, fontSize: font.small, fontFamily: fonts.regular, marginTop: spacing.sm },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  logRowDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  logIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.streakBg, alignItems: 'center', justifyContent: 'center' },
  logFocus: { color: colors.ink, fontSize: font.body, fontFamily: fonts.bold },
  logMeta: { color: colors.muted, fontSize: font.small, fontFamily: fonts.regular, marginTop: 1 },
  logWhen: { color: colors.muted, fontSize: font.small, fontFamily: fonts.regular },

  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(12,20,16,0.5)', alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  sheet: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.xs, width: '100%', maxWidth: 420 },
  sheetSub: { color: colors.link, fontSize: font.eyebrow, fontFamily: fonts.heavy, letterSpacing: 1.5 },
  sheetTitle: { color: colors.ink, fontSize: font.h2, fontFamily: fonts.heavy },
  sheetStats: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  sStat: { flex: 1, backgroundColor: colors.bg, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center', gap: 2 },
  sStatVal: { color: colors.ink, fontSize: font.h2, fontFamily: fonts.display },
  sStatLbl: { color: colors.muted, fontSize: font.eyebrow, fontFamily: fonts.regular },
  feelPill: { alignSelf: 'flex-start', backgroundColor: colors.bg, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, marginTop: spacing.md },
  feelPillText: { color: colors.text, fontSize: font.small, fontFamily: fonts.bold },
  sheetClose: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.md },
  sheetCloseText: { color: colors.primaryText, fontSize: font.body, fontFamily: fonts.heavy },
});
