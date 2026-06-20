// Home "Rhythm" card: a full-bleed sky with the sun riding its arc at the current time, and a
// day-following quick-log below (sleep first, then morning/evening light, then a quiet summary).
// Walled off from the program — it only writes to the circadian slice, never to progress/streak.

import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, font, fonts, radius, spacing } from '@/constants/theme';
import { type CircadianDay, formatClock, formatDuration, sleepDuration } from '@/engine/circadian';
import { dayNumberFromDate } from '@/engine/history';
import { sunTimes } from '@/lib/sun';
import { useAppStore } from '@/store/useAppStore';

// Sky palette — a distinct dark "sky" for this card (echoes the ink hero, but bluer).
const SKY = '#0B1626';
const SKY_DIV = '#1B2A3D';
const ARC = '#33465E';
const SUN = '#FBBF24';
const EMBER = '#FB923C';
const EMBER_DOT = '#F97316';
const SKY_MUTED = '#6B7C92';
const SKY_TEXT = '#EAF0F6';
const WASH = '#FFF1E8';
const WASH_TEXT = '#9A3412';
const WASH_BORDER = '#FED7AA';

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

// Quadratic arc, positioned by percentage-x (no width measuring needed) + pixel-y.
const ARC_H = 104;
const P0X = 5;
const P2X = 95;
const PY = 88;
const CX = 50;
const CY = -36;
function bez(t: number): { x: number; y: number } {
  const u = 1 - t;
  return { x: u * u * P0X + 2 * u * t * CX + t * t * P2X, y: u * u * PY + 2 * u * t * CY + t * t * PY };
}

