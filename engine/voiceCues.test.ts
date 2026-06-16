import { describe, expect, it } from '@jest/globals';

import { FINISH_CUE, introCue, restCue, setCue, spokenTarget } from '@/engine/voiceCues';

describe('spokenTarget', () => {
  it('appends "reps" to a bare number', () => {
    expect(spokenTarget('15')).toBe('15 reps');
    expect(spokenTarget('22')).toBe('22 reps');
  });

  it('expands seconds and minutes', () => {
    expect(spokenTarget('free 90s')).toBe('free 90 seconds');
    expect(spokenTarget('active hang 15s')).toBe('active hang 15 seconds');
    expect(spokenTarget('brisk walk 10min')).toBe('brisk walk 10 minutes');
  });

  it('turns the ×N rep marker into words', () => {
    expect(spokenTarget('wall ×8')).toBe('wall, 8 reps');
    expect(spokenTarget('feet-elevated ×10')).toBe('feet-elevated, 10 reps');
  });

  it('expands /leg and /side', () => {
    expect(spokenTarget('30s/leg')).toBe('30 seconds per leg');
    expect(spokenTarget('knee 10s/side')).toBe('knee 10 seconds per side');
  });

  it('drops the on-screen parenthetical detail', () => {
    expect(spokenTarget('10 (5/leg)')).toBe('10 reps');
    expect(spokenTarget('incline ×8 (hands on a counter)')).toBe('incline, 8 reps');
    expect(spokenTarget('negatives ×5 (lower down slowly)')).toBe('negatives, 5 reps');
  });

  it('leaves already-wordy targets readable', () => {
    expect(spokenTarget('5 full push-ups')).toBe('5 full push-ups');
    expect(spokenTarget('upright, 5 reps')).toBe('upright, 5 reps');
  });
});

describe('cues', () => {
  it('setCue speaks name + spoken target', () => {
    expect(setCue({ name: 'Push-ups', target: 'wall ×8', isCheck: false })).toBe('Push-ups. wall, 8 reps.');
  });

  it('setCue marks a one-time check without reps', () => {
    expect(setCue({ name: 'Overhead Reach', target: 'ribs stay down', isCheck: true })).toBe('Overhead Reach. One-time check.');
  });

  it('restCue names the next move when present', () => {
    expect(restCue(60, 'Plank')).toBe('Rest, 60 seconds. Next up, Plank.');
    expect(restCue(45, null)).toBe('Rest, 45 seconds.');
  });

  it('introCue and finish line', () => {
    expect(introCue('Full Body')).toBe("Full Body. Let's go!");
    expect(FINISH_CUE).toMatch(/complete/i);
  });
});
