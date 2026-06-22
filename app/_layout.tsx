import { Outfit_500Medium, Outfit_700Bold, Outfit_800ExtraBold, Outfit_900Black, useFonts } from '@expo-google-fonts/outfit';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Updates from 'expo-updates';
import { useEffect, useState } from 'react';
import { ActivityIndicator, LogBox, Text, View } from 'react-native';

import { UpdateModal } from '@/components/UpdateModal';
import { colors, font, fonts, spacing } from '@/constants/theme';
import { useApkUpdate } from '@/lib/useApkUpdate';
import { useNotificationRouting } from '@/lib/useNotificationRouting';
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
  const [fontsLoaded] = useFonts({ Outfit_500Medium, Outfit_700Bold, Outfit_800ExtraBold, Outfit_900Black });
  // Updates.isEnabled is false in Expo Go and dev builds, so this gate only runs in production.
  const [updating, setUpdating] = useState(Updates.isEnabled && !__DEV__);
  // Separate from OTA: prompts for a newer sideloaded APK (native/version bumps). No-op in dev/Expo Go.
  const apk = useApkUpdate(!__DEV__);
  // Tapping a Rhythm notification jumps straight to the Rhythm screen.
  useNotificationRouting();

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
        <Text style={{ color: colors.primaryText, fontSize: font.body, fontFamily: fontsLoaded ? fonts.heavy : undefined }}>Updating…</Text>
        <Text style={{ color: colors.onInkMuted, fontSize: font.small, fontFamily: fontsLoaded ? fonts.regular : undefined }}>Getting the latest version</Text>
      </View>
    );
  }

  // Wait for AsyncStorage to load (and fonts, which are local and instant) so screens render right.
  if (!hydrated || !fontsLoaded) {
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
      {apk.manifest && (
        <UpdateModal
          manifest={apk.manifest}
          currentVersion={apk.currentVersion}
          phase={apk.phase}
          progress={apk.progress}
          onUpdate={apk.start}
          onSkip={apk.skip}
        />
      )}
    </>
  );
}
