import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Updates from 'expo-updates';
import { useEffect, useState } from 'react';
import { ActivityIndicator, LogBox, Text, View } from 'react-native';

import { colors, font, spacing } from '@/constants/theme';
import { useAppStore } from '@/store/useAppStore';

// expo-notifications warns that *push* (remote) notifications don't work in Expo Go (removed in
// SDK 53). We only use *local* notifications, which work fine — so silence that dev-only overlay.
// (It never appears in a real build.)
LogBox.ignoreLogs(['expo-notifications: Android Push notifications']);

// How long the launch may be held for an update check + download before giving up and starting
// with the current version (the download still finishes in the background for next launch).
const UPDATE_TIMEOUT_MS = 10000;

export default function RootLayout() {
  const hydrated = useAppStore((s) => s.hydrated);
  // Updates.isEnabled is false in Expo Go and dev builds, so this gate only runs in production.
  const [updating, setUpdating] = useState(Updates.isEnabled && !__DEV__);

  useEffect(() => {
    if (!updating) return;
    let alive = true;
    const timeout = new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), UPDATE_TIMEOUT_MS));
    (async () => {
      try {
        const check = await Promise.race([Updates.checkForUpdateAsync(), timeout]);
        if (alive && check !== 'timeout' && check.isAvailable) {
          const fetched = await Promise.race([Updates.fetchUpdateAsync(), timeout]);
          if (alive && fetched !== 'timeout' && fetched.isNew) {
            await Updates.reloadAsync();
            return;
          }
        }
      } catch {
        // Offline or the update server is unreachable — start the app normally.
      }
      if (alive) setUpdating(false);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (updating) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.inkCard, gap: spacing.md }}>
        <ActivityIndicator color={colors.primaryText} />
        <Text style={{ color: colors.primaryText, fontSize: font.body, fontWeight: '800' }}>Updating…</Text>
        <Text style={{ color: colors.onInkMuted, fontSize: font.small }}>Getting the latest version</Text>
      </View>
    );
  }

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
