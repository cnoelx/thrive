// The "living sky" shared by the home Rhythm card and the Rhythm screen header. The sky tint tracks
// the time of day; by day the sun rides an arc (lit ember up to its current position, warming toward
// the horizon), by night a real-phase moon and a few stars take over and the arc is gone. Drawn with
// plain views + a gradient (expo-linear-gradient) — no SVG dependency, OTA-safe.

import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode } from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { font, fonts, spacing } from '@/constants/theme';
import { formatClock } from '@/engine/circadian';
import { moonPhase, moonPosition, moonTimes, phaseName } from '@/lib/moon';
import { skyColors } from '@/lib/skyTint';

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
  hideChrome,
  moonFooter,
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
  hideChrome?: boolean;
  moonFooter?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const isNight = nowMin < sunrise || nowMin > sunset;
  const sky = skyColors(nowMin, sunrise, sunset);

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
  const mt = moonFooter ? moonTimes(now, lat, lng) : null;
  // At night the sky's right-hand label already shows the phase name + % lit, so the moon footer
  // there leads with rise/set (the bit nothing else shows) and skips repeating the name.
  const moonRiseSet = mt
    ? `${mt.rise !== null ? `rises ${formatClock(mt.rise)}` : 'no moonrise'}  ·  ${mt.set !== null ? `sets ${formatClock(mt.set)}` : 'no moonset'}`
    : '';
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

  const skyBody = (
    <>
      <View style={[styles.horizon, { top: horizonY, backgroundColor: sky.line }]} />
      {isNight ? (
        <>
          {STARS.map((s, i) => (
            <View key={i} style={[styles.star, { left: `${s.x}%`, top: s.y * height }]} />
          ))}
          {moonUp ? (
            <View style={[styles.moon, { width: md, height: md, borderRadius: md / 2, left: `${moonX}%`, top: moonTop, marginLeft: -md / 2, marginTop: -md / 2 }]}>
              {/* the always-dark un-lit half */}
              <View style={{ position: 'absolute', top: 0, width: md / 2, height: md, backgroundColor: sky.top, left: moon.waxing ? 0 : md / 2 }} />
              {/* curved terminator: dark eats the lit side (crescent) or light fills the dark side (gibbous) */}
              <View style={{ position: 'absolute', top: 0, left: 0, width: md, height: md, borderRadius: md / 2, backgroundColor: crescent ? sky.top : '#E6ECF3', transform: [{ scaleX: termScaleX }] }} />
            </View>
          ) : null}
        </>
      ) : (
        <>
          {Array.from({ length: 16 }, (_, i) => {
            const t = i / 15;
            const p = bez(t);
            return <View key={i} style={[styles.arcDot, { left: `${p.x}%`, top: p.y, backgroundColor: t <= f ? ARC_LIT : sky.arcDim }]} />;
          })}
          <View style={[styles.sunGlow, { left: `${sun.x}%`, top: sun.y, backgroundColor: sunColor }]} />
          <View style={[styles.sun, { left: `${sun.x}%`, top: sun.y, backgroundColor: sunColor }]} />
        </>
      )}
    </>
  );

  // Sky visual only — fills its container, no eyebrow/labels (the card draws those on the glass).
  if (hideChrome) {
    return (
      <LinearGradient colors={[sky.top, sky.glow, sky.base]} locations={[0, 0.5, 1]} style={[StyleSheet.absoluteFillObject, style]}>
        <View style={{ flex: 1 }}>{skyBody}</View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[sky.top, sky.glow, sky.base]} locations={[0, 0.5, 1]} style={[styles.sky, style]}>
      <View style={styles.top}>
        <Text style={[styles.eyebrow, { color: sky.topText }]}>{eyebrow}</Text>
        {showNow ? <Text style={[styles.now, { color: sky.topAccent }]}>{formatClock(nowMin)}</Text> : null}
        {topRight}
      </View>

      <View style={{ height, marginHorizontal: -spacing.lg, marginTop: 2 }}>{skyBody}</View>

      <View style={styles.labels}>
        <View>
          {isNight ? (
            <>
              <Text style={[styles.time, { color: sky.accent }]}>{untilLabel}</Text>
              <Text style={[styles.cap, { color: sky.muted }]}>TILL SUNRISE</Text>
            </>
          ) : (
            <>
              <Text style={[styles.time, { color: sky.accent }]}>{formatClock(sunrise)}</Text>
              <Text style={[styles.cap, { color: sky.muted }]}>SUNRISE</Text>
            </>
          )}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          {isNight ? (
            <>
              <Text style={[styles.time, { color: sky.accent }]}>{phaseName(moon.illum, moon.waxing)}</Text>
              <Text style={[styles.cap, { color: sky.muted }]}>{Math.round(moon.illum * 100)}% LIT</Text>
            </>
          ) : (
            <>
              <Text style={[styles.time, { color: sky.accent }]}>{formatClock(sunset)}</Text>
              <Text style={[styles.cap, { color: sky.muted }]}>SUNSET</Text>
            </>
          )}
        </View>
      </View>
      {isNight ? (
        <Text style={[styles.why, { color: sky.muted }]}>{WIND_DOWN[Math.floor(now.getTime() / 86400000) % WIND_DOWN.length]}</Text>
      ) : why ? (
        <Text style={[styles.why, { color: sky.muted }]}>{why}</Text>
      ) : null}

      {moonFooter && mt ? (
        <View style={[styles.moonRow, { borderTopColor: sky.line }]}>
          <MoonGlyph size={16} illum={moon.illum} waxing={moon.waxing} />
          <Text style={styles.moonText} numberOfLines={1}>
            {isNight ? (
              <Text style={{ color: sky.muted }}>{moonRiseSet.charAt(0).toUpperCase() + moonRiseSet.slice(1)}</Text>
            ) : (
              <>
                <Text style={[styles.moonName, { color: sky.text }]}>{phaseName(moon.illum, moon.waxing)}</Text>
                <Text style={{ color: sky.muted }}>{`  ·  ${moonRiseSet}`}</Text>
              </>
            )}
          </Text>
        </View>
      ) : null}
    </LinearGradient>
  );
}

