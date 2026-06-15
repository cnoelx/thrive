// Presentational "update available" prompt for the in-app APK self-updater. Pure RN — no native
// imports, so it renders in Expo Go and is easy to eyeball. All the native work (check, download,
// install) is driven by the parent via the callbacks + phase/progress props.

import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, font, fonts, radius, spacing } from '@/constants/theme';
import type { UpdateManifest } from '@/lib/updateCheck';

export type UpdatePhase = 'prompt' | 'downloading' | 'error';

export function UpdateModal({
  manifest,
  currentVersion,
  phase,
  progress,
  onUpdate,
  onSkip,
}: {
  manifest: UpdateManifest;
  currentVersion: string | null;
  phase: UpdatePhase;
  progress: number; // 0..1
  onUpdate: () => void;
  onSkip: () => void;
}) {
  const downloading = phase === 'downloading';
  const pct = Math.round(Math.min(Math.max(progress, 0), 1) * 100);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={manifest.mandatory ? undefined : onSkip}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.eyebrow}>NEW VERSION</Text>
          <Text style={styles.title}>Update Thrive</Text>
          <Text style={styles.version}>
            {currentVersion ?? '—'} → {manifest.version}
          </Text>

          {manifest.changelog.length > 0 && (
            <ScrollView style={styles.changelog} contentContainerStyle={{ gap: spacing.xs }}>
              {manifest.changelog.map((line, i) => (
                <View key={i} style={styles.bulletRow}>
                  <Text style={styles.bulletDot}>•</Text>
                  <Text style={styles.bulletText}>{line}</Text>
                </View>
              ))}
            </ScrollView>
          )}

          {phase === 'error' && <Text style={styles.error}>Download failed. Check your connection and try again.</Text>}

          {downloading ? (
            <View style={styles.progressWrap}>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${pct}%` }]} />
              </View>
              <Text style={styles.progressLabel}>Downloading… {pct}%</Text>
            </View>
          ) : (
            <View style={styles.actions}>
              {!manifest.mandatory && (
                <Pressable onPress={onSkip} style={[styles.btn, styles.btnGhost]}>
                  <Text style={styles.btnGhostText}>Later</Text>
                </Pressable>
              )}
              <Pressable onPress={onUpdate} style={[styles.btn, styles.btnPrimary, manifest.mandatory && { flex: 1 }]}>
                <Text style={styles.btnPrimaryText}>{phase === 'error' ? 'Retry' : 'Update'}</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(8,10,12,0.94)', alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  card: { width: '100%', maxWidth: 360, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.sm },
  eyebrow: { fontFamily: fonts.heavy, fontSize: font.eyebrow, letterSpacing: 1, color: colors.primary },
  title: { fontFamily: fonts.display, fontSize: font.title, color: colors.ink },
  version: { fontFamily: fonts.bold, fontSize: font.body, color: colors.muted, marginBottom: spacing.xs },
  changelog: { maxHeight: 180, marginVertical: spacing.xs },
  bulletRow: { flexDirection: 'row', gap: spacing.sm },
  bulletDot: { fontFamily: fonts.bold, fontSize: font.body, color: colors.primary, lineHeight: 22 },
  bulletText: { flex: 1, fontFamily: fonts.regular, fontSize: font.body, color: colors.text, lineHeight: 22 },
  error: { fontFamily: fonts.regular, fontSize: font.small, color: '#B91C1C', marginTop: spacing.xs },
  progressWrap: { gap: spacing.sm, marginTop: spacing.md },
  track: { height: 10, borderRadius: radius.pill, backgroundColor: colors.track, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.primary },
  progressLabel: { fontFamily: fonts.bold, fontSize: font.small, color: colors.muted, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  btn: { flex: 1, paddingVertical: spacing.md, borderRadius: radius.md, alignItems: 'center' },
  btnGhost: { backgroundColor: colors.track },
  btnGhostText: { fontFamily: fonts.heavy, fontSize: font.body, color: colors.muted },
  btnPrimary: { backgroundColor: colors.primary },
  btnPrimaryText: { fontFamily: fonts.heavy, fontSize: font.body, color: colors.primaryText },
});
