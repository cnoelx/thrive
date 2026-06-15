// Full-screen viewer for the shareable WorkoutCard. Dark backdrop so the card pops and a phone
// screenshot crops cleanly — the manual share path until the native capture/share ships in a build.

import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing } from '@/constants/theme';
import { WorkoutCard, type WorkoutCardData } from '@/components/WorkoutCard';

export function ShareCardModal({ data, onClose }: { data: WorkoutCardData; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable onPress={onClose} hitSlop={12} style={[styles.close, { top: insets.top + spacing.md }]}>
          <Ionicons name="close" size={28} color="rgba(255,255,255,0.9)" />
        </Pressable>
        <WorkoutCard {...data} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(8,10,12,0.94)', alignItems: 'center', justifyContent: 'center' },
  close: { position: 'absolute', right: spacing.lg },
});
