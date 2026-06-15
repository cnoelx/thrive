// Full-screen preview + one-tap share for the WorkoutCard. The card is captured to a PNG and handed
// to the OS share sheet (Instagram Stories, WhatsApp, etc.). Native bits (react-native-view-shot,
// expo-sharing) are lazy-imported so the screens that mount this still load in Expo Go.

import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { WorkoutCard, type WorkoutCardData } from '@/components/WorkoutCard';
import { colors, font, fonts, radius, spacing } from '@/constants/theme';

export function ShareCardModal({ data, onClose }: { data: WorkoutCardData; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const cardRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);

  async function share() {
    if (sharing) return;
    setSharing(true);
    try {
      const [{ captureRef }, Sharing] = await Promise.all([import('react-native-view-shot'), import('expo-sharing')]);
      const uri = await captureRef(cardRef, { format: 'png', quality: 1, result: 'tmpfile' });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share your workout' });
      }
    } catch {
      // Sharing unavailable (e.g. Expo Go) or cancelled — nothing to do.
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

        <View ref={cardRef} collapsable={false}>
          <WorkoutCard {...data} />
        </View>

        <Pressable onPress={share} disabled={sharing} style={[styles.shareBtn, { bottom: insets.bottom + spacing.xl }]}>
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
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(8,10,12,0.94)', alignItems: 'center', justifyContent: 'center' },
  close: { position: 'absolute', right: spacing.lg },
  shareBtn: {
    position: 'absolute',
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
