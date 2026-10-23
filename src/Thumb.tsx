import { memo } from 'react';
import { View } from 'react-native';
import { MuscleTile } from './BodyMap';
import type { Exercise } from './data/exercises';
import { colors } from './theme';

/** Square exercise tile: a body figure with the muscles worked in blue. Works offline and in both themes. */
function ThumbView({ exercise, size = 56 }: { exercise: Pick<Exercise, 'muscle'> & Partial<Pick<Exercise, 'secondary'>>; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.bg }} accessible={false}>
      <MuscleTile muscle={exercise.muscle} secondary={exercise.secondary} size={size} />
    </View>
  );
}

export const Thumb = memo(ThumbView, (a, b) => a.size === b.size && a.exercise.muscle === b.exercise.muscle && a.exercise.secondary === b.exercise.secondary);
