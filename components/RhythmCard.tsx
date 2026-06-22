// Home "Rhythm" card: the living sky (SkyArc) on top + a day-following quick log below. Walled off
// from the program — it only writes to the circadian slice, never to progress/streak.

import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { SkyArc } from '@/components/SkyArc';
import { colors, font, fonts, radius, spacing } from '@/constants/theme';
import { type CircadianDay, formatClock, formatDuration, sleepDuration } from '@/engine/circadian';
import { dayNumberFromDate } from '@/engine/history';
import { sunTimes } from '@/lib/sun';
import { useAppStore } from '@/store/useAppStore';

const DEFAULT_BED = 22 * 60; // 10:00 pm
const DEFAULT_WAKE = 6 * 60; // 6:00 am
const QUALITIES = [
  { id: 'poor', label: 'Poor' },
  { id: 'ok', label: 'OK' },
  { id: 'good', label: 'Good' },
] as const;

const minToDate = (m: number) => {
  const d = new Date();
  d.setHours(Math.floor(m / 60), m % 60, 0, 0);
  return d;
};

export function RhythmCard() {
  const router = useRouter();
  const location = useAppStore((s) => s.rhythmLocation);
  const circadian = useAppStore((s) => s.circadian);
  const logCircadian = useAppStore((s) => s.logCircadian);

  const now = new Date();
  const today = dayNumberFromDate(now);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const todayLog: CircadianDay = circadian[today] ?? {};
  const sun = useMemo(
    () => (location ? sunTimes(location.lat, location.lng, now) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [location?.lat, location?.lng, today],
  );

  const lastTimes = useMemo(() => {
    let best = -1;
    let bed = DEFAULT_BED;
    let wake = DEFAULT_WAKE;
    for (const k in circadian) {
      const d = Number(k);
      const e = circadian[d];
      if (e && e.bed !== undefined && e.wake !== undefined && d > best) {
        best = d;
        bed = e.bed;
        wake = e.wake;
      }
    }
    return { bed, wake };
  }, [circadian]);

  const [bed, setBed] = useState(todayLog.bed ?? lastTimes.bed);
  const [wake, setWake] = useState(todayLog.wake ?? lastTimes.wake);
  const [iosPicker, setIosPicker] = useState<null | 'bed' | 'wake'>(null);
  const [iosTemp, setIosTemp] = useState<Date | null>(null);

  const sleepDone = todayLog.quality !== undefined;
  const noon = sun ? (sun.sunrise + sun.sunset) / 2 : 12 * 60;
  const isMorning = nowMin < noon;
  const state: 'sleep' | 'mlight' | 'elight' | 'done' = !sleepDone
    ? 'sleep'
    : sun && isMorning && !todayLog.morningLight
      ? 'mlight'
      : sun && !isMorning && !todayLog.eveningLight
        ? 'elight'
        : 'done';

  const openFull = () => router.push('/rhythm');
  const setTime = (which: 'bed' | 'wake', m: number) => (which === 'bed' ? setBed(m) : setWake(m));
  const openPicker = (which: 'bed' | 'wake') => {
    const cur = which === 'bed' ? bed : wake;
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: minToDate(cur),
        mode: 'time',
        is24Hour: false,
        onChange: (e, d) => {
          if (e.type === 'set' && d) setTime(which, d.getHours() * 60 + d.getMinutes());
        },
      });
    } else {
      setIosTemp(minToDate(cur));
      setIosPicker(which);
    }
  };

  return (
    <View style={styles.card}>
      {sun ? (
        <Pressable onPress={openFull}>
          <SkyArc sunrise={sun.sunrise} sunset={sun.sunset} now={now} height={88} eyebrow="RHYTHM" showNow />
        </Pressable>
      ) : (
        <Pressable onPress={openFull} style={styles.noloc}>
          <Ionicons name="location-outline" size={17} color={colors.link} />
          <Text style={styles.nolocText}>Add your location for sunrise &amp; sunset</Text>
          <Text style={styles.nolocLink}>Set ›</Text>
        </Pressable>
      )}

      <View style={styles.footer}>
        {state === 'sleep' ? (
          <>
            <Text style={styles.title}>How did you sleep?</Text>
            <View style={styles.chips}>
              {QUALITIES.map((q) => (
                <Pressable key={q.id} onPress={() => logCircadian(today, { quality: q.id, bed, wake })} style={styles.chip}>
                  <Text style={styles.chipText}>{q.label}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.timesLine}>
              Bed{' '}
              <Text style={styles.timeVal} onPress={() => openPicker('bed')}>
                {formatClock(bed)}
              </Text>
              {'  ·  Wake '}
              <Text style={styles.timeVal} onPress={() => openPicker('wake')}>
                {formatClock(wake)}
              </Text>
            </Text>
          </>
        ) : state === 'mlight' ? (
          <View style={styles.arow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Get some morning light</Text>
              <Text style={styles.sub}>Sunrise was {formatClock(sun!.sunrise)} — a few minutes resets your clock.</Text>
            </View>
            <Pressable onPress={() => logCircadian(today, { morningLight: true })} style={styles.gotit}>
              <Ionicons name="checkmark" size={15} color="#9A3412" />
              <Text style={styles.gotitText}>Got it</Text>
            </Pressable>
          </View>
        ) : state === 'elight' ? (
          <View style={styles.arow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Catch the evening light</Text>
              <Text style={styles.sub}>Sunset {formatClock(sun!.sunset)} — the last of the daylight.</Text>
            </View>
            <Pressable onPress={() => logCircadian(today, { eveningLight: true })} style={styles.gotit}>
              <Ionicons name="checkmark" size={15} color="#9A3412" />
              <Text style={styles.gotitText}>Got it</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={openFull} style={styles.arow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>
                {todayLog.bed !== undefined && todayLog.wake !== undefined
                  ? `Slept ${formatDuration(sleepDuration(todayLog.bed, todayLog.wake))}`
                  : 'Logged for today'}
              </Text>
              {sun ? (
                <View style={styles.doneDots}>
                  {todayLog.morningLight ? (
                    <View style={styles.doneTick}>
                      <Ionicons name="checkmark-circle" size={14} color={colors.done} />
                      <Text style={styles.doneLbl}>Morning light</Text>
                    </View>
                  ) : null}
                  {todayLog.eveningLight ? (
                    <View style={styles.doneTick}>
                      <Ionicons name="checkmark-circle" size={14} color={colors.done} />
                      <Text style={styles.doneLbl}>Evening light</Text>
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
        )}
      </View>

      {iosPicker ? (
        <Modal transparent animationType="fade" visible onRequestClose={() => setIosPicker(null)}>
          <Pressable style={styles.overlay} onPress={() => setIosPicker(null)}>
            <Pressable style={styles.sheet} onPress={() => {}}>
              <DateTimePicker mode="time" display="spinner" value={iosTemp ?? minToDate(iosPicker === 'bed' ? bed : wake)} onChange={(_, d) => d && setIosTemp(d)} />
              <Pressable
                style={styles.sheetBtn}
                onPress={() => {
                  if (iosTemp) setTime(iosPicker, iosTemp.getHours() * 60 + iosTemp.getMinutes());
                  setIosPicker(null);
                }}
              >
                <Text style={styles.sheetBtnText}>Done</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  noloc: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  nolocText: { flex: 1, color: colors.muted, fontSize: font.small, fontFamily: fonts.regular },
  nolocLink: { color: colors.link, fontSize: font.small, fontFamily: fonts.bold },

  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.lg },
  title: { color: colors.ink, fontSize: font.body, fontFamily: fonts.heavy },
  sub: { color: colors.muted, fontSize: font.small, fontFamily: fonts.regular, marginTop: 2 },
  chips: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  chip: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: radius.pill, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border },
  chipText: { color: colors.text, fontSize: font.small, fontFamily: fonts.bold },
  timesLine: { color: colors.muted, fontSize: font.small, fontFamily: fonts.regular, marginTop: spacing.md },
  timeVal: { color: colors.link, fontFamily: fonts.bold },

  arow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  gotit: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.streakBg, borderWidth: 1, borderColor: colors.streakBorder, borderRadius: radius.pill, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  gotitText: { color: '#9A3412', fontSize: font.small, fontFamily: fonts.heavy },
  doneDots: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: 4 },
  doneTick: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  doneLbl: { color: colors.muted, fontSize: font.small, fontFamily: fonts.regular },

  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(12,20,16,0.5)', alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  sheet: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, width: '100%', maxWidth: 420 },
  sheetBtn: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  sheetBtnText: { color: colors.primaryText, fontSize: font.body, fontFamily: fonts.heavy },
});
