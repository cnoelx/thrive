// The 9:16 image we actually export for a Story — the workout card centred on a full-height backdrop
// with margin all round, so it doesn't sit edge-to-edge and the Story's tools land on the backdrop.
// Backdrops are paired opposite the card: orange card → dark backdrop, dark card → ember backdrop.
// Both backdrops use the same number of gradient stops (toggling colour count corrupts Expo's native
// LinearGradient on Android — see WorkoutCard).

import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { CardTheme, WorkoutCard, WorkoutCardData } from '@/components/WorkoutCard';

const BACKDROP = {
  orange: ['#241A10', '#150F0A', '#0A0D0C'], // dark, behind the ember card
  dark: ['#FDBA74', '#F0741B', '#B83C0F'], // ember, behind the ink card
} as const;

const BACKDROP_START = { x: 0.5, y: 0 };
const BACKDROP_END = { x: 0.5, y: 1 };

export function StoryFrame({ data, theme, width }: { data: WorkoutCardData; theme: CardTheme; width: number }) {
  const height = (width * 16) / 9;
  return (
    <LinearGradient colors={BACKDROP[theme]} start={BACKDROP_START} end={BACKDROP_END} style={[styles.frame, { width, height }]}>
      <View style={styles.cardShadow}>
        <WorkoutCard {...data} theme={theme} width={width * 0.8} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  frame: { alignItems: 'center', justifyContent: 'center' },
  cardShadow: {
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 16 },
    elevation: 16,
  },
});
