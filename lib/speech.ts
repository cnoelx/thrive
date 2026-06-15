// Thin wrapper over expo-speech for screen-on voice coaching. Each cue stops the previous one so we
// never queue stale lines (e.g. tapping Done fast). Cue text comes from engine/voiceCues.ts.

import * as Speech from 'expo-speech';

/** Speak a line now, interrupting anything in progress. */
export function say(line: string): void {
  Speech.stop();
  Speech.speak(line, { rate: 0.96 });
}

/** Silence the coach (mute toggle, leaving the screen). */
export function stopSpeaking(): void {
  Speech.stop();
}
