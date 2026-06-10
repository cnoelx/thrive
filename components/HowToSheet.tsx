// "How to do it" sheet — demo frames + form cues for one exercise. Shared by the workout player
// and the category goal list; render it only while open (mounting resets the demo animation).

import { useEffect, useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, font, radius, spacing } from '@/constants/theme';
import { EXERCISE_IMAGES } from '@/data/exerciseImages';
import { FORM_CUES } from '@/data/formCues';

interface Props {
  exKey: string;
  name: string;
  onClose: () => void;
}

export function HowToSheet({ exKey, name, onClose }: Props) {
  const [frame, setFrame] = useState(0);

  // Flip the start/finish demo frames while open (reads like an animation).
  useEffect(() => {
    if (!EXERCISE_IMAGES[exKey]) return;
    setFrame(0);
    const id = setInterval(() => setFrame((f) => (f === 0 ? 1 : 0)), 700);
    return () => clearInterval(id);
  }, [exKey]);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.sub}>HOW TO DO IT</Text>
          <Text style={styles.title}>{name}</Text>
          {EXERCISE_IMAGES[exKey] ? (
            <Image source={EXERCISE_IMAGES[exKey][frame]} style={styles.img} resizeMode="contain" />
          ) : null}
          {(FORM_CUES[exKey] ?? []).map((cue, i) => (
            <View key={i} style={styles.cueRow}>
              <Text style={styles.cueDot}>•</Text>
              <Text style={styles.cueText}>{cue}</Text>
            </View>
          ))}
          <Text style={styles.disclaimer}>General guidance — not a substitute for a coach. Stop if anything hurts.</Text>
          <Pressable onPress={onClose} style={styles.close}>
            <Text style={styles.closeText}>Got it</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(12,20,16,0.5)', alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  sheet: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.sm, width: '100%', maxWidth: 420 },
  sub: { color: colors.primary, fontSize: font.eyebrow, fontWeight: '800', letterSpacing: 1, marginBottom: spacing.xs },
  title: { color: colors.ink, fontSize: font.h2, fontWeight: '800' },
  img: { width: '100%', height: 200, borderRadius: radius.md, backgroundColor: colors.track, marginTop: spacing.sm },
  cueRow: { flexDirection: 'row', gap: spacing.sm },
  cueDot: { color: colors.primary, fontSize: font.body, fontWeight: '900', lineHeight: 22 },
  cueText: { flex: 1, color: colors.text, fontSize: font.body, lineHeight: 22 },
  disclaimer: { color: colors.muted, fontSize: font.small, fontStyle: 'italic', marginTop: spacing.sm },
  close: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.md },
  closeText: { color: colors.primaryText, fontSize: font.body, fontWeight: '800' },
});
