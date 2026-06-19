// Full-screen preview + one-tap share for the workout Story image. The framed StoryFrame (what the user
// sees) IS what gets captured — WYSIWYG — to a 1080×1920 PNG handed to the OS share sheet (Instagram
// Stories, WhatsApp, etc.). Pick Orange or Dark before sharing. Native bits (react-native-view-shot,
// expo-sharing) are lazy-imported so the screens that mount this still load in Expo Go.

import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StoryFrame } from '@/components/StoryFrame';
import { CardTheme, type WorkoutCardData } from '@/components/WorkoutCard';
import { colors, font, fonts, radius, spacing } from '@/constants/theme';

const THEMES: { id: CardTheme; label: string }[] = [
  { id: 'orange', label: 'Orange' },
  { id: 'dark', label: 'Dark' },
];

export function ShareCardModal({ data, onClose }: { data: WorkoutCardData; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const frameRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);
  const [theme, setTheme] = useState<CardTheme>('orange');

  const win = Dimensions.get('window');
  // Fit the 9:16 frame to the screen, leaving room for the toggle + share button.
  const frameWidth = Math.min(win.width - spacing.xl * 2, ((win.height - insets.top - insets.bottom - 220) * 9) / 16);

  async function share() {
    if (sharing) return;
    setSharing(true);
    try {
      const [{ captureRef }, Sharing] = await Promise.all([import('react-native-view-shot'), import('expo-sharing')]);
      // The frame lives inside a Modal; right after a theme toggle (or returning from a prior share) its
      // gradient surface can be mid-redraw, which makes view-shot fail "Failed to capture view snapshot".
      // Let it settle a frame, then retry a few times — the failure is transient.
      const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      let uri: string | undefined;
      let lastErr: unknown;
      for (let i = 0; i < 4; i++) {
        try {
          uri = await captureRef(frameRef, { format: 'png', quality: 1, result: 'tmpfile' });
          break;
        } catch (e) {
          lastErr = e;
          await wait(180);
        }
      }
      if (!uri) throw lastErr;
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Sharing unavailable', 'This device has no app to share an image to.');
        return;
      }
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share your workout' });
    } catch (e) {
      Alert.alert('Could not share', e instanceof Error ? e.message : String(e));
    } finally {
      setSharing(false);
    }
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable onPress={onClose} hitSlop={12} style={[styles.close, { top: insets.top + spacing.md }]}>
          <Ionicons name="close" size={28} color="rgba(255,255,255,0.9)" />
        </Pressable>

        <View ref={frameRef} collapsable={false}>
          <StoryFrame data={data} theme={theme} width={frameWidth} />
        </View>

        <View style={[styles.controls, { bottom: insets.bottom + spacing.lg }]}>
          <View style={styles.toggle}>
            {THEMES.map((opt) => {
              const on = theme === opt.id;
              return (
                <Pressable key={opt.id} onPress={() => setTheme(opt.id)} style={[styles.toggleBtn, on && styles.toggleBtnOn]}>
                  <Text style={[styles.toggleText, on && styles.toggleTextOn]}>{opt.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable onPress={share} disabled={sharing} style={styles.shareBtn}>
            {sharing ? (
              <ActivityIndicator color={colors.ink} />
            ) : (
              <>
                <Ionicons name="share-social" size={20} color={colors.ink} />
                <Text style={styles.shareText}>Share</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(8,10,12,0.94)', alignItems: 'center', justifyContent: 'center' },
  close: { position: 'absolute', right: spacing.lg, zIndex: 2 },

  controls: { position: 'absolute', alignItems: 'center', gap: spacing.md },
  toggle: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: radius.pill, padding: 4, gap: 4 },
  toggleBtn: { paddingVertical: 8, paddingHorizontal: 22, borderRadius: radius.pill },
  toggleBtnOn: { backgroundColor: '#fff' },
  toggleText: { fontFamily: fonts.bold, fontSize: font.small, color: 'rgba(255,255,255,0.85)' },
  toggleTextOn: { color: colors.ink },

  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#fff',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    minWidth: 160,
    justifyContent: 'center',
  },
  shareText: { fontFamily: fonts.heavy, fontSize: font.body, color: colors.ink },
});
