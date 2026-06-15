// Generates latest.json for the in-app APK self-updater (see lib/updater.ts + RELEASING.md).
// Single source of truth: version from app.json, changelog from data/whatsNew.ts — so they can't
// drift from what ships. Upload the output + the APK to a GitHub Release tagged v<version>.
//
//   node scripts/gen-latest-json.mjs <owner/repo> [--mandatory]
//
// <owner/repo> may be omitted if `git remote origin` is a GitHub URL.

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function repoSlug() {
  const arg = process.argv[2];
  if (arg && !arg.startsWith('--')) return arg;
  try {
    const url = execSync('git remote get-url origin', { cwd: root }).toString().trim();
    const m = url.match(/github\.com[:/]([^/]+\/[^/.]+)(?:\.git)?$/);
    if (m) return m[1];
  } catch {
    /* no remote */
  }
  console.error('No <owner/repo> given and no GitHub origin remote found.\nUsage: node scripts/gen-latest-json.mjs <owner/repo> [--mandatory]');
  process.exit(1);
}

const { version } = JSON.parse(readFileSync(join(root, 'app.json'), 'utf8')).expo;

// Pull the WHATS_NEW items[] string literals out of the .ts source (a flat array of quoted strings).
const wn = readFileSync(join(root, 'data', 'whatsNew.ts'), 'utf8');
const itemsBlock = wn.match(/items:\s*\[([\s\S]*?)\]/);
const changelog = itemsBlock ? [...itemsBlock[1].matchAll(/(['"`])((?:\\.|(?!\1).)*?)\1/g)].map((m) => m[2]) : [];

const slug = repoSlug();
const manifest = {
  version,
  apkUrl: `https://github.com/${slug}/releases/download/v${version}/thrive-${version}.apk`,
  changelog,
  mandatory: process.argv.includes('--mandatory'),
};

const out = join(root, 'latest.json');
writeFileSync(out, JSON.stringify(manifest, null, 2) + '\n');
console.log(`Wrote ${out}\n`, JSON.stringify(manifest, null, 2));
console.log(`\nNext: create a GitHub Release tagged v${version} (not prerelease) and attach:`);
console.log(`  - thrive-${version}.apk  (the EAS build output, renamed)`);
console.log(`  - latest.json`);