function SunArc({ sunrise, sunset, now }: { sunrise: number; sunset: number; now: number }) {
  const f = Math.max(0, Math.min(1, (now - sunrise) / Math.max(1, sunset - sunrise)));
  const dots = Array.from({ length: 17 }, (_, i) => bez(i / 16));
  const sun = bez(f);
  return (
    <View style={{ height: ARC_H, marginTop: 6 }}>
      <View style={styles.horizon} />
      {dots.map((p, i) => (
        <View key={i} style={[styles.arcDot, { left: `${p.x}%`, top: p.y }]} />
      ))}
      <View style={[styles.endDot, { left: `${P0X}%`, top: PY }]} />
      <View style={[styles.endDot, { left: `${P2X}%`, top: PY }]} />
      <View style={[styles.sunGlow, { left: `${sun.x}%`, top: sun.y }]} />
      <View style={[styles.sun, { left: `${sun.x}%`, top: sun.y }]} />
    </View>
  );
}

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

  // Pre-fill from the most recent night that has times, else the 10pm–6am default.
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
      {/* Sky / arc — tap to open the full Rhythm screen */}
      <Pressable onPress={openFull}>
        <View style={styles.top}>
          <Text style={styles.eyebrow}>RHYTHM</Text>
          {sun ? <Text style={styles.nowt}>{formatClock(nowMin)}</Text> : null}
        </View>
        {sun ? (
          <>
            <View style={styles.bleed}>
              <SunArc sunrise={sun.sunrise} sunset={sun.sunset} now={nowMin} />
            </View>
            <View style={styles.arcLabels}>
              <View>
                <Text style={styles.sunTime}>{formatClock(sun.sunrise)}</Text>
                <Text style={styles.sunCap}>SUNRISE</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.sunTime}>{formatClock(sun.sunset)}</Text>
                <Text style={styles.sunCap}>SUNSET</Text>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.nolocRow}>
            <Ionicons name="location-outline" size={17} color={EMBER} />
            <Text style={styles.nolocText}>Add your location for sunrise &amp; sunset</Text>
            <Text style={styles.nolocLink}>Set ›</Text>
          </View>
        )}
      </Pressable>

      {/* Day-following quick log */}
      <View style={styles.actionBlock}>
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
              <Ionicons name="checkmark" size={15} color={WASH_TEXT} />
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
              <Ionicons name="checkmark" size={15} color={WASH_TEXT} />
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
                  <Ionicons name={todayLog.morningLight ? 'checkmark-circle' : 'ellipse-outline'} size={14} color={todayLog.morningLight ? colors.done : SKY_MUTED} />
                  <Text style={styles.doneLbl}>Morning</Text>
                  <Ionicons name={todayLog.eveningLight ? 'checkmark-circle' : 'ellipse-outline'} size={14} color={todayLog.eveningLight ? colors.done : SKY_MUTED} style={{ marginLeft: spacing.md }} />
                  <Text style={styles.doneLbl}>Evening</Text>
                </View>
              ) : null}
            </View>
            <Ionicons name="chevron-forward" size={18} color={SKY_MUTED} />
          </Pressable>
        )}
      </View>

      {/* iOS time picker (Android uses the native dialog) */}
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
  card: { backgroundColor: SKY, borderRadius: radius.lg, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.lg, overflow: 'hidden' },
  bleed: { marginHorizontal: -spacing.lg },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { color: SKY_MUTED, fontSize: font.eyebrow, fontFamily: fonts.heavy, letterSpacing: 1.3 },
  nowt: { color: SUN, fontSize: font.eyebrow, fontFamily: fonts.bold },

  horizon: { position: 'absolute', left: 0, right: 0, top: PY, height: 1, backgroundColor: SKY_DIV },
  arcDot: { position: 'absolute', width: 3, height: 3, borderRadius: 2, marginLeft: -1.5, marginTop: -1.5, backgroundColor: ARC },
  endDot: { position: 'absolute', width: 14, height: 14, borderRadius: 7, marginLeft: -7, marginTop: -7, backgroundColor: EMBER_DOT },
  sun: { position: 'absolute', width: 24, height: 24, borderRadius: 12, marginLeft: -12, marginTop: -12, backgroundColor: SUN },
  sunGlow: { position: 'absolute', width: 40, height: 40, borderRadius: 20, marginLeft: -20, marginTop: -20, backgroundColor: SUN, opacity: 0.16 },

  arcLabels: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 2 },
  sunTime: { color: EMBER, fontSize: font.small, fontFamily: fonts.bold },
  sunCap: { color: SKY_MUTED, fontSize: 9.5, fontFamily: fonts.heavy, letterSpacing: 1 },

  nolocRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  nolocText: { flex: 1, color: '#9FB0C4', fontSize: font.small, fontFamily: fonts.regular },
  nolocLink: { color: SUN, fontSize: font.small, fontFamily: fonts.bold },

  actionBlock: { marginTop: spacing.md, borderTopWidth: 1, borderTopColor: SKY_DIV, paddingTop: spacing.md },
  title: { color: SKY_TEXT, fontSize: font.body, fontFamily: fonts.heavy },
  sub: { color: '#8295AB', fontSize: font.small, fontFamily: fonts.regular, marginTop: 2 },
  chips: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  chip: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' },
  chipText: { color: '#D7E0EA', fontSize: font.small, fontFamily: fonts.bold },
  timesLine: { color: '#8295AB', fontSize: font.small, fontFamily: fonts.regular, marginTop: spacing.md },
  timeVal: { color: SUN, fontFamily: fonts.bold },

  arow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  gotit: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: WASH, borderWidth: 1, borderColor: WASH_BORDER, borderRadius: radius.pill, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  gotitText: { color: WASH_TEXT, fontSize: font.small, fontFamily: fonts.heavy },
  doneDots: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 4 },
  doneLbl: { color: '#8295AB', fontSize: font.small, fontFamily: fonts.regular },

  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(12,20,16,0.5)', alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  sheet: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, width: '100%', maxWidth: 420 },
  sheetBtn: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  sheetBtnText: { color: colors.primaryText, fontSize: font.body, fontFamily: fonts.heavy },
});
