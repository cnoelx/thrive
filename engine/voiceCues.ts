// Pure text layer for screen-on voice coaching. Turns a workout step into a short, speakable line —
// the messy on-screen target strings ("30s/leg", "wall ×8", "free 90s") don't read aloud well, so we
// normalise them for TTS. No native imports; the actual speaking lives in lib/speech.ts.

/** Normalise a target string into something a text-to-speech voice can read naturally.
 *  Drops the in-screen parentheticals, expands units (s→seconds, min→minutes), turns "×8" into
 *  "8 reps" and "/leg"·"/side" into words, and appends "reps" to a bare number. */
export function spokenTarget(target: string): string {
  let t = ` ${target} `;
  t = t.replace(/\s*\(.*?\)\s*/g, ' '); // drop parentheticals — the screen keeps the detail
  t = t.replace(/(\d+)\s*min\b/g, '$1 minutes');
  t = t.replace(/(\d+)\s*s\b/g, '$1 seconds'); // 15s, 90s, 2s
  t = t.replace(/\s*×\s*(\d+)/g, ', $1 reps'); // wall ×8 → wall, 8 reps
  t = t.replace(/\/leg/g, ' per leg').replace(/\/side/g, ' per side');
  t = t.replace(/\s*,\s*/g, ', ').replace(/\s+/g, ' ').replace(/^[\s,]+|\s+$/g, '');
  return /^\d+$/.test(t) ? `${t} reps` : t; // bare number (incl. once parentheticals are dropped) → reps
}

/** What to say when a set becomes the active one. */
export function setCue(opts: { name: string; target: string; isCheck: boolean }): string {
  if (opts.isCheck) return `${opts.name}. One-time check.`;
  return `${opts.name}. ${spokenTarget(opts.target)}.`;
}

/** What to say when rest begins, naming the next move if there is one. */
export function restCue(restSec: number, nextName: string | null): string {
  const base = `Rest, ${restSec} seconds.`;
  return nextName ? `${base} Next up, ${nextName}.` : base;
}

/** Spoken when the session starts, before the first set cue. */
export function introCue(focus: string): string {
  return `${focus}. Let's go!`;
}

export const FINISH_CUE = 'Workout complete! Great work — see you next time!';
