import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, LogBox, View } from 'react-native';

import { colors } from '@/constants/theme';
import { useAppStore } from '@/store/useAppStore';

// expo-notifications warns that *push* (remote) notifications don't work in Expo Go (removed in
// SDK 53). We only use *local* notifications, which work fine — so silence that dev-only overlay.
// (It never appears in a real build.)
LogBox.ignoreLogs(['expo-notifications: Android Push notifications']);

export default function RootLayout() {
  const hydrated = useAppStore((s) => s.hydrated);

  // Wait for AsyncStorage to load so we don't flash the wrong screen on cold start.
  if (!hydrated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
    </>
  );
}
