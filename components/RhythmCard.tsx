// Home "Rhythm" card: the living sky (SkyArc) fills the whole card; when something needs logging, the
// question floats on a translucent panel layered over it (so the sky glows behind — you can feel it's
// there). Once everything's logged, the panel clears and the full sky shows. Walled off from the
// program — it only writes to the circadian slice.
//
// NOTE: B-version — the panel is a semi-opaque fill, not a real frosted blur. Swap to expo-blur in a
// native build for the true frosted-glass look.

import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { SkyArc } from '@/components/SkyArc';
import { colors, font, fonts, radius, spacing } from '@/constants/theme';
import { type CircadianDay, formatClock } from '@/engine/circadian';
import { dayNumberFromDate } from '@/engine/history';
import { sunTimes } from '@/lib/sun';
import { useAppStore } from '@/store/useAppStore';

const CARD_H = 168; // fixed height so the sky fills the card and the glass/chrome line up
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
  // Night only counts when there's a sky to be dark — the no-location plain card stays light.
  const isNight = !!sun && (nowMin < sun.sunrise || nowMin > sun.sunset);
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

  // Panel + text palette: light glass on a day/dusk sky, dark glass at night (and for no-location).
  const dark = isNight;
  const txt = dark ? '#EAF0F6' : colors.ink;
  const sub = dark ? '#9FB0C4' : colors.muted;
  const chipBg = dark ? 'rgba(255,255,255,0.12)' : colors.bg;
  const chipBorder = dark ? 'rgba(255,255,255,0.18)' : colors.border;
  const chipTxt = dark ? '#D7E0EA' : colors.text;

  const question =
    state === 'sleep' ? (
      <>
        <Text style={[styles.q, { color: txt }]}>How did you sleep?</Text>
        <View style={styles.chips}>
          {QUALITIES.map((qq) => (
            <Pressable key={qq.id} onPress={() => logCircadian(today, { quality: qq.id, bed, wake })} style={[styles.chip, { backgroundColor: chipBg, borderColor: chipBorder }]}>
              <Text style={[styles.chipTxt, { color: chipTxt }]}>{qq.label}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={[styles.times, { color: sub }]}>
          Bed{' '}
          <Text style={[styles.timeVal, { color: colors.link }]} onPress={() => openPicker('bed')}>
            {formatClock(bed)}
          </Text>
          {'  ·  Wake '}
          <Text style={[styles.timeVal, { color: colors.link }]} onPress={() => openPicker('wake')}>
            {formatClock(wake)}
          </Text>
        </Text>
      </>
    ) : state === 'mlight' ? (
      <View style={styles.qrow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.q, { color: txt }]}>Get some morning light</Text>
          <Text style={[styles.sub, { color: sub }]}>Sunrise was {formatClock(sun!.sunrise)} — a few minutes resets your clock.</Text>
        </View>
        <Pressable onPress={() => logCircadian(today, { morningLight: true })} style={styles.gotit}>
          <Ionicons name="checkmark" size={15} color="#fff" />
          <Text style={styles.gotitTxt}>Got it</Text>
        </Pressable>
      </View>
    ) : state === 'elight' ? (
      <View style={styles.qrow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.q, { color: txt }]}>Catch the evening light</Text>
          <Text style={[styles.sub, { color: sub }]}>Sunset {formatClock(sun!.sunset)} — the last of the daylight.</Text>
        </View>
        <Pressable onPress={() => logCircadian(today, { eveningLight: true })} style={styles.gotit}>
          <Ionicons name="checkmark" size={15} color="#fff" />
          <Text style={styles.gotitTxt}>Got it</Text>
        </Pressable>
      </View>
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

  // Nothing pending → clear sky (the reward), with its own chrome + sunrise/sunset labels.
  if (state === 'done') {
    return (
      <Pressable style={styles.card} onPress={openFull}>
        <SkyArc sunrise={sun.sunrise} sunset={sun.sunset} lat={location!.lat} lng={location!.lng} now={now} height={104} eyebrow="RHYTHM" showNow />
        {pickerModal()}
      </Pressable>
    );
  }

  // Pending → the question floats on a full-card glass; the sun/moon glow through behind it.
  return (
    <Pressable style={[styles.card, { height: CARD_H }]} onPress={openFull}>
      <SkyArc sunrise={sun.sunrise} sunset={sun.sunset} lat={location!.lat} lng={location!.lng} now={now} height={CARD_H} eyebrow="RHYTHM" hideChrome style={StyleSheet.absoluteFill} />
      {/* frosted glass: blurs the sky behind, with a faint tint for text legibility.
          experimentalBlurMethod is required for a real blur on Android (else it's just a
          semi-transparent view); ignored on iOS. */}
      <BlurView intensity={dark ? 34 : 26} tint={dark ? 'dark' : 'light'} experimentalBlurMethod="dimezisBlurView" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: dark ? 'rgba(11,22,38,0.22)' : 'rgba(255,255,255,0.18)' }]} />
      <View style={styles.chrome}>
        <View style={styles.chromeTop}>
          <Text style={[styles.cEyebrow, { color: dark ? '#9FB0C4' : '#5E7790' }]}>RHYTHM</Text>
          <Text style={[styles.cNow, { color: dark ? '#FBBF24' : '#B26B00' }]}>{formatClock(nowMin)}</Text>
        </View>
        <View style={{ flex: 1 }} />
        {question}
      </View>
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

  chrome: { ...StyleSheet.absoluteFillObject, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.lg },
  chromeTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cEyebrow: { fontSize: font.eyebrow, fontFamily: fonts.heavy, letterSpacing: 1.3 },
  cNow: { fontSize: font.eyebrow, fontFamily: fonts.bold },
  q: { fontSize: font.body, fontFamily: fonts.heavy },
  sub: { fontSize: font.small, fontFamily: fonts.regular, marginTop: 2 },
  chips: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  chip: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: radius.pill, borderWidth: 1 },
  chipTxt: { fontSize: font.small, fontFamily: fonts.bold },
  times: { fontSize: font.small, fontFamily: fonts.regular, marginTop: spacing.md },
  timeVal: { fontFamily: fonts.bold },
  qrow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  gotit: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.link, borderRadius: radius.pill, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  gotitTxt: { color: '#fff', fontSize: font.small, fontFamily: fonts.heavy },

  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(12,20,16,0.5)', alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  sheet: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, width: '100%', maxWidth: 420 },
  sheetBtn: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  sheetBtnText: { color: colors.primaryText, fontSize: font.body, fontFamily: fonts.heavy },
});
