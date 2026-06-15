import { afterEach, describe, expect, it, jest } from '@jest/globals';

import { checkForUpdate, compareVersions, fetchManifest, isNewer, parseManifest } from '@/lib/updateCheck';

describe('compareVersions', () => {
  it('orders by numeric segment, not lexically', () => {
    expect(compareVersions('1.10.0', '1.2.0')).toBe(1); // 10 > 2
    expect(compareVersions('1.2.0', '1.10.0')).toBe(-1);
    expect(compareVersions('2.0.0', '1.9.9')).toBe(1);
  });

  it('treats missing segments as zero', () => {
    expect(compareVersions('1.2', '1.2.0')).toBe(0);
    expect(compareVersions('1.2.1', '1.2')).toBe(1);
  });

  it('equal versions return 0', () => {
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
  });
});

describe('isNewer', () => {
  it('true only when latest strictly exceeds installed', () => {
    expect(isNewer('1.0.0', '1.1.0')).toBe(true);
    expect(isNewer('1.1.0', '1.1.0')).toBe(false);
    expect(isNewer('1.2.0', '1.1.0')).toBe(false);
  });

  it('never prompts when the installed version is unknown', () => {
    expect(isNewer(null, '9.9.9')).toBe(false);
    expect(isNewer(undefined, '9.9.9')).toBe(false);
  });
});

describe('parseManifest', () => {
  it('accepts a well-formed manifest', () => {
    const m = parseManifest({ version: '1.1.0', apkUrl: 'https://x/app.apk', changelog: ['a', 'b'], mandatory: true });
    expect(m).toEqual({ version: '1.1.0', apkUrl: 'https://x/app.apk', changelog: ['a', 'b'], mandatory: true });
  });

  it('defaults changelog to [] and mandatory to false', () => {
    const m = parseManifest({ version: '1.1.0', apkUrl: 'https://x/app.apk' });
    expect(m).toEqual({ version: '1.1.0', apkUrl: 'https://x/app.apk', changelog: [], mandatory: false });
  });

  it('drops non-string changelog entries', () => {
    const m = parseManifest({ version: '1.1.0', apkUrl: 'https://x/app.apk', changelog: ['ok', 5, null, 'fine'] });
    expect(m!.changelog).toEqual(['ok', 'fine']);
  });

  it('rejects malformed or non-https manifests', () => {
    expect(parseManifest(null)).toBeNull();
    expect(parseManifest('nope')).toBeNull();
    expect(parseManifest({ version: '1.1.0' })).toBeNull(); // no apkUrl
    expect(parseManifest({ apkUrl: 'https://x/app.apk' })).toBeNull(); // no version
    expect(parseManifest({ version: '1.1.0', apkUrl: 'http://x/app.apk' })).toBeNull(); // plain http
  });
});

describe('fetchManifest / checkForUpdate', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  function mockFetch(body: unknown, ok = true) {
    global.fetch = jest.fn(async () => ({ ok, json: async () => body })) as unknown as typeof fetch;
  }

  it('fetchManifest returns null on a non-ok response', async () => {
    mockFetch({}, false);
    expect(await fetchManifest('https://x/latest.json')).toBeNull();
  });

  it('fetchManifest returns null when fetch throws', async () => {
    global.fetch = jest.fn(async () => {
      throw new Error('offline');
    }) as unknown as typeof fetch;
    expect(await fetchManifest('https://x/latest.json')).toBeNull();
  });

  it('checkForUpdate returns the manifest when a newer build exists', async () => {
    mockFetch({ version: '1.1.0', apkUrl: 'https://x/app.apk', changelog: ['new'] });
    const m = await checkForUpdate('https://x/latest.json', '1.0.0');
    expect(m!.version).toBe('1.1.0');
  });

  it('checkForUpdate returns null when already up to date', async () => {
    mockFetch({ version: '1.0.0', apkUrl: 'https://x/app.apk' });
    expect(await checkForUpdate('https://x/latest.json', '1.0.0')).toBeNull();
  });
});
