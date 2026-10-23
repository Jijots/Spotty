import { ScrollView, Text } from 'react-native';
import { SettingsForm } from '../src/SettingsForm';
import { type, ui } from '../src/theme';
import { useContentStyle } from '../src/safe';

export default function Onboarding() {
  const content = useContentStyle({ paddingTop: 56 });
  return (
    <ScrollView style={ui.screen} contentContainerStyle={content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
      <Text style={ui.h1} accessibilityRole="header">Welcome to Spotty</Text>
      <Text style={ui.muted}>Pick your units and the equipment you have, so auto-built workouts fit your gym. Everything stays on this phone, and you can change it anytime in Settings.</Text>
      <SettingsForm submitLabel="Get started" />
      <Text style={[type.meta, { textAlign: 'center' }]}>Free forever. No account needed.</Text>
    </ScrollView>
  );
}
