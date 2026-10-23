import { ScrollView, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, type, ui } from '../../src/theme';

const SOURCES = ['MacroFactor', 'Lose It!', 'MyFitnessPal'];

export default function NutritionScreen() {
  return (
    <ScrollView style={ui.screen} contentContainerStyle={ui.content}>
      <View style={[ui.card, { gap: 12, alignItems: 'flex-start' }]}>
        <View style={{ backgroundColor: colors.highlight, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 }}>
          <Text style={[type.action, { color: colors.onAccent }]}>Coming soon</Text>
        </View>
        <Text style={ui.h1} accessibilityRole="header">Nutrition</Text>
        <Text style={ui.text}>
          Food tracking is not in the app yet. Apps like MacroFactor, Lose It! and MyFitnessPal already do it well, so this app focuses on training first.
        </Text>
      </View>

      <View style={[ui.card, { gap: 10 }]}>
        <Text style={ui.h2}>Planned: bring your data over</Text>
        <Text style={type.meta}>Import your food log and weigh-ins from a file you export, so you can keep your history.</Text>
        {SOURCES.map((name) => (
          <View key={name} style={[ui.row, { minHeight: 40 }]}>
            <Ionicons name="download-outline" size={20} color={colors.accentText} />
            <Text style={ui.text}>{name}</Text>
          </View>
        ))}
        <Text style={type.meta}>Your body weight logging still works under Progress.</Text>
      </View>
    </ScrollView>
  );
}
