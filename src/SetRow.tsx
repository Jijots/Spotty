import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { sanitizeDecimal, sanitizeInt, stepValue, type Row } from './lib/draft';
import { effortFor, readableOn } from './lib/effort';
import type { Unit } from './lib/units';
import { PILL, TARGET, colors, inputTheme, type, ui } from './theme';

// Width budget for one set row, inside a card, on the narrowest phone we ship to (320 dp):
//   screen gutters 32 + card border/padding 30 + row padding 12 (its border is offset by a -1 margin) = 74.
//   label 24 + RIR 48 + check 48 + 4 gaps × 6 = 144; weight and reps share what is left (min 48 each).
//   The header uses the same 6 dp inset so its columns line up with the rows.
const GAP = 6;
const LABEL_W = 24;
const RIR_W = TARGET;

/** Column names sit above the rows so the unit never disappears once a weight is typed. */
export function ColumnHeader({ unit, weighted }: { unit: Unit; weighted: boolean }) {
  const t = [type.header, { textAlign: 'center' as const }];
  return (
    <View
      accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={{ flexDirection: 'row', gap: GAP, paddingHorizontal: 6 }}>
      <View style={{ width: LABEL_W }} />
      {weighted && <Text style={[...t, { flex: 1.3, minWidth: TARGET }]}>{unit}</Text>}
      <Text style={[...t, { flex: 1, minWidth: TARGET }]}>reps</Text>
      <Text style={[...t, { width: RIR_W }]}>RIR</Text>
      <View style={{ width: TARGET }} />
    </View>
  );
}

/** Long weights ("182.5", "1000.5") step down so they stay inside the narrowest field instead of clipping. */
const weightSize = (w: string) => ({ fontSize: w.length >= 6 ? 16 : w.length === 5 ? 18 : 20 });

/** Drawn, not a text glyph: renders identically on every device and font. */
function Checkmark({ color }: { color: string }) {
  return <View style={{ width: 9, height: 17, marginTop: -4, borderRightWidth: 3, borderBottomWidth: 3, borderColor: color, transform: [{ rotate: '45deg' }] }} />;
}

function StepButton({ label, hint, onPress }: { label: string; hint: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress} accessibilityRole="button" accessibilityLabel={hint}
      style={{ flex: 1, minHeight: TARGET, alignItems: 'center', justifyContent: 'center', borderRadius: PILL, borderWidth: 1, borderColor: colors.border }}>
      <Text maxFontSizeMultiplier={1.3} style={type.action}>{label}</Text>
    </TouchableOpacity>
  );
}

/**
 * One set. The active set gets a green outline and ± buttons for weight and reps, so the common
 * adjustments are one thumb tap instead of a number-pad round trip. Other sets stay a single line.
 * Bodyweight and band work (`weighted` false) drops the weight column entirely: reps, RIR, done.
 */
