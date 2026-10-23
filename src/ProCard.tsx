import { useEffect, useState } from 'react';
import { Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { describeLicense, type LicenseCheck } from './lib/license';
import { activateLicense, loadLicense, removeLicense } from './pro';
import { PILL, TARGET, colors, inputTheme, type, ui } from './theme';

const SUPPORT_URL = 'github.com/sponsors/Jijots';

/** Spotty Pro: paste a license key from a supporter. Works offline; nothing is sent anywhere. */
export function ProCard() {
  const [license, setLicense] = useState<LicenseCheck | null>(null);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { loadLicense().then(setLicense).catch(() => setLicense(null)); }, []);
  const active = license?.ok === true ? license : null;

  const activate = async () => {
    setBusy(true);
    try {
      const r = await activateLicense(input);
      if (r.ok) { setLicense(r); setInput(''); setError(''); } else setError(r.message);
    } finally { setBusy(false); }
  };

  const remove = () =>
    Alert.alert('Remove your license key?', 'Pro features lock again on this phone. You can paste the key again later.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => { await removeLicense(); setLicense(await loadLicense()); } },
    ]);

  return (
    <View style={[ui.card, { gap: 10 }]}>
      <View style={[ui.row, { justifyContent: 'space-between' }]}>
        <Text style={ui.h2}>Spotty Pro</Text>
        {active && (
          <View style={[ui.row, { gap: 4 }]} accessible accessibilityLabel="Pro is active">
            <Ionicons name="checkmark-circle" size={20} color={colors.accentText} />
            <Text style={[type.action, { color: colors.accentText }]}>Active</Text>
          </View>
        )}
      </View>

      {active ? (
        <>
          <Text style={ui.text}>{describeLicense(active)}</Text>
          <Text style={type.meta}>Thank you for supporting Spotty. Pro unlocks AI-generated programs.</Text>
          <TouchableOpacity onPress={remove} accessibilityRole="button" style={{ minHeight: TARGET, justifyContent: 'center' }}>
            <Text style={[type.action, { color: colors.danger }]}>Remove license key</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={type.meta}>
            Spotty is free. Supporters get Pro, which unlocks AI-generated programs and the other extras on the roadmap. Support it at {SUPPORT_URL} or on Ko-fi, then paste the license key you receive.
          </Text>
          {license && !license.ok && license.reason === 'expired' && <Text style={{ color: colors.danger }}>{license.message}</Text>}
          <TextInput
            style={[ui.input, { minHeight: TARGET, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12 }]}
            value={input} onChangeText={(t) => { setInput(t); setError(''); }} placeholder="Paste license key" multiline
            autoCapitalize="none" autoCorrect={false} accessibilityLabel="License key" {...inputTheme}
          />
          {error ? <Text style={{ color: colors.danger }} accessibilityLiveRegion="polite">{error}</Text> : null}
          <TouchableOpacity
            onPress={activate} disabled={busy || !input.trim()} accessibilityRole="button" accessibilityState={{ disabled: busy || !input.trim() }}
            style={{ minHeight: 52, borderRadius: PILL, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', opacity: busy || !input.trim() ? 0.5 : 1 }}>
            <Text style={ui.buttonText}>{busy ? 'Checking…' : 'Activate Pro'}</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}
