import { useEffect, useState } from 'react';
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { deleteCustomExercise, fullCatalog, getSetting, pastSets, setSetting } from '../../src/db';
import type { Exercise, Muscle } from '../../src/data/exercises';
import { e1rm, type PastSet } from '../../src/lib/generator';
import { shortDate } from '../../src/lib/report';
import { fmt, type Unit } from '../../src/lib/units';
import { loadSettings } from '../../src/settings';
import { BodyMap } from '../../src/BodyMap';
import { ExerciseMotion } from '../../src/ExerciseMotion';
import { TARGET, colors, inputTheme, type, ui } from '../../src/theme';
import { cap } from '../../src/lib/text';


function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'baseline' }}>
      <Text style={[type.header, { width: 96 }]}>{label.toUpperCase()}</Text>
      <Text style={[ui.text, { flex: 1 }]}>{value}</Text>
    </View>
  );
}

export default function ExerciseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [ex, setEx] = useState<Exercise | null | undefined>(undefined);
  const [sets, setSets] = useState<PastSet[]>([]);
  const [unit, setUnit] = useState<Unit>('kg');
  const [tab, setTab] = useState<'how' | 'records'>('how');
  const [note, setNote] = useState('');

  useEffect(() => {
    (async () => {
      setEx((await fullCatalog()).find((x) => x.id === id) ?? null);
      setSets((await pastSets()).filter((s) => s.exerciseId === id));
      setUnit((await loadSettings()).unit);
      setNote(await getSetting<string>(`note:${id}`, ''));
    })();
  }, [id]);

  const header = <Stack.Screen options={{ headerShown: false }} />;

  if (ex === undefined) return header;
  if (ex === null) {
    return <View style={[ui.screen, { padding: 16, paddingTop: insets.top + 16 }]}>{header}<Text style={ui.muted}>Exercise not found.</Text></View>;
  }

  const best = sets.reduce<PastSet | null>((b, s) => (!b || e1rm(s.weight, s.reps) > e1rm(b.weight, b.reps) ? s : b), null);
  const sessions = [...new Set(sets.map((s) => s.at))].sort((a, b) => b - a);
  const levels: Partial<Record<Muscle, number>> = {};
  for (const m of ex.secondary) levels[m] = 0.5;
  levels[ex.muscle] = 1;

  const [prep, ...steps] = ex.instructions;

  const remove = () =>
    Alert.alert('Delete exercise?', 'Past workouts that used it keep their sets.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteCustomExercise(ex.id); router.back(); } },
    ]);

  return (
    <View style={ui.screen}>
      {header}
      <View style={{ backgroundColor: colors.accent, paddingTop: insets.top + 4, paddingHorizontal: 16, paddingBottom: 28 }}>
        <TouchableOpacity
          onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back"
          style={{ width: TARGET, height: TARGET, marginLeft: -12, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="arrow-back" size={26} color={colors.onAccent} />
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1, backgroundColor: colors.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -20, overflow: 'hidden' }}>
        <View style={[ui.row, { borderBottomWidth: 1, borderBottomColor: colors.border }]} accessibilityRole="tablist">
          {([['how', 'Instructions'], ['records', 'Records']] as const).map(([key, label]) => (
            <TouchableOpacity
              key={key} onPress={() => setTab(key)} accessibilityRole="tab" accessibilityState={{ selected: tab === key }}
              style={{ flex: 1, minHeight: TARGET + 8, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 3, borderBottomColor: tab === key ? colors.highlight : 'transparent', marginBottom: -1 }}>
              <Text style={[type.action, { fontSize: 15, letterSpacing: 0.6, color: tab === key ? colors.text : colors.muted }]}>{label.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView contentContainerStyle={[ui.content, { paddingBottom: insets.bottom + 104 }]} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          {tab === 'how' ? (
            <>
              <View style={[ui.card, { alignItems: 'center', gap: 12 }]}>
                <BodyMap levels={levels} scale={0.62} />
                <ExerciseMotion images={ex.images} name={ex.name} />
              </View>

              <Text style={ui.h1} accessibilityRole="header">{ex.name}</Text>

              <View style={[ui.row, { backgroundColor: colors.card, borderRadius: 16, paddingRight: 8 }]}>
                <TextInput
                  style={[ui.input, { flex: 1, backgroundColor: 'transparent', borderWidth: 0, minHeight: TARGET }]}
                  value={note} onChangeText={setNote} onEndEditing={() => setSetting(`note:${id}`, note.trim())}
                  placeholder="Add note" multiline accessibilityLabel={`Your note for ${ex.name}`} {...inputTheme}
                />
                <Ionicons name="create-outline" size={20} color={colors.muted} />
              </View>

              <View style={{ gap: 8 }}>
                <Row label="Focus area" value={`${cap(ex.muscle)}${ex.secondary.length ? ` (also ${ex.secondary.map(cap).join(', ')})` : ''}`} />
                <Row label="Equipment" value={cap(ex.equipment)} />
                <Row label="Type" value={`${ex.compound ? 'Compound' : 'Isolation'} · ${cap(ex.level)}`} />
              </View>

              {prep && (
                <View style={{ gap: 8 }}>
                  <Text style={ui.h2}>{ex.custom ? 'NOTES' : 'PREPARATION'}</Text>
                  <Text style={ui.text}>{prep}</Text>
                </View>
              )}
              {steps.length > 0 && (
                <View style={{ gap: 8 }}>
                  <Text style={ui.h2}>EXECUTION</Text>
                  {steps.map((t, i) => <Text key={i} style={ui.text}>{i + 1}. {t}</Text>)}
                </View>
              )}

              {ex.custom && (
                <TouchableOpacity style={ui.ghost} onPress={remove} accessibilityRole="button">
                  <Text style={{ color: colors.danger, fontWeight: '600' }}>Delete exercise</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <>
              <Text style={ui.h1} accessibilityRole="header">{ex.name}</Text>
              {best ? (
                <View style={[ui.card, { gap: 4 }]}>
                  <Text style={type.header}>BEST SET</Text>
                  <Text style={[type.data, { fontSize: 26, color: colors.accentText }]}>{fmt(best.weight, unit)} × {best.reps}</Text>
                  <Text style={type.meta}>Estimated one-rep max {fmt(e1rm(best.weight, best.reps), unit)}</Text>
                </View>
              ) : (
                <View style={[ui.card, { gap: 6 }]}>
                  <Text style={ui.h2}>No records yet</Text>
                  <Text style={ui.muted}>Log this exercise in a workout and your best sets show up here.</Text>
                </View>
              )}
              {sessions.slice(0, 20).map((at) => (
                <View key={at} style={[ui.card, { gap: 4 }]}>
                  <Text style={type.header}>{shortDate(at).toUpperCase()}</Text>
                  <Text style={ui.text}>{sets.filter((s) => s.at === at).map((s) => `${fmt(s.weight, unit)} × ${s.reps}`).join('   ')}</Text>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      </View>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 12, backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.border }}>
        <TouchableOpacity style={ui.button} onPress={() => router.back()} accessibilityRole="button"><Text style={ui.buttonText}>Done</Text></TouchableOpacity>
      </View>
    </View>
  );
}
