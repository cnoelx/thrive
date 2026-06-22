// The "living sky" shared by the home Rhythm card and the Rhythm screen header. The sky tint tracks
// the time of day; by day the sun rides an arc (lit ember up to its current position, warming toward
// the horizon), by night a real-phase moon and a few stars take over and the arc is gone. Drawn with
// plain views + a gradient (expo-linear-gradient) — no SVG dependency, OTA-safe.

import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode } from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { font, fonts, spacing } from '@/constants/theme';
import { formatClock } from '@/engine/circadian';
import { moonPhase, moonPosition } from '@/lib/moon';

interface Tint {
  bg: [string, string];
  text: string;
  muted: string;
  accent: string;
  line: string;
  arcDim: string;
}
const TINTS: Record<'day' | 'golden' | 'night', Tint> = {
  day: { bg: ['#CFE4F5', '#E6F0F9'], text: '#1E3A52', muted: '#5E7790', accent: '#C2570B', line: '#A9C6DE', arcDim: '#A9C6DE' },
  golden: { bg: ['#FBD7A2', '#F8E6CC'], text: '#7A4A1E', muted: '#9A6B43', accent: '#B4480B', line: '#E3B889', arcDim: '#E0B58A' },
  night: { bg: ['#0A1322', '#0E1B30'], text: '#C7D3E0', muted: '#5E6E84', accent: '#8294AA', line: '#1E2C44', arcDim: '#1E2C44' },
};
const ARC_LIT = '#F97316'; // traveled portion of the arc
const SUN_LOW = [249, 115, 22]; // orange near the horizon
const SUN_HIGH = [251, 191, 36]; // yellow near noon
const STARS = [
  { x: 18, y: 0.34 },
  { x: 33, y: 0.18 },
  { x: 49, y: 0.4 },
  { x: 55, y: 0.16 },
  { x: 80, y: 0.26 },
  { x: 88, y: 0.46 },
];