// A tiny phase-accurate moon disc for the footer line — the same terminator trick as the night moon,
// drawn small in calm greys so it reads on any sky tint.
function MoonGlyph({ size, illum, waxing }: { size: number; illum: number; waxing: boolean }) {
  const k = 1 - 2 * illum;
  const crescent = k > 0;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', backgroundColor: '#C7D4E2', borderWidth: StyleSheet.hairlineWidth, borderColor: '#AFC0D2' }}>
      <View style={{ position: 'absolute', top: 0, height: size, width: size / 2, backgroundColor: '#9FB2C6', left: waxing ? 0 : size / 2 }} />
      <View style={{ position: 'absolute', top: 0, left: 0, width: size, height: size, borderRadius: size / 2, backgroundColor: crescent ? '#9FB2C6' : '#C7D4E2', transform: [{ scaleX: Math.abs(k) }] }} />
    </View>
  );
}

const styles = StyleSheet.create({
  sky: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md, overflow: 'hidden' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { fontSize: font.eyebrow, fontFamily: fonts.heavy, letterSpacing: 1.3 },
  now: { fontSize: font.eyebrow, fontFamily: fonts.bold },
  horizon: { position: 'absolute', left: 0, right: 0, height: 1 },
  arcDot: { position: 'absolute', width: 3, height: 3, borderRadius: 2, marginLeft: -1.5, marginTop: -1.5 },
  sun: { position: 'absolute', width: 22, height: 22, borderRadius: 11, marginLeft: -11, marginTop: -11 },
  sunGlow: { position: 'absolute', width: 34, height: 34, borderRadius: 17, marginLeft: -17, marginTop: -17, opacity: 0.18 },
  star: { position: 'absolute', width: 2.5, height: 2.5, borderRadius: 2, marginLeft: -1.25, backgroundColor: '#FFFFFF', opacity: 0.75 },
  moon: { position: 'absolute', overflow: 'hidden', backgroundColor: '#E6ECF3' },
  labels: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 2 },
  time: { fontSize: font.small, fontFamily: fonts.bold },
  cap: { fontSize: 9.5, fontFamily: fonts.heavy, letterSpacing: 1 },
  why: { fontSize: font.small, fontFamily: fonts.regular, marginTop: spacing.sm, lineHeight: 18 },
  moonRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth },
  moonText: { flex: 1, fontSize: font.small, fontFamily: fonts.regular },
  moonName: { fontFamily: fonts.bold },
});
