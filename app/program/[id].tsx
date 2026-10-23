import { useEffect, useState } from 'react';
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { fullCatalog, getProgram, saveProgram } from '../../src/db';
import type { Exercise } from '../../src/data/exercises';
import type { ProgramDraft } from '../../src/lib/programs';
import { ExercisePicker } from '../../src/ExercisePicker';
import { RestDialog } from '../../src/RestDialog';
import { formatRest } from '../../src/lib/rest';
import { DEFAULT_SETTINGS, loadSettings } from '../../src/settings';
import { NumInput } from '../../src/NumInput';
import { colors, ui } from '../../src/theme';
import { useContentStyle } from '../../src/safe';

const BLANK: ProgramDraft = { name: 'My program', goal: 'custom', days: [{ name: 'Day 1', items: [] }] };

export default function ProgramEditor() {
  const content = useContentStyle();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const programId = id === 'new' ? undefined : Number(id);
  const [draft, setDraft] = useState<ProgramDraft | null>(programId ? null : BLANK);
  const [catalog, setCatalog] = useState<Exercise[]>([]);
  const [pickDay, setPickDay] = useState<number | null>(null);
  const [restFor, setRestFor] = useState<{ di: number; ii: number } | null>(null);
  const [defaults, setDefaults] = useState(DEFAULT_SETTINGS.rest);

  useEffect(() => {
    fullCatalog().then(setCatalog);
    loadSettings().then((st) => setDefaults(st.rest));
    if (programId) getProgram(programId).then((p) => setDraft(p ?? BLANK));
  }, [programId]);

  if (!draft) return null;
  const nameOf = (exId: string) => catalog.find((x) => x.id === exId)?.name ?? exId;

  const edit = (fn: (d: ProgramDraft) => void) => {
    const next = structuredClone(draft);
    fn(next);
    setDraft(next);
  };

  const move = <T,>(arr: T[], i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  };

  const save = async () => {
    if (!draft.name.trim()) return Alert.alert('Name your program');
    if (!draft.days.some((d) => d.items.length)) return Alert.alert('Add at least one exercise');
    const clean: ProgramDraft = {
      ...draft,
      name: draft.name.trim(),
      days: draft.days.filter((d) => d.items.length).map((d) => ({
        ...d,
        items: d.items.map((it) => ({
          ...it,
          sets: Math.max(it.sets, 1),
          repMin: Math.max(Math.min(it.repMin, it.repMax), 1),
          repMax: Math.max(it.repMax, it.repMin, 1),
        })),
      })),
    };
    await saveProgram(clean, programId);
    router.back();
  };

  return (
    <ScrollView style={ui.screen} contentContainerStyle={content} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ headerShown: true, title: programId ? 'Edit program' : 'New program', headerStyle: { backgroundColor: colors.bg }, headerTintColor: colors.text }} />
      <TextInput style={[ui.input, { fontSize: 18 }]} value={draft.name} onChangeText={(t) => edit((d) => { d.name = t; })}
        placeholder="Program name" placeholderTextColor={colors.muted} />

      {draft.days.map((day, di) => (
        <View key={di} style={[ui.card, { gap: 10 }]}>
          <View style={ui.row}>
            <TextInput style={[ui.input, { flex: 1 }]} value={day.name} onChangeText={(t) => edit((d) => { d.days[di].name = t; })} />
            <TouchableOpacity onPress={() => edit((d) => move(d.days, di, -1))}><Text style={ui.h2}>↑</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => edit((d) => move(d.days, di, 1))}><Text style={ui.h2}>↓</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => edit((d) => { d.days.splice(di, 1); })}><Text style={{ color: colors.danger }}>Remove</Text></TouchableOpacity>
          </View>

          {day.items.map((it, ii) => (
            <View key={ii} style={{ gap: 6, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 }}>
              <View style={[ui.row, { justifyContent: 'space-between' }]}>
                <Text style={[ui.text, { flex: 1 }]}>{nameOf(it.exerciseId)}</Text>
                <TouchableOpacity onPress={() => edit((d) => move(d.days[di].items, ii, -1))}><Text style={ui.h2}>↑</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => edit((d) => move(d.days[di].items, ii, 1))}><Text style={ui.h2}>↓</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => edit((d) => { d.days[di].items.splice(ii, 1); })}><Text style={{ color: colors.danger }}>✕</Text></TouchableOpacity>
              </View>
              <View style={ui.row}>
                <NumInput value={it.sets} onChange={(n) => edit((d) => { d.days[di].items[ii].sets = n; })} />
                <Text style={ui.muted}>sets ×</Text>
                <NumInput value={it.repMin} onChange={(n) => edit((d) => { d.days[di].items[ii].repMin = n; })} />
                <Text style={ui.muted}>–</Text>
                <NumInput value={it.repMax} onChange={(n) => edit((d) => { d.days[di].items[ii].repMax = n; })} />
                <Text style={ui.muted}>reps · RIR</Text>
                <NumInput value={it.rir} width={40} onChange={(n) => edit((d) => { d.days[di].items[ii].rir = Math.min(n, 5); })} />
              </View>
              <TouchableOpacity
                onPress={() => setRestFor({ di, ii })} accessibilityRole="button"
                accessibilityLabel={`Rest timer for ${nameOf(it.exerciseId)}: ${it.rest != null ? formatRest(it.rest) : 'default'}. Tap to change.`}
                style={{ alignSelf: 'flex-start', minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: it.rest != null ? colors.accent : colors.border }}>
                <Ionicons name="timer-outline" size={16} color={colors.accentText} />
                <Text style={{ color: colors.accentText, fontWeight: '600' }}>{it.rest != null ? `Rest ${formatRest(it.rest)}` : 'Rest: default'}</Text>
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity onPress={() => setPickDay(di)}><Text style={{ color: colors.accentText, fontWeight: '600' }}>+ Add exercise</Text></TouchableOpacity>
        </View>
      ))}

      <TouchableOpacity style={ui.ghost} onPress={() => edit((d) => { d.days.push({ name: `Day ${d.days.length + 1}`, items: [] }); })}>
        <Text style={ui.ghostText}>+ Add day</Text>
      </TouchableOpacity>
      <TouchableOpacity style={ui.button} onPress={save}><Text style={ui.buttonText}>Save program</Text></TouchableOpacity>

      <RestDialog
        visible={restFor !== null}
        title={restFor ? nameOf(draft.days[restFor.di]?.items[restFor.ii]?.exerciseId ?? '') : ''}
        value={restFor ? draft.days[restFor.di]?.items[restFor.ii]?.rest ?? null : null}
        defaultSec={restFor && catalog.find((x) => x.id === draft.days[restFor.di]?.items[restFor.ii]?.exerciseId)?.compound ? defaults.compound : defaults.isolation}
        onClose={() => setRestFor(null)}
        onSave={(v) => {
          const r = restFor;
          setRestFor(null);
          if (r) edit((d) => { d.days[r.di].items[r.ii].rest = v; });
        }}
      />

      <ExercisePicker
        visible={pickDay !== null}
        catalog={catalog}
        onClose={() => setPickDay(null)}
        onPick={(ex) => {
          const day = pickDay;
          setPickDay(null);
          if (day === null) return;
          edit((d) => {
            d.days[day].items.push(ex.compound
              ? { exerciseId: ex.id, sets: 3, repMin: 5, repMax: 8, rir: 2 }
              : { exerciseId: ex.id, sets: 3, repMin: 10, repMax: 15, rir: 1 });
          });
        }}
      />
    </ScrollView>
  );
}
