import { Text, TouchableOpacity } from 'react-native';
import { cap } from './lib/text';
import { PILL, colors } from './theme';

export function Chip({ label, active, onPress, accessibilityLabel }: { label: string; active: boolean; onPress: () => void; accessibilityLabel?: string }) {
  return (
    <TouchableOpacity onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityState={{ selected: active }} hitSlop={{ top: 2, bottom: 2 }} style={{
      maxWidth: 260, minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: PILL, borderWidth: 1,
      borderColor: active ? colors.accent : colors.border, backgroundColor: active ? colors.accent : 'transparent',
    }}>
      <Text numberOfLines={1} style={{ color: active ? colors.onAccent : colors.text, fontWeight: '600' }}>{cap(label)}</Text>
    </TouchableOpacity>
  );
}
