// The streak flame (Tabler "flame" shape, bundled as tintable PNGs). Three tones:
//   done   — solid ember, filled in (a logged day)
//   active — ember outline, used bigger for "today, yet to do" — fills in to `done` when completed
//   idle   — faded ember outline, for missed/upcoming days
// Rest days use a bed icon elsewhere, not this.

import { Image } from 'react-native';

import { colors } from '@/constants/theme';

const FILLED = require('../assets/images/flame-filled.png');
const OUTLINE = require('../assets/images/flame-outline.png');
const IDLE = '#E7B999'; // faded ember

export type FlameTone = 'done' | 'active' | 'idle';

export function Flame({ tone, size }: { tone: FlameTone; size: number }) {
  return (
    <Image
      source={tone === 'done' ? FILLED : OUTLINE}
      style={{ width: size, height: size, resizeMode: 'contain', tintColor: tone === 'idle' ? IDLE : colors.session }}
    />
  );
}
