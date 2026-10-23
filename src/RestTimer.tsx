import { useEffect, useRef, useState } from 'react';
import { Text, TouchableOpacity, Vibration, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAudioPlayer } from 'expo-audio';
import { PILL, TARGET, colors, type, ui } from './theme';
import { REST_DONE_SOUND } from './restSound';

const fmt = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

/**
 * Countdown bar. It is driven by an absolute end time rather than a counter, so it stays
 * correct when the app is backgrounded or the JS thread stalls.
 */
export function RestTimer({ endsAt, totalSec, next, onAdjust, onClose }: {
  endsAt: number; totalSec: number; /** What to do after this rest, e.g. "Bench Press · set 3 · 82.5 kg × 8". */ next?: string | null;
  onAdjust: (deltaSec: number) => void; onClose: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const buzzedFor = useRef(0);
  const player = useAudioPlayer(REST_DONE_SOUND);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  const left = Math.max(Math.ceil((endsAt - now) / 1000), 0);
  const done = left === 0;

  useEffect(() => {
    if (done && buzzedFor.current !== endsAt) {
      buzzedFor.current = endsAt;
      Vibration.vibrate([0, 250, 120, 250]);
      void player.seekTo(0).then(() => player.play()).catch(() => {});
    }
  }, [done, endsAt, player]);

  const pct = Math.min(Math.max(1 - left / Math.max(totalSec, 1), 0), 1);
  const adjust = {
    minHeight: TARGET, minWidth: 92, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center',
    borderRadius: PILL, borderWidth: 1, borderColor: colors.border,
  } as const;

  return (
    <View
      accessibilityViewIsModal
      style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.58)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <View style={{
        width: '100%', maxWidth: 420, backgroundColor: colors.card, borderRadius: 28, borderWidth: 2,
        borderColor: done ? colors.accent : colors.border, padding: 24, gap: 20,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={[type.header, { color: done ? colors.accentText : colors.muted, letterSpacing: 1.4 }]}>
            {done ? 'REST COMPLETE' : 'RESTING'}
          </Text>
          <TouchableOpacity
            onPress={onClose} accessibilityRole="button" accessibilityLabel={done ? 'Dismiss rest timer' : 'Skip rest'}
            style={{ width: TARGET, height: TARGET, borderRadius: PILL, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
        </View>

        <Text
          maxFontSizeMultiplier={1.2} accessibilityLiveRegion={done ? 'polite' : 'none'}
          style={[type.countdown, { fontSize: 68, lineHeight: 76, textAlign: 'center' }, done && { color: colors.accentText }]}>
          {done ? 'Go!' : fmt(left)}
        </Text>

        <View style={{ height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden' }}>
          <View style={{ height: 8, width: `${pct * 100}%`, backgroundColor: colors.accent, borderRadius: 4 }} />
        </View>

        {next ? (
          <Text accessibilityLiveRegion={done ? 'polite' : 'none'} style={[ui.text, { textAlign: 'center' }]}>
            {next}
          </Text>
        ) : null}

        {!done && (
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12 }}>
            <TouchableOpacity style={adjust} onPress={() => onAdjust(-15)} accessibilityRole="button" accessibilityLabel="Reduce rest by 15 seconds">
              <Text style={type.action}>−15 sec</Text>
            </TouchableOpacity>
            <TouchableOpacity style={adjust} onPress={() => onAdjust(15)} accessibilityRole="button" accessibilityLabel="Add 15 seconds of rest">
              <Text style={type.action}>+15 sec</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={done ? ui.button : ui.ghost} onPress={onClose} accessibilityRole="button">
          <Text style={done ? ui.buttonText : ui.ghostText}>{done ? 'Back to workout' : 'Skip rest'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
