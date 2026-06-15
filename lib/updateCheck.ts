// Pure decision layer for the in-app APK self-updater. No native imports, so it's unit-testable and
// safe to load anywhere. The native side (read installed version, download, install) lives in
// lib/updater.ts and only runs inside a built APK. Hosting: a `latest.json` on GitHub Releases that
// each release mirrors — { version, apkUrl, changelog, mandatory }.

export interface UpdateManifest {
  version: string; // e.g. "1.1.0" — must match the APK's app.json version
  apkUrl: string; // https URL of the .apk asset
  changelog: string[]; // short user-facing lines for the "what's new" list
  mandatory: boolean; // true → hide Skip, force the update
}

/** Compare dotted numeric versions ("1.2.0" vs "1.10.0"). Returns -1, 0, or 1. Non-numeric or missing
 *  segments count as 0, so "1.2" and "1.2.0" are equal. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.');
  const pb = b.split('.');
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const d = (parseInt(pa[i] ?? '0', 10) || 0) - (parseInt(pb[i] ?? '0', 10) || 0);
    if (d !== 0) return d < 0 ? -1 : 1;
  }
  return 0;
}

/** True when `latest` is a strictly newer build than what's installed. A null installed version
 *  (web / dev client / read failure) never prompts — we only nudge when we're sure. */
export function isNewer(installed: string | null | undefined, latest: string): boolean {
  if (!installed) return false;
  return compareVersions(latest, installed) > 0;
}

/** Validate an untrusted JSON blob into a manifest, or null if it's malformed. Requires an https
 *  apkUrl so a tampered manifest can't point us at plain http. */
export function parseManifest(raw: unknown): UpdateManifest | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.version !== 'string' || typeof o.apkUrl !== 'string') return null;
  if (!/^https:\/\//i.test(o.apkUrl)) return null;
  const changelog = Array.isArray(o.changelog) ? o.changelog.filter((x): x is string => typeof x === 'string') : [];
  return { version: o.version, apkUrl: o.apkUrl, changelog, mandatory: o.mandatory === true };
}

/** Fetch + validate the manifest. Never throws — returns null on any network/parse failure so a check
 *  on launch can fail silently. */
export async function fetchManifest(url: string): Promise<UpdateManifest | null> {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    return parseManifest(await res.json());
  } catch {
    return null;
  }
}

/** The whole launch-time decision: fetch the manifest and return it only if it's a newer build than
 *  `installed`. Otherwise null (no prompt). */
export async function checkForUpdate(url: string, installed: string | null): Promise<UpdateManifest | null> {
  const m = await fetchManifest(url);
  if (!m) return null;
  return isNewer(installed, m.version) ? m : null;
}
