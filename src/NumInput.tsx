import { useEffect, useState } from 'react';
import { TextInput } from 'react-native';
import { ui } from './theme';

/** Integer input that lets you clear the field while typing; only commits valid numbers. */
export function NumInput({ value, onChange, width = 48 }: { value: number; onChange: (n: number) => void; width?: number }) {
  const [text, setText] = useState(String(value));
  useEffect(() => { if (text !== '' && Number(text) !== value) setText(String(value)); }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <TextInput
      style={[ui.input, { width, minWidth: width, textAlign: 'center', paddingHorizontal: 4 }]}
      keyboardType="number-pad"
      value={text}
      onChangeText={(t) => {
        const clean = t.replace(/\D/g, '').slice(0, 3);
        setText(clean);
        if (clean !== '') onChange(Number(clean));
      }}
      onBlur={() => setText(String(value))}
    />
  );
}
