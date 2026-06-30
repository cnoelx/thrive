import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SkyArc } from '@/components/SkyArc';
import { INDIA_LOCATIONS, IndiaLocation } from '@/data/locations';
import { colors, font, fonts, radius, spacing } from '@/constants/theme';
import { formatClock, formatDuration, sleepConsistency, sleepDuration, weekSummary } from '@/engine/circadian';
import { dayNumberFromDate } from '@/engine/history';
import { sunTimes } from '@/lib/sun';
import { useNow } from '@/lib/useNow';
import { useAppStore } from '@/store/useAppStore';

const QUALITIES = [
  { id: 'poor', label: 'Poor' },
  { id: 'ok', label: 'OK' },
  { id: 'good', label: 'Good' },
] as const;

// Sleep-timeline geometry: a FIXED 8pm → 10am window, so the same bedtime always lands in the same
// spot (steady bedtimes line up across the rows). axisFrac maps a clock minute → 0 (8pm) … 1 (10am).
const AXIS_START = 20 * 60; // 8:00 pm
const AXIS_LEN = 14 * 60; // 14h → 10:00 am at the right edge
const MIDNIGHT_X = ((24 * 60 - AXIS_START) % 1440) / AXIS_LEN; // where midnight falls on the axis
const axisFrac = (t: number) => ((((t - AXIS_START) % 1440) + 1440) % 1440) / AXIS_LEN;
// Calm quality tints — not the saturated "done" green or the hot ember; gentle, never an alarm red.
const QUALITY_COLOR = { good: '#74B98D', ok: '#AEB9C6', poor: '#E6B36B' } as const;

const WEEKDAY = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const WEEKDAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const weekdayLetter = (d: number) => WEEKDAY[new Date(d * 86400000 + 43200000).getDay()];
const dayHeading = (d: number) => {
  const dt = new Date(d * 86400000 + 43200000);
  return `${WEEKDAYS_FULL[dt.getDay()]} · ${MONTHS_SHORT[dt.getMonth()]} ${dt.getDate()}`;
};
const minToDate = (min: number) => {
  const d = new Date();
  d.setHours(Math.floor(min / 60), min % 60, 0, 0);
  return d;
};

export default function Rhythm() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const location = useAppStore((s) => s.rhythmLocation);
  const setLocation = useAppStore((s) => s.setRhythmLocation);

  const [changing, setChanging] = useState(false);

  // No location yet (or changing it) → the one-time city search.
  if (!location || changing) {
    return (
      <LocationPicker
        insets={insets}
        current={location}
        onBack={() => (changing ? setChanging(false) : router.back())}
        onPick={(loc) => {
          setLocation(loc);
          setChanging(false);
        }}
      />
    );
  }

  return <RhythmHome location={location} insets={insets} onBack={() => router.back()} onChange={() => setChanging(true)} />;
}

