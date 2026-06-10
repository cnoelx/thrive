import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, font, radius, spacing } from '@/constants/theme';
import { WHATS_NEW } from '@/data/whatsNew';
import { useAppStore } from '@/store/useAppStore';

export default function Settings() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const name = useAppStore((s) => s.name);
  const setName = useAppStore((s) => s.setName);
  const resetAll = useAppStore((s) => s.resetAll);
  const [draft, setDraft] = useState(name);

  const saveName = () => setName(draft.trim());

  const confirmReset = () => {
    Alert.alert(
      'Start over?',
      'This wipes everything — your levels, streak, name, and settings — back to a fresh start. It can’t be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start over',
          style: 'destructive',
          onPress: () => {
            resetAll();
            router.replace('/');
          },
        },
      ],
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => { saveName(); router.back(); }} hitSlop={10}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl, gap: spacing.lg }}>
        {/* Name */}
        <View style={styles.card}>
          <Text style={styles.label}>YOUR NAME</Text>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onBlur={saveName}
            onSubmitEditing={saveName}
            placeholder="Your name"
            placeholderTextColor={colors.muted}
            maxLength={30}
            returnKeyType="done"
            style={styles.nameInput}
          />
        </View>

        {/* What's new */}
        <View style={styles.card}>
          <Text style={styles.label}>WHAT&apos;S NEW</Text>
          {WHATS_NEW.items.map((it, i) => (
            <View key={i} style={styles.bulletRow}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>{it}</Text>
            </View>
          ))}
        </View>

        {/* About */}
        <View style={styles.card}>
          <Text style={styles.label}>ABOUT</Text>
          <Text style={styles.aboutText}>Thrive · Version {Constants.expoConfig?.version ?? '1.0.0'}</Text>
          <Text style={styles.disclaimer}>General fitness guidance — not a substitute for a coach or physio. Stop if anything hurts.</Text>
        </View>

        {/* Reset */}
        <Pressable onPress={confirmReset} style={styles.resetBtn} hitSlop={6}>
          <Text style={styles.resetText}>Start over (reset everything)</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  back: { color: colors.primary, fontSize: font.body, fontWeight: '700' },
  title: { color: colors.ink, fontSize: font.h2, fontWeight: '800' },

  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, gap: spacing.sm },
  label: { color: colors.muted, fontSize: font.eyebrow, fontWeight: '800', letterSpacing: 1.5 },

  nameInput: { color: colors.ink, fontSize: font.h2, fontWeight: '800', borderBottomWidth: 2, borderBottomColor: colors.primary, paddingVertical: spacing.xs },

  bulletRow: { flexDirection: 'row', gap: spacing.sm },
  bulletDot: { color: colors.primary, fontSize: font.body, fontWeight: '900', lineHeight: 22 },
  bulletText: { flex: 1, color: colors.text, fontSize: font.body, lineHeight: 22 },

  aboutText: { color: colors.text, fontSize: font.body, fontWeight: '700' },
  disclaimer: { color: colors.muted, fontSize: font.small, fontStyle: 'italic', lineHeight: 19 },

  resetBtn: { borderWidth: 1, borderColor: '#F0C2C2', backgroundColor: '#FCEFEF', borderRadius: radius.pill, paddingVertical: spacing.md + 2, alignItems: 'center', marginTop: spacing.sm },
  resetText: { color: '#B91C1C', fontSize: font.body, fontWeight: '800' },
});
