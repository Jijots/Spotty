import { useEffect, useState } from 'react';
import { AccessibilityInfo, Image, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { imageUrl } from './data/exercises';
import { PHOTO_TILE, colors } from './theme';

const FRAME_MS = 900;

/**
 * The dataset has a start and an end photo per exercise. Flipping between them shows the movement.
 * Tap to pause or play; with the system "reduce motion" setting on, it starts paused.
 */
export function ExerciseMotion({ images, name, height = 240 }: { images: string[]; name: string; height?: number }) {
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [failed, setFailed] = useState(false);
  const animated = images.length > 1;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => { if (reduce) setPlaying(false); }).catch(() => {});
    images.forEach((p) => Image.prefetch(imageUrl(p)).catch(() => {}));
  }, [images]);

  useEffect(() => {
    if (!animated || !playing) return;
    const t = setInterval(() => setFrame((f) => (f + 1) % images.length), FRAME_MS);
    return () => clearInterval(t);
  }, [animated, playing, images.length]);

  if (images.length === 0 || failed) return null;

  return (
    <TouchableOpacity
      activeOpacity={1} disabled={!animated} onPress={() => setPlaying((p) => !p)} accessibilityRole="button"
      accessibilityLabel={animated ? `${name} movement. ${playing ? 'Pause' : 'Play'}` : `${name} photo`}
      style={{ width: '100%', height, borderRadius: 16, overflow: 'hidden', backgroundColor: PHOTO_TILE }}>
      <Image source={{ uri: imageUrl(images[frame] ?? images[0]) }} onError={() => setFailed(true)} style={{ width: '100%', height }} resizeMode="cover" accessible={false} />
      {animated && !playing && (
        <View style={{ position: 'absolute', right: 12, bottom: 12, width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="play" size={22} color={colors.accentText} />
        </View>
      )}
    </TouchableOpacity>
  );
}
