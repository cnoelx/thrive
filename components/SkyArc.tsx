// The "living sky" shared by the home Rhythm card and the Rhythm screen header. The sky tint tracks
// the time of day; by day the sun rides an arc (lit ember up to its current position, warming toward
// the horizon), by night a real-phase moon and a few stars take over and the arc is gone. Drawn with
// plain views + a gradient (expo-linear-gradient) — no SVG dependency, OTA-safe.

import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode } from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { font, fonts, spacing } from '@/constants/theme';
import { formatClock } from '@/engine/circadian';
import { moonPhase, moonPosition, phaseName } from '@/lib/moon';

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
// Informative wind-down tips, rotated by day so it varies night to night.
const WIND_DOWN = [
  'Wind down — dim the lights and put screens away an hour before bed.',
  'Skip the blue light tonight — bright screens tell your brain it’s daytime.',
  'Eat earlier if you can; late meals can disrupt sleep.',
  'Go easy on caffeine this late — it lingers for hours.',
  'A calm, screen-free hour helps you fall asleep faster.',
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
  // Moon terminator: the lit/dark boundary is a half plus an ellipse (a circle squished by scaleX).
  // k = cos(phase angle): >0 crescent (a dark ellipse eats the lit half), <0 gibbous (a light ellipse
  // fills the dark half), 0 = a clean half-moon. Lit side: right when waxing, left when waning.
  const k = 1 - 2 * moon.illum;
  const termScaleX = Math.abs(k);
  const crescent = k > 0;
  // Tier 1: at night, only draw the moon when it's genuinely above the horizon, placed by its real
  // altitude (height) and azimuth (left = east, right = west). Below the horizon → just stars.
  const moonPos = isNight ? moonPosition(now, lat, lng) : null;
  const moonUp = !!moonPos && moonPos.altitude > 0;
  const moonTop = horizonY - Math.max(0, Math.min(1, (moonPos?.altitude ?? 0) / 60)) * (horizonY - apexY);
  const moonX = Math.max(8, Math.min(92, 50 + ((moonPos?.azimuth ?? 0) / 120) * 42));
  // Time until the next sunrise (the useful "when does the night end" at night).
  const untilSunrise = nowMin < sunrise ? sunrise - nowMin : 1440 - nowMin + sunrise;
  const untilLabel = `${Math.floor(untilSunrise / 60)}h ${untilSunrise % 60}m`.replace(/^0h /, '');

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
                {/* the always-dark un-lit half */}
                <View style={{ position: 'absolute', top: 0, width: md / 2, height: md, backgroundColor: tint.bg[0], left: moon.waxing ? 0 : md / 2 }} />
                {/* curved terminator: dark eats the lit side (crescent) or light fills the dark side (gibbous) */}
                <View style={{ position: 'absolute', top: 0, left: 0, width: md, height: md, borderRadius: md / 2, backgroundColor: crescent ? tint.bg[0] : '#E6ECF3', transform: [{ scaleX: termScaleX }] }} />
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
          {isNight ? (
            <>
              <Text style={[styles.time, { color: tint.accent }]}>{untilLabel}</Text>
              <Text style={[styles.cap, { color: tint.muted }]}>TILL SUNRISE</Text>
            </>
          ) : (
            <>
              <Text style={[styles.time, { color: tint.accent }]}>{formatClock(sunrise)}</Text>
              <Text style={[styles.cap, { color: tint.muted }]}>SUNRISE</Text>
            </>
          )}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          {isNight ? (
            <>
              <Text style={[styles.time, { color: tint.accent }]}>{phaseName(moon.illum, moon.waxing)}</Text>
              <Text style={[styles.cap, { color: tint.muted }]}>{Math.round(moon.illum * 100)}% LIT</Text>
            </>
          ) : (
            <>
              <Text style={[styles.time, { color: tint.accent }]}>{formatClock(sunset)}</Text>
              <Text style={[styles.cap, { color: tint.muted }]}>SUNSET</Text>
            </>
          )}
        </View>
      </View>
      {why ? (
        <Text style={[styles.why, { color: tint.muted }]}>{isNight ? WIND_DOWN[Math.floor(now.getTime() / 86400000) % WIND_DOWN.length] : why}</Text>
      ) : null}
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
