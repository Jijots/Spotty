import { useEffect, useRef, useState } from 'react';
import { Text, TouchableOpacity, Vibration, View } from 'react-native';
import { PILL, colors, type } from './theme';

const fmt = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

/**
 * Countdown bar. It is driven by an absolute end time rather than a counter, so it stays
 * correct when the app is backgrounded or the JS thread stalls.
 */
export function RestTimer({ endsAt, totalSec, next, onAdjust, onClose, bottomInset = 0 }: {
  /** Space the system navigation bar takes, so the bar sits above it. */ bottomInset?: number;
  endsAt: number; totalSec: number; /** What to do after this rest, e.g. "Bench Press · set 3 · 82.5 kg × 8". */ next?: string | null;
  onAdjust: (deltaSec: number) => void; onClose: () => void;
}) {
  const [now, setNow] = useState(Date.now());
  const buzzedFor = useRef(0);

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
    }
  }, [done, endsAt]);

  const pct = Math.min(Math.max(1 - left / Math.max(totalSec, 1), 0), 1);
  const btn = { minHeight: 48, minWidth: 56, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', borderRadius: PILL, borderWidth: 1, borderColor: colors.border } as const;

  return (
    <View style={{
      position: 'absolute', left: 12, right: 12, bottom: 12 + bottomInset, backgroundColor: colors.card, borderRadius: 16,
      borderWidth: 1, borderColor: done ? colors.accent : colors.border, padding: 12, gap: 8,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Text maxFontSizeMultiplier={1.3} accessibilityLiveRegion={done ? 'polite' : 'none'} style={[type.countdown, { minWidth: 84 }, done && { color: colors.accentText }]}>
          {done ? 'Go!' : fmt(left)}
        </Text>
        <TouchableOpacity style={btn} onPress={() => onAdjust(-15)}><Text style={type.action}>−15s</Text></TouchableOpacity>
        <TouchableOpacity style={btn} onPress={() => onAdjust(15)}><Text style={type.action}>+15s</Text></TouchableOpacity>
        <TouchableOpacity style={[btn, { marginLeft: 'auto' }]} onPress={onClose}>
          <Text style={type.action}>{done ? 'Dismiss' : 'Skip'}</Text>
        </TouchableOpacity>
      </View>
      {next ? (
        <Text numberOfLines={1} accessibilityLiveRegion={done ? 'polite' : 'none'} style={[type.meta, done && { color: colors.text }]}>
          {next}
        </Text>
      ) : null}
      <View style={{ height: 4, backgroundColor: colors.border, borderRadius: 2 }}>
        <View style={{ height: 4, width: `${pct * 100}%`, backgroundColor: colors.accent, borderRadius: 2 }} />
      </View>
    </View>
  );
}
