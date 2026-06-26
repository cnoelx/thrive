import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text } from 'react-native';

import { colors, font, fonts, radius, spacing } from '@/constants/theme';

// Auto-dismissing celebration popup: a real Modal (Back dismisses, never under system UI) that fades
// + pops in, then auto-closes after a beat. Tap anywhere or Back also closes it early. Mount it
// conditionally — onDone fires once when it closes.
export function Celebration({ title, body, onDone }: { title: string; body: string; onDone: () => void }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;
  const done = useRef(false);

  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => onDone());
  }, [opacity, onDone]);

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
    ]).start();
    const t = setTimeout(finish, 2600);
    return () => clearTimeout(t);
  }, [finish, scale, opacity]);

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={finish}>
      <Animated.View style={[styles.overlay, { opacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={finish} />
        <Animated.View style={[styles.celebrate, { transform: [{ scale }] }]} pointerEvents="none">
          <Text style={styles.celebrateEmoji}>🎉</Text>
          <Text style={styles.celebrateTitle}>{title}</Text>
          <Text style={styles.celebrateBody}>{body}</Text>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(12,20,16,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  celebrate: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, alignItems: 'center', gap: spacing.md },
  celebrateEmoji: { fontSize: 56 },
  celebrateTitle: { color: colors.ink, fontSize: font.title, fontFamily: fonts.heavy, textAlign: 'center' },
  celebrateBody: { color: colors.muted, fontSize: font.body, lineHeight: 22, textAlign: 'center', fontFamily: fonts.regular },
});
