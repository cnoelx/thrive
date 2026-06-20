import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, font, fonts, radius, spacing } from '@/constants/theme';
import { requestNotificationPermission } from '@/lib/notifications';
import { useAppStore } from '@/store/useAppStore';

function timeLabel(h: number, m: number): string {
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}
function dateFromHM(h: number, m: number): Date {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function todayNumber(): number {
  const now = new Date();
  return Math.floor((now.getTime() - now.getTimezoneOffset() * 60000) / 86400000);
}

export default function Settings() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const name = useAppStore((s) => s.name);
  const setName = useAppStore((s) => s.setName);
  const weightKg = useAppStore((s) => s.weightKg);
  const setWeight = useAppStore((s) => s.setWeight);
  const resetAll = useAppStore((s) => s.resetAll);
  const reminderEnabled = useAppStore((s) => s.reminderEnabled);
  const reminderCustomTime = useAppStore((s) => s.reminderCustomTime);
  const reminderHour = useAppStore((s) => s.reminderHour);
  const reminderMinute = useAppStore((s) => s.reminderMinute);
  const setReminder = useAppStore((s) => s.setReminder);
  const setReminderEnabled = useAppStore((s) => s.setReminderEnabled);
  const setReminderCustomTime = useAppStore((s) => s.setReminderCustomTime);
  const markReminderPrompted = useAppStore((s) => s.markReminderPrompted);
  const [draft, setDraft] = useState(name);
  const [editing, setEditing] = useState(false);
  const [weightDraft, setWeightDraft] = useState(weightKg ? String(weightKg) : '');

  const saveName = () => {
    setName(draft.trim());
    setEditing(false);
  };

  const saveWeight = () => {
    const n = Math.round(parseFloat(weightDraft.replace(',', '.')));
    setWeight(Number.isFinite(n) && n > 0 ? n : null, todayNumber());
  };

  const toggleCustomTime = async (value: boolean) => {
    if (value && !reminderEnabled) {
      const ok = await requestNotificationPermission();
      markReminderPrompted();
      if (!ok) return;
      setReminderEnabled(true);
    }
    setReminderCustomTime(value);
  };
  const onPickTime = (event: DateTimePickerEvent, selected?: Date) => {
    if (event.type === 'set' && selected) setReminder(true, selected.getHours(), selected.getMinutes());
  };
  const openAndroidTimePicker = () =>
    DateTimePickerAndroid.open({ value: dateFromHM(reminderHour, reminderMinute), onChange: onPickTime, mode: 'time', is24Hour: false });

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
        <Pressable onPress={() => { saveName(); saveWeight(); router.back(); }} hitSlop={10}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl, gap: spacing.lg }}>
        {/* Name */}
        <View style={styles.card}>
          <Text style={styles.label}>YOUR NAME</Text>
          {editing ? (
            <TextInput
              value={draft}
              onChangeText={setDraft}
              onBlur={saveName}
              onSubmitEditing={saveName}
              placeholder="Your name"
              placeholderTextColor={colors.muted}
              maxLength={30}
              returnKeyType="done"
              autoFocus
              style={styles.nameInput}
            />
          ) : (
            <View style={styles.nameRow}>
              <Text style={[styles.nameText, !name && { color: colors.muted }]}>{name || 'Your name'}</Text>
              <Pressable
                onPress={() => {
                  setDraft(name);
                  setEditing(true);
                }}
                hitSlop={10}
              >
                <Ionicons name="create-outline" size={22} color={colors.link} />
              </Pressable>
            </View>
          )}
        </View>

        {/* Weight — optional, feeds the calorie estimate */}
        <View style={styles.card}>
          <Text style={styles.label}>YOUR WEIGHT</Text>
          <View style={styles.weightRow}>
            <TextInput
              value={weightDraft}
              onChangeText={setWeightDraft}
              onBlur={saveWeight}
              onSubmitEditing={saveWeight}
              placeholder="—"
              placeholderTextColor={colors.muted}
              keyboardType="numeric"
              maxLength={3}
              returnKeyType="done"
              style={styles.weightInput}
            />
            <Text style={styles.weightUnit}>kg</Text>
          </View>
          <Text style={styles.weightHint}>Optional — only used to estimate calories. Stays on your phone.</Text>
        </View>

        {/* Reminders — on by default (morning + afternoon); the switch sets your own time */}
        <View style={styles.card}>
          <View style={styles.reminderHead}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>REMINDERS</Text>
              <Text style={styles.reminderSub}>
                {reminderCustomTime ? 'Reminding you at your chosen time' : 'We’ll nudge you on workout days — switch on to set your own time'}
              </Text>
            </View>
            <Switch value={reminderCustomTime} onValueChange={toggleCustomTime} trackColor={{ true: colors.link, false: colors.track }} thumbColor="#ffffff" />
          </View>
          {reminderCustomTime ? (
            Platform.OS === 'ios' ? (
              <View style={styles.timeButton}>
                <Text style={styles.timeButtonText}>Remind me at</Text>
                <DateTimePicker value={dateFromHM(reminderHour, reminderMinute)} mode="time" display="compact" onChange={onPickTime} />
              </View>
            ) : (
              <Pressable style={styles.timeButton} onPress={openAndroidTimePicker}>
                <Text style={styles.timeButtonText}>{timeLabel(reminderHour, reminderMinute)}</Text>
                <Text style={styles.timeButtonHint}>Change ›</Text>
              </Pressable>
            )
          ) : null}
        </View>

        {/* About */}
        <View style={styles.card}>
          <Text style={styles.aboutText}>Version {Constants.expoConfig?.version ?? '1.0.0'}</Text>
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
  back: { color: colors.link, fontSize: font.body, fontFamily: fonts.bold },
  title: { color: colors.ink, fontSize: font.h2, fontFamily: fonts.heavy },

  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, gap: spacing.sm },
  label: { color: colors.muted, fontSize: font.eyebrow, fontFamily: fonts.heavy, letterSpacing: 1.5 },

  nameInput: { color: colors.ink, fontSize: font.h2, fontFamily: fonts.heavy, borderBottomWidth: 2, borderBottomColor: colors.link, paddingVertical: spacing.xs },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  nameText: { flex: 1, color: colors.ink, fontSize: font.h2, fontFamily: fonts.heavy, paddingVertical: spacing.xs },

  weightRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  weightInput: { color: colors.ink, fontSize: font.h2, fontFamily: fonts.heavy, borderBottomWidth: 2, borderBottomColor: colors.link, paddingVertical: spacing.xs, minWidth: 64, textAlign: 'center' },
  weightUnit: { color: colors.muted, fontSize: font.body, fontFamily: fonts.bold },
  weightHint: { color: colors.muted, fontSize: font.small, fontFamily: fonts.regular },

  reminderHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  reminderSub: { color: colors.muted, fontSize: font.small, marginTop: 2, fontFamily: fonts.regular },
  timeButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.bg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: spacing.md, marginTop: spacing.xs },
  timeButtonText: { color: colors.text, fontSize: font.body, fontFamily: fonts.heavy },
  timeButtonHint: { color: colors.link, fontSize: font.small, fontFamily: fonts.bold },

  aboutText: { color: colors.text, fontSize: font.body, fontFamily: fonts.bold },

  resetBtn: { borderWidth: 1, borderColor: '#F0C2C2', backgroundColor: '#FCEFEF', borderRadius: radius.pill, paddingVertical: spacing.md + 2, alignItems: 'center', marginTop: spacing.sm },
  resetText: { color: '#B91C1C', fontSize: font.body, fontFamily: fonts.heavy },
});