export function SetRow({ row, label, shortLabel, unit, weighted, weightStep, active, onActivate, onChange, onToggle, onRemove, onMeasure }: {
  row: Row; label: string; shortLabel: string; unit: Unit; weighted: boolean; weightStep: number; active: boolean;
  onActivate: () => void; onChange: (patch: Partial<Row>) => void; onToggle: () => void; onRemove: () => void;
  /** Reports the row's top edge within its card, so the screen can scroll to it. */
  onMeasure?: (y: number) => void;
}) {
  // Built here, not at module level, so it follows the current theme.
  // Effort tints the set number once an RIR is entered; the RIR field itself still carries the exact value.
  const effort = row.warmup ? null : effortFor(row.rir);
  const fill = effort ? colors.ramp[effort.level] : undefined;
  const cell = [ui.input, type.data, { height: TARGET, minWidth: TARGET, textAlign: 'center' as const, textAlignVertical: 'center' as const, paddingHorizontal: 4, paddingVertical: 0 }];
  return (
    <View onLayout={(e) => onMeasure?.(e.nativeEvent.layout.y)} style={{
      padding: 6, gap: GAP, borderRadius: 12, borderWidth: 1, marginHorizontal: -1,
      borderColor: active ? colors.accent : 'transparent',
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: GAP, height: TARGET }}>
        <TouchableOpacity
          onPress={onActivate} onLongPress={onRemove}
          accessibilityLabel={`${label}${effort ? `, ${effort.word}` : ''}. Double tap to select, long press to remove`} accessibilityState={{ selected: active }}
          style={{ width: LABEL_W, height: TARGET, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: fill }}>
            <Text style={[type.header, { fontSize: 13 }, row.warmup && { color: colors.accentText }, fill && { color: readableOn(fill) }]}>{shortLabel}</Text>
          </View>
        </TouchableOpacity>
        {weighted && (
          <TextInput
            style={[...cell, { flex: 1.3 }, weightSize(row.weight)]} keyboardType="decimal-pad" value={row.weight} placeholder="–" maxLength={7}
            selectTextOnFocus maxFontSizeMultiplier={1.3} accessibilityLabel={`${label} weight in ${unit}`}
            {...inputTheme} onFocus={onActivate}
            onChangeText={(t) => onChange({ weight: sanitizeDecimal(t) })} />
        )}
        <TextInput
          style={[...cell, { flex: 1 }]} keyboardType="number-pad" value={row.reps} placeholder="0" maxLength={3}
          selectTextOnFocus maxFontSizeMultiplier={1.3} accessibilityLabel={`${label} reps`}
          {...inputTheme} onFocus={onActivate}
          onChangeText={(t) => onChange({ reps: sanitizeInt(t, 3) })} />
        <TextInput
          style={[...cell, { width: RIR_W, flex: 0 }, row.warmup && { opacity: 0.35 }]} keyboardType="number-pad" value={row.rir} placeholder="–" maxLength={1}
          selectTextOnFocus maxFontSizeMultiplier={1.3} accessibilityLabel={`${label} reps in reserve`}
          accessibilityState={{ disabled: row.warmup }} accessibilityHint={row.warmup ? 'Not used for warm-ups' : undefined}
          {...inputTheme} editable={!row.warmup} onFocus={onActivate}
          onChangeText={(t) => onChange({ rir: sanitizeInt(t, 1) })} />
        <TouchableOpacity
          onPress={onToggle} accessibilityRole="checkbox" accessibilityState={{ checked: row.done }} accessibilityLabel={`${label} done`}
          style={{
            width: TARGET, height: TARGET, borderRadius: TARGET / 2, alignItems: 'center', justifyContent: 'center',
            borderWidth: 1, borderColor: row.done ? colors.accent : colors.border, backgroundColor: row.done ? colors.accent : 'transparent',
          }}>
          <Checkmark color={row.done ? colors.onAccent : colors.muted} />
        </TouchableOpacity>
      </View>

      {active && (
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {weighted && (
            <View style={{ flex: 2, flexDirection: 'row', gap: GAP }}>
              <StepButton label={`−${weightStep}`} hint={`Decrease weight by ${weightStep} ${unit}`} onPress={() => onChange({ weight: stepValue(row.weight, -weightStep) })} />
              <StepButton label={`+${weightStep}`} hint={`Increase weight by ${weightStep} ${unit}`} onPress={() => onChange({ weight: stepValue(row.weight, weightStep) })} />
            </View>
          )}
          <View style={{ flex: 2, flexDirection: 'row', gap: GAP }}>
            <StepButton label="−1 rep" hint="Decrease reps by 1" onPress={() => onChange({ reps: stepValue(row.reps, -1, 0, 0) })} />
            <StepButton label="+1 rep" hint="Increase reps by 1" onPress={() => onChange({ reps: stepValue(row.reps, 1, 0, 0) })} />
          </View>
        </View>
      )}
    </View>
  );
}