function RhythmHome({
  location,
  insets,
  onBack,
  onChange,
}: {
  location: IndiaLocation;
  insets: ReturnType<typeof useSafeAreaInsets>;
  onBack: () => void;
  onChange: () => void;
}) {
  const circadian = useAppStore((s) => s.circadian);
  const logCircadian = useAppStore((s) => s.logCircadian);

  const now = useNow();
  const today = dayNumberFromDate(now);
  const todayLog = circadian[today] ?? {};
  // `now` intentionally excluded — these only need to recompute when the day (or location) changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const sun = useMemo(() => sunTimes(location.lat, location.lng, now), [location.lat, location.lng, today]);

  const [picking, setPicking] = useState<null | 'bed' | 'wake'>(null);
  const [openDay, setOpenDay] = useState<number | null>(null);

  const last7 = Array.from({ length: 7 }, (_, i) => today - 6 + i);
  const week = weekSummary(last7.map((d) => circadian[d]));
  const consistency = sleepConsistency(last7.map((d) => circadian[d]?.bed).filter((b): b is number => b !== undefined));
  const openLog = openDay !== null ? circadian[openDay] : undefined;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={onBack} hitSlop={10} style={styles.headerSide}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>Rhythm</Text>
        <View style={styles.headerSide} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}>
        {/* Living sky — sunrise/sunset arc by day, real-phase moon by night */}
        {sun ? (
          <SkyArc
            sunrise={sun.sunrise}
            sunset={sun.sunset}
            lat={location.lat}
            lng={location.lng}
            now={now}
            height={120}
            eyebrow={`TODAY · ${location.city.toUpperCase()}`}
            topRight={
              <Pressable onPress={onChange} hitSlop={8}>
                <Text style={styles.changeOnSky}>Change</Text>
              </Pressable>
            }
            why="Step into the daylight — better sleep tonight."
            moonFooter
            style={styles.skyHeader}
          />
        ) : (
          <View style={styles.card}>
            <View style={styles.locRow}>
              <Text style={styles.eyebrow}>TODAY · {location.city}</Text>
              <Pressable onPress={onChange} hitSlop={8}>
                <Text style={styles.changeLink}>Change</Text>
              </Pressable>
            </View>
            <Text style={styles.muted}>Daylight times unavailable for this location.</Text>
          </View>
        )}

        {/* Sleep log */}
        <View style={styles.card}>
          <Text style={styles.cardHead}>Last night&apos;s sleep</Text>
          <View style={styles.timeRow}>
            <TimeField label="Bed" value={todayLog.bed} onPress={() => setPicking('bed')} />
            <TimeField label="Wake" value={todayLog.wake} onPress={() => setPicking('wake')} />
          </View>
          {todayLog.bed !== undefined && todayLog.wake !== undefined ? (
            <Text style={styles.duration}>{formatDuration(sleepDuration(todayLog.bed, todayLog.wake))} in bed</Text>
          ) : null}

          <Text style={[styles.cardHead, { marginTop: spacing.lg }]}>How did it feel?</Text>
          <View style={styles.qualityRow}>
            {QUALITIES.map((q) => {
              const sel = todayLog.quality === q.id;
              return (
                <Pressable
                  key={q.id}
                  onPress={() => logCircadian(today, { quality: q.id })}
                  style={[styles.qPill, sel && styles.qPillOn]}
                >
                  <Text style={[styles.qPillText, sel && styles.qPillTextOn]}>{q.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Last 7 days */}
        <View style={styles.card}>
          <Text style={styles.cardHead}>Last 7 days</Text>
          <View style={styles.qLegend}>
            {([['Good', 'good'], ['OK', 'ok'], ['Poor', 'poor']] as const).map(([lbl, q]) => (
              <View key={q} style={styles.qLegendItem}>
                <View style={[styles.qSwatch, { backgroundColor: QUALITY_COLOR[q] }]} />
                <Text style={styles.qLegendText}>{lbl}</Text>
              </View>
            ))}
          </View>
          {last7.map((d) => {
            const log = circadian[d];
            const slept = log?.bed !== undefined && log?.wake !== undefined;
            const isToday = d === today;
            let left = 0;
            let width = 0;
            if (slept) {
              const bf = axisFrac(log!.bed!);
              const wf = axisFrac(log!.wake!);
              left = bf > 1 ? 0 : bf;
              width = Math.max(0.03, (wf > 1 ? 1 : wf) - left);
            }
            return (
              <Pressable key={d} style={styles.tlRow} onPress={() => setOpenDay(d)} hitSlop={4}>
                <Text style={[styles.tlDay, isToday && styles.weekDayToday]}>{weekdayLetter(d)}</Text>
                <View style={styles.tlTrack}>
                  <View style={[styles.tlMidnight, { left: `${MIDNIGHT_X * 100}%` }]} />
                  {slept ? (
                    <View
                      style={[
                        styles.tlBar,
                        { left: `${left * 100}%`, width: `${width * 100}%`, backgroundColor: QUALITY_COLOR[log!.quality ?? 'ok'] },
                        isToday && styles.tlBarToday,
                      ]}
                    />
                  ) : null}
                </View>
              </Pressable>
            );
          })}
          <View style={styles.tlAxis}>
            <Text style={styles.tlAxisLbl}>8pm</Text>
            <Text style={styles.tlAxisLbl}>10am</Text>
          </View>
          <Text style={styles.legend}>Each bar is bedtime to wake · the line marks midnight</Text>
          {week.avgSleepMin !== null || consistency ? (
            <View style={styles.summaryBox}>
              {week.avgSleepMin !== null ? (
                <Text style={styles.summary}>{formatDuration(week.avgSleepMin)} average a night</Text>
              ) : null}
              {consistency ? (
                <Text style={[styles.summary, { color: consistency.steady ? colors.done : colors.link }]}>{consistency.text}</Text>
              ) : null}
            </View>
          ) : null}
        </View>
      </ScrollView>

      <Modal visible={openDay !== null} transparent animationType="fade" onRequestClose={() => setOpenDay(null)}>
        <Pressable style={styles.overlay} onPress={() => setOpenDay(null)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.sheetTitle}>{openDay !== null ? dayHeading(openDay) : ''}</Text>
            {openLog && (openLog.bed !== undefined || openLog.quality !== undefined) ? (
              <View style={{ gap: spacing.xs, marginTop: spacing.sm }}>
                {openLog.bed !== undefined && openLog.wake !== undefined ? (
                  <Text style={styles.sheetRow}>
                    Slept {formatDuration(sleepDuration(openLog.bed, openLog.wake))} · {formatClock(openLog.bed)} → {formatClock(openLog.wake)}
                  </Text>
                ) : null}
                {openLog.quality ? <Text style={styles.sheetRow}>Felt {openLog.quality}</Text> : null}
              </View>
            ) : (
              <Text style={styles.sheetMuted}>Nothing logged this day.</Text>
            )}
            <Pressable style={styles.sheetClose} onPress={() => setOpenDay(null)}>
              <Text style={styles.sheetCloseText}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {picking ? (
        <TimePickerOverlay
          initialMin={picking === 'bed' ? todayLog.bed ?? 22 * 60 + 30 : todayLog.wake ?? 7 * 60}
          onPick={(min) => logCircadian(today, { [picking]: min })}
          onClose={() => setPicking(null)}
        />
      ) : null}
    </View>
  );
}

function TimeField({ label, value, onPress }: { label: string; value?: number; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.timeField}>
      <Text style={styles.timeLbl}>{label}</Text>
      <Text style={[styles.timeVal, value === undefined && styles.timeValEmpty]}>{value === undefined ? 'Set' : formatClock(value)}</Text>
    </Pressable>
  );
}

// Android shows the native time dialog automatically when mounted; iOS gets a spinner in a sheet.
function TimePickerOverlay({ initialMin, onPick, onClose }: { initialMin: number; onPick: (min: number) => void; onClose: () => void }) {
  const [temp, setTemp] = useState(initialMin);

  if (Platform.OS === 'android') {
    return (
      <DateTimePicker
        mode="time"
        is24Hour={false}
        value={minToDate(initialMin)}
        onChange={(e, d) => {
          if (e.type === 'set' && d) onPick(d.getHours() * 60 + d.getMinutes());
          onClose();
        }}
      />
    );
  }

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <DateTimePicker mode="time" display="spinner" value={minToDate(temp)} onChange={(_, d) => d && setTemp(d.getHours() * 60 + d.getMinutes())} />
          <Pressable
            style={styles.sheetClose}
            onPress={() => {
              onPick(temp);
              onClose();
            }}
          >
            <Text style={styles.sheetCloseText}>Done</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function LocationPicker({
  insets,
  current,
  onBack,
  onPick,
}: {
  insets: ReturnType<typeof useSafeAreaInsets>;
  current: IndiaLocation | null;
  onBack: () => void;
  onPick: (loc: IndiaLocation) => void;
}) {
  const [query, setQuery] = useState('');
  // Only filter once they type — the list is ~1100 entries, far too many to render all at once. The
  // source array is pre-sorted alphabetically, so a filtered slice stays in order.
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return INDIA_LOCATIONS.filter((l) => l.city.toLowerCase().includes(q) || l.state.toLowerCase().includes(q)).slice(0, 80);
  }, [query]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={onBack} hitSlop={10} style={styles.headerSide}>
          <Text style={styles.back}>‹ {current ? 'Back' : 'Cancel'}</Text>
        </Pressable>
        <Text style={styles.title}>Your location</Text>
        <View style={styles.headerSide} />
      </View>

      <View style={{ paddingHorizontal: spacing.lg }}>
        <Text style={styles.pickerHint}>Search your city or district (or the nearest one) so we can show your sunrise and sunset.</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search city or district"
          placeholderTextColor={colors.muted}
          style={styles.search}
          autoCorrect={false}
        />
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.sm, paddingBottom: insets.bottom + spacing.xl }}>
        {!query.trim() ? (
          <Text style={styles.muted}>Start typing to find your city or district.</Text>
        ) : results.length ? (
          results.map((loc, i) => (
            <Pressable key={`${loc.city}-${loc.state}`} onPress={() => onPick(loc)} style={[styles.cityRow, i > 0 && styles.cityRowDivider]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cityName}>{loc.city}</Text>
                <Text style={styles.cityState}>{loc.state}</Text>
              </View>
              {current?.city === loc.city && current?.state === loc.state ? <Ionicons name="checkmark" size={20} color={colors.done} /> : null}
            </Pressable>
          ))
        ) : (
          <Text style={styles.muted}>No match — try your district or the nearest town.</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  headerSide: { width: 72 },
  back: { color: colors.link, fontSize: font.body, fontFamily: fonts.bold },
  title: { flex: 1, textAlign: 'center', color: colors.ink, fontSize: font.h2, fontFamily: fonts.heavy },

  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg },
  cardHead: { color: colors.ink, fontSize: font.body, fontFamily: fonts.heavy, marginBottom: spacing.md },
  eyebrow: { color: colors.muted, fontSize: font.eyebrow, fontFamily: fonts.heavy, letterSpacing: 1, textTransform: 'uppercase' },
  muted: { color: colors.muted, fontSize: font.small, fontFamily: fonts.regular },

  locRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  changeLink: { color: colors.link, fontSize: font.small, fontFamily: fonts.bold },

  skyHeader: { borderRadius: radius.lg, marginBottom: spacing.lg },
  changeOnSky: { color: colors.link, fontSize: font.small, fontFamily: fonts.bold },

  timeRow: { flexDirection: 'row', gap: spacing.md },
  timeField: { flex: 1, backgroundColor: colors.bg, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center', gap: 2, borderWidth: 1, borderColor: colors.border },
  timeLbl: { color: colors.muted, fontSize: font.eyebrow, fontFamily: fonts.heavy, letterSpacing: 1, textTransform: 'uppercase' },
  timeVal: { color: colors.ink, fontSize: font.h2, fontFamily: fonts.display },
  timeValEmpty: { color: colors.link },
  duration: { color: colors.muted, fontSize: font.small, fontFamily: fonts.bold, marginTop: spacing.sm, textAlign: 'center' },

  qualityRow: { flexDirection: 'row', gap: spacing.sm },
  qPill: { flex: 1, backgroundColor: colors.bg, borderRadius: radius.pill, paddingVertical: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  qPillOn: { backgroundColor: colors.link, borderColor: colors.link },
  qPillText: { color: colors.text, fontSize: font.small, fontFamily: fonts.bold },
  qPillTextOn: { color: colors.primaryText },

  qLegend: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  qLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  qSwatch: { width: 10, height: 10, borderRadius: 3 },
  qLegendText: { color: colors.muted, fontSize: font.eyebrow, fontFamily: fonts.bold },
  tlRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  tlDay: { width: 16, color: colors.muted, fontSize: font.eyebrow, fontFamily: fonts.heavy, textAlign: 'center' },
  tlTrack: { flex: 1, height: 13, backgroundColor: colors.track, borderRadius: 7, overflow: 'hidden' },
  tlMidnight: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: colors.border },
  tlBar: { position: 'absolute', top: 0, height: 13, borderRadius: 7, minWidth: 8 },
  tlBarToday: { borderWidth: 1.5, borderColor: colors.session },
  tlAxis: { flexDirection: 'row', justifyContent: 'space-between', marginLeft: 24, marginTop: spacing.xs },
  tlAxisLbl: { color: colors.muted, fontSize: font.eyebrow, fontFamily: fonts.regular },
  weekDayToday: { color: colors.session },
  legend: { color: colors.muted, fontSize: font.eyebrow, fontFamily: fonts.regular, marginTop: spacing.md, textAlign: 'center' },
  summaryBox: { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, gap: 4 },
  summary: { color: colors.muted, fontSize: font.small, fontFamily: fonts.bold, textAlign: 'center' },

  // Location picker
  pickerHint: { color: colors.muted, fontSize: font.small, fontFamily: fonts.regular, lineHeight: 19, marginBottom: spacing.md },
  search: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: spacing.md, fontSize: font.body, fontFamily: fonts.regular, color: colors.text },
  cityRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md },
  cityRowDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  cityName: { color: colors.ink, fontSize: font.body, fontFamily: fonts.bold },
  cityState: { color: colors.muted, fontSize: font.small, fontFamily: fonts.regular, marginTop: 1 },

  // iOS time-picker sheet
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(12,20,16,0.5)', alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  sheet: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, width: '100%', maxWidth: 420 },
  sheetTitle: { color: colors.ink, fontSize: font.body, fontFamily: fonts.heavy },
  sheetRow: { color: colors.text, fontSize: font.small, fontFamily: fonts.bold },
  sheetMuted: { color: colors.muted, fontSize: font.small, fontFamily: fonts.regular, marginTop: spacing.sm },
  sheetClose: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.md },
  sheetCloseText: { color: colors.primaryText, fontSize: font.body, fontFamily: fonts.heavy },
});
