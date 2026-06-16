// Thin wrapper over expo-speech for screen-on voice coaching. Each cue stops the previous one so we
// never queue stale lines (e.g. tapping Done fast). Cue text comes from engine/voiceCues.ts.

import * as Speech from 'expo-speech';

/** Speak a line now, interrupting anything in progress. A lifted pitch + slightly quicker rate read
 *  as more energetic than the flat default (the device TTS engine still caps how lively it gets). */
export function say(line: string): void {
  Speech.stop();
  Speech.speak(line, { rate: 1.04, pitch: 1.12 });
}

/** Silence the coach (mute toggle, leaving the screen). */
export function stopSpeaking(): void {
  Speech.stop();
}
