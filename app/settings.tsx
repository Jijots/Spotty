import { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { Stack, useNavigation } from 'expo-router';
import { SettingsForm } from '../src/SettingsForm';
import { colors, type, ui } from '../src/theme';
import { useContentStyle } from '../src/safe';

export default function SettingsScreen() {
  const content = useContentStyle();
  const [saved, setSaved] = useState(false);
  const dirty = useRef(false);
  const navigation = useNavigation();

  // Leaving with edits that were not saved asks first, so a back swipe cannot lose them.
  useEffect(() => navigation.addListener('beforeRemove', (e) => {
    if (!dirty.current) return;
    e.preventDefault();
    Alert.alert('Discard changes?', 'You changed settings but did not save them.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => { dirty.current = false; navigation.dispatch(e.data.action); } },
    ]);
  }), [navigation]);

  return (
    <ScrollView style={ui.screen} contentContainerStyle={content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
      <Stack.Screen options={{ headerShown: true, title: 'Settings', headerStyle: { backgroundColor: colors.bg }, headerTintColor: colors.text }} />
      <SettingsForm
        submitLabel="Save"
        onDirty={(d) => { dirty.current = d; if (d) setSaved(false); }}
        onSaved={() => { setSaved(true); setTimeout(() => setSaved(false), 3000); }}
      />
      {saved && <Text style={{ color: colors.accentText, textAlign: 'center' }} accessibilityLiveRegion="polite">Saved</Text>}
      <View style={[ui.card, { gap: 6 }]}>
        <Text style={ui.h2}>About</Text>
        <Text style={type.meta}>
          Spotty is free and open source. No account, no subscription, no ads. Everything you log stays on this phone.
        </Text>
        <Text style={type.meta}>Exercise images come from the free-exercise-db project (public domain). Body maps use react-native-body-highlighter (MIT). Headings use the Manrope font (SIL Open Font License).</Text>
      </View>
    </ScrollView>
  );
}
