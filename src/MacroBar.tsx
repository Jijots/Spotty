import { Text, View } from 'react-native';
import { colors, type, ui } from './theme';

/** A labelled progress bar toward a daily target. Going over the target is said in words, not only by a full bar. */
export function MacroBar({ label, value, target, unit }: { label: string; value: number; target: number; unit: string }) {
  const pct = target > 0 ? Math.min(value / target, 1) : 0;
  const over = target > 0 && value > target ? value - target : 0;
  return (
    <View
      style={{ gap: 4 }} accessible accessibilityRole="progressbar"
      accessibilityLabel={`${label}: ${value} of ${target} ${unit}${over ? `, ${over} over` : ''}`}
      accessibilityValue={{ min: 0, max: Math.max(target, 1), now: Math.min(value, Math.max(target, 1)) }}>
      <View style={[ui.row, { justifyContent: 'space-between' }]}>
        <Text style={ui.text}>{label}</Text>
        <Text style={type.meta}>{value} / {target} {unit}{over ? ` · ${over} over` : ''}</Text>
      </View>
      <View style={{ height: 8, backgroundColor: colors.border, borderRadius: 4 }}>
        <View style={{ height: 8, width: `${pct * 100}%`, backgroundColor: colors.accent, borderRadius: 4 }} />
      </View>
    </View>
  );
}
