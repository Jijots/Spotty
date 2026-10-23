import { useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { addCustomExercise } from '../../src/db';
import { EQUIPMENT, MUSCLES, type Equipment, type Muscle } from '../../src/data/exercises';
import { Chip } from '../../src/Chip';
import { colors, ui } from '../../src/theme';
import { useContentStyle } from '../../src/safe';

export default function NewExercise() {
  const content = useContentStyle();
  const router = useRouter();
  const [name, setName] = useState('');
  const [muscle, setMuscle] = useState<Muscle>('chest');
  const [equipment, setEquipment] = useState<Equipment>('dumbbell');
  const [compound, setCompound] = useState(false);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const save = async () => {
    if (!name.trim()) return setError('Give it a name.');
    await addCustomExercise({ name: name.trim(), muscle, equipment, compound, notes: notes.trim() });
    router.back();
  };

  return (
    <ScrollView style={ui.screen} contentContainerStyle={content} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ headerShown: true, title: 'New exercise', headerStyle: { backgroundColor: colors.bg }, headerTintColor: colors.text }} />
      <TextInput style={ui.input} placeholder="Name" placeholderTextColor={colors.muted} value={name} onChangeText={setName} />
      <Text style={ui.muted}>Main muscle</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {MUSCLES.map((m) => <Chip key={m} label={m} active={muscle === m} onPress={() => setMuscle(m)} />)}
      </View>
      <Text style={ui.muted}>Equipment</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {EQUIPMENT.map((e) => <Chip key={e} label={e} active={equipment === e} onPress={() => setEquipment(e)} />)}
      </View>
      <View style={ui.row}>
        <Chip label="Compound" active={compound} onPress={() => setCompound(true)} />
        <Chip label="Isolation" active={!compound} onPress={() => setCompound(false)} />
      </View>
      <TextInput style={[ui.input, { minHeight: 80, textAlignVertical: 'top' }]} multiline placeholder="Notes / cues (optional)"
        placeholderTextColor={colors.muted} value={notes} onChangeText={setNotes} />
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      <TouchableOpacity style={ui.button} onPress={save}><Text style={ui.buttonText}>Save exercise</Text></TouchableOpacity>
    </ScrollView>
  );
}
