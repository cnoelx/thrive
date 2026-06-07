import type { ImageSourcePropType } from 'react-native';

// Start/finish demo frames (public-domain, from the Free Exercise DB), toggled in the how-to sheet
// to read like an animation. Only moves with a clean DB match have images; the rest are cues-only.
// Note: lunge uses a walking-lunge demo, side plank a side-bridge, bar row an inverted-row — same
// movement pattern, close enough as a visual reference.
export const EXERCISE_IMAGES: Record<string, [ImageSourcePropType, ImageSourcePropType]> = {
  squat: [require('../assets/exercises/squat/start.jpg'), require('../assets/exercises/squat/end.jpg')],
  pushups: [require('../assets/exercises/pushups/start.jpg'), require('../assets/exercises/pushups/end.jpg')],
  plank: [require('../assets/exercises/plank/start.jpg'), require('../assets/exercises/plank/end.jpg')],
  glutebridge: [require('../assets/exercises/glutebridge/start.jpg'), require('../assets/exercises/glutebridge/end.jpg')],
  pullup: [require('../assets/exercises/pullup/start.jpg'), require('../assets/exercises/pullup/end.jpg')],
  sideplank: [require('../assets/exercises/sideplank/start.jpg'), require('../assets/exercises/sideplank/end.jpg')],
  lunge: [require('../assets/exercises/lunge/start.jpg'), require('../assets/exercises/lunge/end.jpg')],
  barrow: [require('../assets/exercises/barrow/start.jpg'), require('../assets/exercises/barrow/end.jpg')],
};
