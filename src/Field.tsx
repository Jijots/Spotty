import { Text, TextInput, View, type KeyboardTypeOptions } from 'react-native';
import { TARGET, inputTheme, type, ui } from './theme';

/** A form field with a label that stays visible, a 48 dp input, and an optional unit and hint. */
export function Field({ label, value, onChange, placeholder, keyboardType = 'decimal-pad', suffix, hint, maxLength = 8, flex = 1 }: {
  label: string; value: string; onChange: (t: string) => void; placeholder?: string; keyboardType?: KeyboardTypeOptions;
  suffix?: string; hint?: string; maxLength?: number; flex?: number;
}) {
  return (
    <View style={{ flex, gap: 6 }}>
      <Text style={type.header}>{label}</Text>
      <View style={ui.row}>
        <TextInput
          style={[ui.input, { flex: 1, minHeight: TARGET }]} value={value} onChangeText={onChange} placeholder={placeholder}
          keyboardType={keyboardType} maxLength={maxLength} accessibilityLabel={suffix ? `${label} in ${suffix}` : label} {...inputTheme}
        />
        {suffix ? <Text style={ui.muted}>{suffix}</Text> : null}
      </View>
      {hint ? <Text style={type.meta}>{hint}</Text> : null}
    </View>
  );
}
