// Native side of the in-app APK self-updater (Android-only; only runs inside a built APK — these
// modules aren't in Expo Go or an OTA bundle). Reads the installed version, downloads the new APK to
// cache with real byte-progress, and hands off to the system installer. The decision logic lives in
// lib/updateCheck.ts. Hosting: a GitHub Release carrying latest.json + the .apk asset.

import * as Application from 'expo-application';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import { Platform } from 'react-native';

import { checkForUpdate, type UpdateManifest } from '@/lib/updateCheck';

export type { UpdateManifest } from '@/lib/updateCheck';

// The raw latest.json on GitHub Releases. `releases/latest/download/<asset>` always resolves to the
// newest published release, so this URL is stable across versions.
// TODO(build): replace OWNER/REPO with the real repo once the GitHub Release is set up.
export const MANIFEST_URL = 'https://github.com/OWNER/REPO/releases/latest/download/latest.json';

const FLAG_GRANT_READ_URI_PERMISSION = 1;
const APK_MIME = 'application/vnd.android.package-archive';

/** Launch-time check. Android-only; returns null on iOS/web or when already current. */
export async function checkForAppUpdate(url: string = MANIFEST_URL): Promise<UpdateManifest | null> {
  if (Platform.OS !== 'android') return null;
  return checkForUpdate(url, Application.nativeApplicationVersion);
}

/** Download the APK to the cache dir, reporting fractional progress (0..1). Returns the local file URI. */
export async function downloadApk(apkUrl: string, onProgress: (fraction: number) => void): Promise<string> {
  const target = `${FileSystem.cacheDirectory}thrive-update.apk`;
  const dl = FileSystem.createDownloadResumable(apkUrl, target, {}, (p) => {
    if (p.totalBytesExpectedToWrite > 0) onProgress(p.totalBytesWritten / p.totalBytesExpectedToWrite);
  });
  const res = await dl.downloadAsync();
  if (!res?.uri) throw new Error('Download failed');
  return res.uri;
}

/** Hand the downloaded APK to the system installer. Requires REQUEST_INSTALL_PACKAGES in the manifest. */
export async function installApk(fileUri: string): Promise<void> {
  const contentUri = await FileSystem.getContentUriAsync(fileUri);
  await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
    data: contentUri,
    type: APK_MIME,
    flags: FLAG_GRANT_READ_URI_PERMISSION,
  });
}
