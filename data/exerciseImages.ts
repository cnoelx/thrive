import type { ImageSourcePropType } from 'react-native';

// Start/finish demo frames (public-domain, from the Free Exercise DB), toggled in the how-to sheet
// to read like an animation. Only moves with a clean DB match have images; the rest are cues-only
// (sit-to-stand, balance, overhead reach, ankle test — no DB equivalents).
// Note: lunge uses a walking-lunge demo, side plank a side-bridge, bar row an inverted-row, prone
// leg raise a quadruped rear leg raise, deep squat hold the squat's bottom position — same
// movement pattern, close enough as a visual reference.
// Single looping demo animations (GIF/WebP), played via expo-image — preferred over the 2-frame
// toggle below when present. Populated as consistent animated assets land in assets/exercises/anim/.
export const EXERCISE_ANIMATIONS: Record<string, ImageSourcePropType> = {
  squat: require('../assets/exercises/anim/squat.webp'),
  pushups: require('../assets/exercises/anim/pushups.webp'),
  plank: require('../assets/exercises/anim/plank.webp'),
  barrow: require('../assets/exercises/anim/barrow.webp'),
};

export const EXERCISE_IMAGES: Record<string, [ImageSourcePropType, ImageSourcePropType]> = {
  squat: [require('../assets/exercises/squat/start.jpg'), require('../assets/exercises/squat/end.jpg')],
  pushups: [require('../assets/exercises/pushups/start.jpg'), require('../assets/exercises/pushups/end.jpg')],
  plank: [require('../assets/exercises/plank/start.jpg'), require('../assets/exercises/plank/end.jpg')],
  glutebridge: [require('../assets/exercises/glutebridge/start.jpg'), require('../assets/exercises/glutebridge/end.jpg')],
  pullup: [require('../assets/exercises/pullup/start.jpg'), require('../assets/exercises/pullup/end.jpg')],
  sideplank: [require('../assets/exercises/sideplank/start.jpg'), require('../assets/exercises/sideplank/end.jpg')],
  // Frames swapped: the DB demo steps forward, the app's move is a REVERSE lunge — played
  // backwards it reads as stepping back into the lunge.
  lunge: [require('../assets/exercises/lunge/end.jpg'), require('../assets/exercises/lunge/start.jpg')],
  barrow: [require('../assets/exercises/barrow/start.jpg'), require('../assets/exercises/barrow/end.jpg')],
  superman: [require('../assets/exercises/superman/start.jpg'), require('../assets/exercises/superman/end.jpg')],
  pronelegraise: [require('../assets/exercises/pronelegraise/start.jpg'), require('../assets/exercises/pronelegraise/end.jpg')],
  walkrun: [require('../assets/exercises/walkrun/start.jpg'), require('../assets/exercises/walkrun/end.jpg')],
  deepsquat: [require('../assets/exercises/squat/end.jpg'), require('../assets/exercises/squat/start.jpg')],
};
