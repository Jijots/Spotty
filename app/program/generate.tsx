import { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { fullCatalog, saveProgram, setActiveProgramId } from '../../src/db';
import { LIBRARY, MUSCLES, type Equipment, type Exercise, type Muscle } from '../../src/data/exercises';
import { generateProgram, weeklyVolume, type Experience, type Goal, type RepScheme } from '../../src/lib/programs';
import { loadSettings } from '../../src/settings';
import { Chip } from '../../src/Chip';
import { cap } from '../../src/lib/text';
import { colors, type, ui } from '../../src/theme';
import { useContentStyle } from '../../src/safe';

const GOALS: [Goal, string][] = [['strength', 'Strength'], ['hypertrophy', 'Muscle size'], ['both', 'Both']];
const LEVELS: Experience[] = ['beginner', 'intermediate', 'advanced'];
const DAYS = [2, 3, 4, 5, 6] as const;
const MINUTES = [30, 45, 60, 75, 90];

export default function GenerateProgram() {
  const content = useContentStyle();
  const router = useRouter();
  const [catalog, setCatalog] = useState<Exercise[]>(LIBRARY);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [goal, setGoal] = useState<Goal>('both');
  const [days, setDays] = useState<(typeof DAYS)[number]>(4);
  const [experience, setExperience] = useState<Experience>('intermediate');
  const [minutes, setMinutes] = useState(60);
  const [priority, setPriority] = useState<Muscle[]>([]);
  const [repScheme, setRepScheme] = useState<RepScheme>('standard');
  const [seed, setSeed] = useState(0);
  const [mode, setMode] = useState<'rules' | 'ai'>('rules');

  useEffect(() => {
    fullCatalog().then(setCatalog);
    loadSettings().then((s) => setEquipment(s.equipment));
  }, []);

  const draft = useMemo(
    () => generateProgram({ goal, daysPerWeek: days, experience, minutesPerSession: minutes, equipment, priority, catalog, seed, repScheme }),
    [goal, days, experience, minutes, equipment, priority, catalog, seed, repScheme],
  );
  const volume = useMemo(() => weeklyVolume(draft, catalog), [draft, catalog]);
  const nameOf = (id: string) => catalog.find((x) => x.id === id)?.name ?? id;

  const togglePriority = (m: Muscle) =>
    setPriority((cur) => (cur.includes(m) ? cur.filter((x) => x !== m) : cur.length >= 3 ? cur : [...cur, m]));

  const save = async (edit: boolean) => {
    const id = await saveProgram(draft);
    await setActiveProgramId(id);
    if (edit) router.replace({ pathname: '/program/[id]', params: { id: String(id) } });
    else router.back();
  };

  return (
    <ScrollView style={ui.screen} contentContainerStyle={content}>
      <Stack.Screen options={{ headerShown: true, title: 'Generate program', headerStyle: { backgroundColor: colors.bg }, headerTintColor: colors.text }} />

      <View style={ui.row} accessibilityRole="tablist">
        <Chip label="Rule-based" active={mode === 'rules'} onPress={() => setMode('rules')} />
        <Chip label="AI generated · Pro" active={mode === 'ai'} onPress={() => setMode('ai')} />
      </View>

      {mode === 'ai' && (
        <View style={[ui.card, { gap: 10 }]}>
          <View style={{ alignSelf: 'flex-start', backgroundColor: colors.highlight, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 }}>
            <Text style={[type.action, { color: colors.onAccent }]}>Pro · Coming soon</Text>
          </View>
          <Text style={ui.h2}>AI generated programs</Text>
          <Text style={ui.text}>Describe your goal, schedule, injuries and equipment in your own words and get a program built around you, then keep adjusting it by chatting.</Text>
          <Text style={type.meta}>Rule-based programs stay free forever, work offline and need no account.</Text>
          <TouchableOpacity style={[ui.button, { opacity: 0.5 }]} disabled accessibilityRole="button" accessibilityState={{ disabled: true }}>
            <Text style={ui.buttonText}>Coming soon</Text>
          </TouchableOpacity>
          <TouchableOpacity style={ui.ghost} onPress={() => setMode('rules')} accessibilityRole="button"><Text style={ui.ghostText}>Use rule-based instead</Text></TouchableOpacity>
        </View>
      )}

      {mode === 'rules' && (
        <>
      <View style={[ui.card, { gap: 10 }]}>
        <Text style={ui.h2}>Goal</Text>
        <View style={ui.row}>{GOALS.map(([g, label]) => <Chip key={g} label={label} active={goal === g} onPress={() => setGoal(g)} />)}</View>
        <Text style={ui.h2}>Rep range</Text>
        <View style={ui.row}>
          <Chip label="Standard" active={repScheme === 'standard'} onPress={() => setRepScheme('standard')} />
          <Chip label="5–9 reps" active={repScheme === '5-9'} onPress={() => setRepScheme('5-9')} />
          <Chip label="2 hard sets" active={repScheme === 'hard-2'} onPress={() => setRepScheme('hard-2')} />
        </View>
        {repScheme === '5-9' && (
          <Text style={type.meta}>Every exercise gets 2 hard sets of 5–9 reps, taken to failure. Once all sets reach 9, the weight goes up.</Text>
        )}
        {repScheme === 'hard-2' && (
          <Text style={type.meta}>An upper and lower split, so each muscle trains twice a week or more. Two hard sets per exercise: 6–10 reps on compounds, 10–15 on isolation work, close to or at failure.</Text>
        )}
        <Text style={ui.h2}>Days per week</Text>
        <View style={ui.row}>{DAYS.map((d) => <Chip key={d} label={String(d)} active={days === d} onPress={() => setDays(d)} />)}</View>
        <Text style={ui.h2}>Experience</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {LEVELS.map((l) => <Chip key={l} label={l} active={experience === l} onPress={() => setExperience(l)} />)}
        </View>
        <Text style={ui.h2}>Time per session</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {MINUTES.map((m) => <Chip key={m} label={`${m} min`} active={minutes === m} onPress={() => setMinutes(m)} />)}
        </View>
        <Text style={ui.h2}>Bring up (pick up to 3)</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {MUSCLES.filter((m) => m !== 'forearms').map((m) => <Chip key={m} label={m} active={priority.includes(m)} onPress={() => togglePriority(m)} />)}
        </View>
        <Text style={ui.muted}>Uses the equipment from Settings. Rules-based and fully offline.</Text>
      </View>

      <Text style={ui.h1}>{draft.name}</Text>
      <Text style={ui.muted}>
        Weekly sets: {MUSCLES.filter((m) => volume[m]).map((m) => `${cap(m)} ${volume[m]}`).join(' · ')}
      </Text>

      {draft.days.map((day, i) => (
        <View key={i} style={[ui.card, { gap: 4 }]}>
          <Text style={ui.h2}>{day.name} <Text style={ui.muted}>· {day.items.reduce((s, it) => s + it.sets, 0)} sets</Text></Text>
          {day.items.map((it, j) => (
            <Text key={j} style={ui.text}>
              {it.sets}×{it.repMin}–{it.repMax} <Text style={ui.muted}>RIR {it.rir}</Text>  {nameOf(it.exerciseId)}
            </Text>
          ))}
        </View>
      ))}

      {draft.days.every((d) => !d.items.length) && (
        <Text style={{ color: colors.danger }}>No exercises match your equipment. Enable more equipment in Settings.</Text>
      )}

      <TouchableOpacity style={ui.button} onPress={() => save(false)}><Text style={ui.buttonText}>Use this program</Text></TouchableOpacity>
      <TouchableOpacity style={ui.ghost} onPress={() => save(true)}><Text style={ui.ghostText}>Save and tweak it</Text></TouchableOpacity>
      <TouchableOpacity style={ui.ghost} onPress={() => setSeed(seed + 1)}><Text style={ui.ghostText}>Shuffle exercises</Text></TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}
