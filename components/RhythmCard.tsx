// Home "Rhythm" card: the living sky (SkyArc) fills the whole card; when something needs logging, the
// question floats on a translucent panel layered over it (so the sky glows behind — you can feel it's
// there). Once everything's logged, the panel clears and the full sky shows. Walled off from the
// program — it only writes to the circadian slice.
//
// NOTE: B-version — the panel is a semi-opaque fill, not a real frosted blur. Swap to expo-blur in a
// native build for the true frosted-glass look.

import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { SkyArc } from '@/components/SkyArc';
import { colors, font, fonts, radius, spacing } from '@/constants/theme';
import { type CircadianDay, formatClock, formatDuration, sleepDuration } from '@/engine/circadian';
import { dayNumberFromDate } from '@/engine/history';
import { skyColors } from '@/lib/skyTint';
import { sunTimes } from '@/lib/sun';
import { useNow } from '@/lib/useNow';
import { useAppStore } from '@/store/useAppStore';

const SKY_BAND = 68; // height of the crisp sky strip above the sleep prompt
const SLEEP_CUTOFF = 11 * 60; // sleep prompt leads only through late morning, then steps aside
const DEFAULT_BED = 22 * 60;
const DEFAULT_WAKE = 6 * 60;
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

  const now = useNow();
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
  // Night only counts when there's a sky to be dark — the no-location plain card stays light.
  const isNight = !!sun && (nowMin < sun.sunrise || nowMin > sun.sunset);
  // Sleep leads only from sunrise through late morning — no prompt before the sun's up, and it steps
  // aside after the cutoff (last night's sleep is still loggable from the full screen).
  const sleepPending = !sleepDone && nowMin < SLEEP_CUTOFF && (sun ? nowMin >= sun.sunrise : true);
  // A button-less daylight cue on the clear sky: a morning-light line through the morning, a golden-
  // hour line in the hour before sunset. (At night SkyArc shows a wind-down tip instead.)
  const dayNudge = !sun
    ? undefined
    : nowMin < SLEEP_CUTOFF
      ? 'A few minutes of morning light sets your clock.'
      : nowMin >= sun.sunset - 60 && nowMin <= sun.sunset
        ? 'Golden hour — catch the last of the daylight.'
        : undefined;

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

  // Panel + text palette: light glass on a day/dusk sky, dark glass at night (and for no-location).
  const dark = isNight;
  const txt = dark ? '#EAF0F6' : colors.ink;
  const sub = dark ? '#9FB0C4' : colors.muted;
  const chipBg = dark ? 'rgba(255,255,255,0.12)' : colors.bg;
  const chipBorder = dark ? 'rgba(255,255,255,0.18)' : colors.border;
  const chipTxt = dark ? '#D7E0EA' : colors.text;

  const question = !sleepDone ? (
    <>
      <Text style={[styles.q, { color: txt }]}>How did you sleep?</Text>
      <View style={styles.sleepFields}>
        <Pressable onPress={() => openPicker('bed')} style={[styles.sleepField, { backgroundColor: chipBg, borderColor: chipBorder }]}>
          <Text style={[styles.sleepLbl, { color: sub }]}>BED</Text>
          <Text style={[styles.sleepVal, { color: txt }]}>{formatClock(bed)}</Text>
        </Pressable>
        <Pressable onPress={() => openPicker('wake')} style={[styles.sleepField, { backgroundColor: chipBg, borderColor: chipBorder }]}>
          <Text style={[styles.sleepLbl, { color: sub }]}>WAKE</Text>
          <Text style={[styles.sleepVal, { color: txt }]}>{formatClock(wake)}</Text>
        </Pressable>
      </View>
      <Text style={[styles.durationLine, { color: sub }]}>{formatDuration(sleepDuration(bed, wake))} in bed</Text>
      <View style={styles.chips}>
        {QUALITIES.map((qq) => (
          <Pressable key={qq.id} onPress={() => logCircadian(today, { quality: qq.id, bed, wake })} style={[styles.chip, { backgroundColor: chipBg, borderColor: chipBorder }]}>
            <Text style={[styles.chipTxt, { color: chipTxt }]}>{qq.label}</Text>
          </Pressable>
        ))}
      </View>
    </>
  ) : null;

  // No location → no sky; a plain card with the "set location" hook + the sleep question.
  if (!sun) {
    return (
      <View style={[styles.card, styles.plain]}>
        <Pressable onPress={openFull} style={styles.noloc}>
          <Ionicons name="location-outline" size={17} color={colors.link} />
          <Text style={styles.nolocText}>Add your location for sunrise &amp; sunset</Text>
          <Text style={styles.nolocLink}>Set ›</Text>
        </Pressable>
        {question ? <View style={styles.plainQuestion}>{question}</View> : <Text style={styles.allSet}>You&apos;re logged for now ✓</Text>}
        {pickerModal()}
      </View>
    );
  }

  // Nothing to log → clear sky (the reward), with its own chrome, sunrise/sunset labels and a soft
  // button-less daylight cue (or a wind-down tip at night).
  if (!sleepPending) {
    return (
      <Pressable style={styles.card} onPress={openFull}>
        <SkyArc sunrise={sun.sunrise} sunset={sun.sunset} lat={location!.lat} lng={location!.lng} now={now} height={104} eyebrow="RHYTHM" showNow why={dayNudge} />
        {pickerModal()}
      </Pressable>
    );
  }

  // Pending → a crisp sky strip on top (you can see the sun), the question on a clean panel below.
  // The strip chrome borrows the live sky's top-tier colours so it reads on dawn/day/dusk alike.
  const sky = skyColors(nowMin, sun.sunrise, sun.sunset);
  return (
    <Pressable style={styles.card} onPress={openFull}>
      <View style={{ height: SKY_BAND }}>
        <SkyArc sunrise={sun.sunrise} sunset={sun.sunset} lat={location!.lat} lng={location!.lng} now={now} height={SKY_BAND} eyebrow="RHYTHM" hideChrome style={StyleSheet.absoluteFill} />
        <View style={styles.skyChrome}>
          <Text style={[styles.cEyebrow, { color: sky.topText }]}>RHYTHM</Text>
          <Text style={[styles.cNow, { color: sky.topAccent }]}>{formatClock(nowMin)}</Text>
        </View>
      </View>
      <View style={styles.promptPanel}>{question}</View>
      {pickerModal()}
    </Pressable>
  );

  function pickerModal() {
    if (!iosPicker) return null;
    return (
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
    );
  }
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  plain: { backgroundColor: colors.surface, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.lg },
  noloc: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingBottom: spacing.sm },
  nolocText: { flex: 1, color: colors.muted, fontSize: font.small, fontFamily: fonts.regular },
  nolocLink: { color: colors.link, fontSize: font.small, fontFamily: fonts.bold },
  plainQuestion: { marginTop: spacing.xs },
  allSet: { color: colors.muted, fontSize: font.small, fontFamily: fonts.bold, marginTop: spacing.sm },

  skyChrome: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  promptPanel: { backgroundColor: colors.surface, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.lg },
  cEyebrow: { fontSize: font.eyebrow, fontFamily: fonts.heavy, letterSpacing: 1.3 },
  cNow: { fontSize: font.eyebrow, fontFamily: fonts.bold },
  q: { fontSize: font.body, fontFamily: fonts.heavy },
  chips: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  chip: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: radius.pill, borderWidth: 1 },
  chipTxt: { fontSize: font.small, fontFamily: fonts.bold },
  sleepFields: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  sleepField: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1, gap: 1 },
  sleepLbl: { fontSize: font.eyebrow, fontFamily: fonts.heavy, letterSpacing: 1 },
  sleepVal: { fontSize: font.body, fontFamily: fonts.bold },
  durationLine: { fontSize: font.small, fontFamily: fonts.bold, marginTop: spacing.sm, textAlign: 'center' },

  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(12,20,16,0.5)', alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  sheet: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, width: '100%', maxWidth: 420 },
  sheetBtn: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  sheetBtnText: { color: colors.primaryText, fontSize: font.body, fontFamily: fonts.heavy },
});
