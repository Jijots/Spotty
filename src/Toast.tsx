import { Text, TouchableOpacity, View } from 'react-native';
import { TARGET, colors, type } from './theme';

/** A brief confirmation pinned above the tab bar, with an Undo when the action can be reversed. */
export function Toast({ message, onUndo }: { message: string; onUndo?: () => void }) {
  return (
    <View
      accessibilityLiveRegion="polite"
      style={{
        position: 'absolute', left: 12, right: 12, bottom: 12, flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, paddingLeft: 16, paddingRight: 4,
      }}>
      <Text style={[type.action, { flex: 1, paddingVertical: 14 }]} numberOfLines={2}>{message}</Text>
      {onUndo && (
        <TouchableOpacity onPress={onUndo} accessibilityRole="button" accessibilityLabel="Undo" style={{ minHeight: TARGET, minWidth: 64, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={[type.action, { color: colors.accentText }]}>Undo</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