const lerp = (a: number[], b: number[], t: number) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`;

export function SkyArc({
  sunrise,
  sunset,
  lat,
  lng,
  now,
  height = 96,
  eyebrow,
  showNow,
  topRight,
  why,
  style,
}: {
  sunrise: number;
  sunset: number;
  lat: number;
  lng: number;
  now: Date;
  height?: number;
  eyebrow: string;
  showNow?: boolean;
  topRight?: ReactNode;
  why?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const isNight = nowMin < sunrise || nowMin > sunset;
  const nearHorizon = Math.min(Math.abs(nowMin - sunrise), Math.abs(sunset - nowMin)) < 55;
  const state = isNight ? 'night' : nearHorizon ? 'golden' : 'day';
  const tint = TINTS[state];

  // Arc geometry (percentage-x, pixel-y) — gives the sun headroom at the apex so it never clips.
  const horizonY = height * 0.86;
  const apexY = height * 0.18;
  const cy = 2 * apexY - horizonY;
  const bez = (t: number) => {
    const u = 1 - t;
    return { x: u * u * 4 + 2 * u * t * 50 + t * t * 96, y: u * u * horizonY + 2 * u * t * cy + t * t * horizonY };
  };
  const f = Math.max(0, Math.min(1, (nowMin - sunrise) / Math.max(1, sunset - sunrise)));
  const sun = bez(f);
  const sunColor = lerp(SUN_LOW, SUN_HIGH, 1 - 2 * Math.abs(f - 0.5)); // orange at horizon, yellow at noon

  const moon = moonPhase(now);
  const md = Math.round(height * 0.34);
  const shadowDx = (moon.waxing ? -1 : 1) * md * moon.illum;
  // Tier 1: at night, only draw the moon when it's genuinely above the horizon, placed by its real
  // altitude (height) and azimuth (left = east, right = west). Below the horizon → just stars.
  const moonPos = isNight ? moonPosition(now, lat, lng) : null;
  const moonUp = !!moonPos && moonPos.altitude > 0;
  const moonTop = horizonY - Math.max(0, Math.min(1, (moonPos?.altitude ?? 0) / 60)) * (horizonY - apexY);
  const moonX = Math.max(8, Math.min(92, 50 + ((moonPos?.azimuth ?? 0) / 120) * 42));

  return (
    <LinearGradient colors={tint.bg} style={[styles.sky, style]}>
      <View style={styles.top}>
        <Text style={[styles.eyebrow, { color: tint.muted }]}>{eyebrow}</Text>
        {showNow ? <Text style={[styles.now, { color: tint.accent }]}>{formatClock(nowMin)}</Text> : null}
        {topRight}
      </View>

      <View style={{ height, marginHorizontal: -spacing.lg, marginTop: 2 }}>
        <View style={[styles.horizon, { top: horizonY, backgroundColor: tint.line }]} />
        {isNight ? (
          <>
            {STARS.map((s, i) => (
              <View key={i} style={[styles.star, { left: `${s.x}%`, top: s.y * height }]} />
            ))}
            {moonUp ? (
              <View style={[styles.moon, { width: md, height: md, borderRadius: md / 2, left: `${moonX}%`, top: moonTop, marginLeft: -md / 2, marginTop: -md / 2 }]}>
                <View style={{ position: 'absolute', width: md, height: md, borderRadius: md / 2, backgroundColor: tint.bg[0], left: shadowDx }} />
              </View>
            ) : null}
          </>
        ) : (
          <>
            {Array.from({ length: 16 }, (_, i) => {
              const t = i / 15;
              const p = bez(t);
              return <View key={i} style={[styles.arcDot, { left: `${p.x}%`, top: p.y, backgroundColor: t <= f ? ARC_LIT : tint.arcDim }]} />;
            })}
            <View style={[styles.endDot, { left: '4%', top: horizonY }]} />
            <View style={[styles.endDot, { left: '96%', top: horizonY }]} />
            <View style={[styles.sunGlow, { left: `${sun.x}%`, top: sun.y, backgroundColor: sunColor }]} />
            <View style={[styles.sun, { left: `${sun.x}%`, top: sun.y, backgroundColor: sunColor }]} />
          </>
        )}
      </View>

      <View style={styles.labels}>
        <View>
          <Text style={[styles.time, { color: tint.accent }]}>{formatClock(sunrise)}</Text>
          <Text style={[styles.cap, { color: tint.muted }]}>SUNRISE</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.time, { color: tint.accent }]}>{formatClock(sunset)}</Text>
          <Text style={[styles.cap, { color: tint.muted }]}>SUNSET</Text>
        </View>
      </View>
      {why ? <Text style={[styles.why, { color: tint.muted }]}>{why}</Text> : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  sky: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md, overflow: 'hidden' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { fontSize: font.eyebrow, fontFamily: fonts.heavy, letterSpacing: 1.3 },
  now: { fontSize: font.eyebrow, fontFamily: fonts.bold },
  horizon: { position: 'absolute', left: 0, right: 0, height: 1 },
  arcDot: { position: 'absolute', width: 3, height: 3, borderRadius: 2, marginLeft: -1.5, marginTop: -1.5 },
  endDot: { position: 'absolute', width: 13, height: 13, borderRadius: 7, marginLeft: -6.5, marginTop: -6.5, backgroundColor: '#F97316' },
  sun: { position: 'absolute', width: 22, height: 22, borderRadius: 11, marginLeft: -11, marginTop: -11 },
  sunGlow: { position: 'absolute', width: 34, height: 34, borderRadius: 17, marginLeft: -17, marginTop: -17, opacity: 0.18 },
  star: { position: 'absolute', width: 2.5, height: 2.5, borderRadius: 2, marginLeft: -1.25, backgroundColor: '#FFFFFF', opacity: 0.75 },
  moon: { position: 'absolute', overflow: 'hidden', backgroundColor: '#E6ECF3' },
  labels: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 2 },
  time: { fontSize: font.small, fontFamily: fonts.bold },
  cap: { fontSize: 9.5, fontFamily: fonts.heavy, letterSpacing: 1 },
  why: { fontSize: font.small, fontFamily: fonts.regular, marginTop: spacing.sm, lineHeight: 18 },
});
