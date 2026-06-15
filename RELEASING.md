# Releasing Thrive

Thrive is sideloaded (not on Play Store). Two update paths run side by side:

- **OTA** (`eas update`) — silent JS/asset updates to the *installed* APK. Use for any change that
  touches only JS/TS/assets. No version bump, no reinstall.
- **APK build** (`eas build`) — a new native binary. Required whenever native modules or `app.json`
  change. The in-app self-updater (see `lib/updater.ts`) then prompts users to download + install it,
  so you only ever share a link **once** (the bootstrap below).

`runtimeVersion` follows `appVersion`, so a new APK version only receives OTA updates published for
that same version — bump deliberately.

---

## One-time setup

1. Create a GitHub repo (e.g. `christan94noel/thrive`) and push this project.
2. In `lib/updater.ts`, set `MANIFEST_URL` to:
   `https://github.com/<owner>/<repo>/releases/latest/download/latest.json`
   (`releases/latest/download/...` always resolves to the newest non-prerelease release.)
3. Build the **bootstrap** APK (the steps below), publish the release, and share that APK link with
   users **once**. Every release after this one updates in-app.

---

## Cutting a new APK release

1. **Bump the version name** in `app.json` → `expo.version` (e.g. `1.1.0` → `1.1.1`). This is the
   single source of truth: it becomes the Android `versionName`, what `latest.json` advertises, and
   what the updater compares. `versionCode` is auto-incremented by EAS (`autoIncrement` on the
   `preview` profile) so upgrades never fail on a duplicate.
2. **Update the changelog** (only if there are user-facing changes): bump `WHATS_NEW.version` and
   refresh `items` in `data/whatsNew.ts`. The same `items` feed both the in-app "What's new" popup
   and the updater's changelog.
3. **Verify:** `npx tsc --noEmit && npx jest`
4. **Build the APK:** `eas build -p android --profile preview`
   Download the artifact and rename it to `thrive-<version>.apk` (matching the version in app.json).
5. **Generate the manifest:** `node scripts/gen-latest-json.mjs <owner>/<repo>`
   (add `--mandatory` to force the update / hide "Later"). Writes `latest.json`.
6. **Publish the GitHub Release:**
   - Tag: `v<version>` (matches the apkUrl in `latest.json`).
   - **Not** a pre-release (or `releases/latest` won't pick it up).
   - Attach both files: `thrive-<version>.apk` **and** `latest.json`.

That's it — installed apps detect it on next launch and prompt to update.

## Shipping a JS-only change (no new APK)

`eas update --channel preview` — done. No version bump, no release, no reinstall.
