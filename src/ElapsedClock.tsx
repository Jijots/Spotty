import { useEffect, useState } from 'react';
import { Text, type TextStyle } from 'react-native';
import { formatElapsed } from './lib/report';
import { colors, type } from './theme';

/** Counts up from `since`, once a second. It reads the wall clock, so it stays right after the app was in the background. */
export function ElapsedClock({ since, style }: { since: number; style?: TextStyle }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const text = formatElapsed(now - since);
  return (
    <Text maxFontSizeMultiplier={1.3} accessibilityLabel={`Workout time ${text}`} style={[type.data, { color: colors.accentText }, style]}>
      {text}
    </Text>
  );
}
