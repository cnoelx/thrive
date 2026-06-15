// Drives the in-app APK self-updater from the root layout. Keeps the native side (lib/updater.ts,
// which imports Android-only modules) behind a dynamic import gated on Platform + enabled, so Expo Go
// and iOS never load it. Non-blocking: the app renders normally and the modal sits on top.

import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

import type { UpdatePhase } from '@/components/UpdateModal';
import type { UpdateManifest } from '@/lib/updateCheck';

export interface ApkUpdate {
  manifest: UpdateManifest | null;
  currentVersion: string | null;
  phase: UpdatePhase;
  progress: number;
  start: () => void;
  skip: () => void;
}

export function useApkUpdate(enabled: boolean): ApkUpdate {
  const [manifest, setManifest] = useState<UpdateManifest | null>(null);
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);
  const [phase, setPhase] = useState<UpdatePhase>('prompt');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!enabled || Platform.OS !== 'android') return;
    let alive = true;
    (async () => {
      try {
        const [updater, Application] = await Promise.all([import('@/lib/updater'), import('expo-application')]);
        const m = await updater.checkForAppUpdate();
        if (alive && m) {
          setManifest(m);
          setCurrentVersion(Application.nativeApplicationVersion);
        }
      } catch {
        // Offline / no release yet / read failure — just don't prompt.
      }
    })();
    return () => {
      alive = false;
    };
  }, [enabled]);

  const start = useCallback(() => {
    if (!manifest) return;
    setPhase('downloading');
    setProgress(0);
    (async () => {
      try {
        const updater = await import('@/lib/updater');
        const uri = await updater.downloadApk(manifest.apkUrl, setProgress);
        await updater.installApk(uri); // system installer takes over; prompt reappears next launch if cancelled
      } catch {
        setPhase('error');
      }
    })();
  }, [manifest]);

  const skip = useCallback(() => setManifest(null), []);

  return { manifest, currentVersion, phase, progress, start, skip };
}
