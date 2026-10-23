import { useCallback, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Link, Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  fullCatalog, getActiveProgramId, getProgram, nextDayPosition, programStats, type StoredProgram,
} from '../../../src/db';
import type { Exercise } from '../../../src/data/exercises';
import { compact } from '../../../src/lib/report';
import { fromKg, type Unit } from '../../../src/lib/units';
import { loadSettings } from '../../../src/settings';
import { Thumb } from '../../../src/Thumb';
import { startSession } from '../../../src/session';
import { TARGET, colors, type, ui } from '../../../src/theme';

export default function ProgramDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const programId = Number(id);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [program, setProgram] = useState<StoredProgram | null | undefined>(undefined);
  const [catalog, setCatalog] = useState<Map<string, Exercise>>(new Map());
  const [stats, setStats] = useState({ finished: 0, volume: 0 });
  const [unit, setUnit] = useState<Unit>('kg');
  const [dayIdx, setDayIdx] = useState(0);

  useFocusEffect(useCallback(() => {
    (async () => {
      const [p, cat, st, settings, activeId] = await Promise.all([
        getProgram(programId), fullCatalog(), programStats(programId), loadSettings(), getActiveProgramId(),
      ]);
      setProgram(p); setCatalog(new Map(cat.map((x) => [x.id, x]))); setStats(st); setUnit(settings.unit);
      // Open on the day that is up next when this is the active program.
      if (p) setDayIdx(activeId === p.id ? await nextDayPosition(p.id, p.days.length) : 0);
    })();
  }, [programId]));

  if (program === undefined) return <Stack.Screen options={{ headerShown: false }} />;
  if (program === null) {
    return (
      <View style={[ui.screen, { padding: 16, paddingTop: insets.top + 16 }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={ui.muted}>This program no longer exists.</Text>
      </View>
    );
  }

  const day = program.days[Math.min(dayIdx, program.days.length - 1)];
  const start = () => startSession(router, { mode: 'program', programId: program.id, day: Math.min(dayIdx, program.days.length - 1) });

  return (
    <View style={ui.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={{ paddingBottom: 168 }}>
        <View style={{ backgroundColor: colors.accent, paddingTop: insets.top + 4, paddingHorizontal: 16, paddingBottom: 22, gap: 12 }}>
          <TouchableOpacity
            onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back"
            style={{ width: TARGET, height: TARGET, marginLeft: -12, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="arrow-back" size={26} color={colors.onAccent} />
          </TouchableOpacity>
          <View style={{ gap: 4 }}>
            <Text style={[ui.h1, { color: colors.onAccent, fontSize: 30 }]}>{program.name}</Text>
            <Text style={[type.meta, { color: colors.onAccent, fontSize: 14 }]}>
              {stats.finished} time{stats.finished === 1 ? '' : 's'} finished | {compact(fromKg(stats.volume, unit))} {unit} lifted in total
            </Text>
          </View>
        </View>

        <View style={{ padding: 16, gap: 12 }}>
          {program.days.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }} accessibilityLabel="Training days">
              {program.days.map((d, i) => {
                const on = i === dayIdx;
                const thumbs = d.items.slice(0, 4).map((it) => catalog.get(it.exerciseId)).filter((x): x is Exercise => !!x);
                return (
                  <TouchableOpacity
                    key={i} onPress={() => setDayIdx(i)} accessibilityRole="button" accessibilityState={{ selected: on }}
                    accessibilityLabel={`${d.name}, ${d.items.length} exercise${d.items.length === 1 ? '' : 's'}`}
                    style={{ width: 132, gap: 8, padding: 10, borderRadius: 18, backgroundColor: colors.card, borderWidth: on ? 2 : 1, borderColor: on ? colors.highlight : colors.border }}>
                    <View style={{ gap: 2 }}>
                      <Text style={[type.action, { color: on ? colors.accentText : colors.text }]} numberOfLines={1}>{d.name}</Text>
                      <Text style={type.meta}>{d.items.length} exercise{d.items.length === 1 ? '' : 's'}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                      {thumbs.map((ex, k) => <Thumb key={k} exercise={ex} size={46} />)}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {day?.items.map((it, i) => {
            const ex = catalog.get(it.exerciseId);
            return (
              <Link key={i} href={{ pathname: '/exercise/[id]', params: { id: it.exerciseId } }} asChild>
                <TouchableOpacity
                  style={[ui.card, { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, minHeight: 84 }]}
                  accessibilityRole="button">
                  {ex ? <Thumb exercise={ex} size={64} /> : null}
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={ui.h2} numberOfLines={2}>{ex?.name ?? it.exerciseId}</Text>
                    <Text style={type.meta}>
                      {it.sets} set{it.sets === 1 ? '' : 's'} × {it.repMin}–{it.repMax} reps · RIR {it.rir}
                    </Text>
                  </View>
                </TouchableOpacity>
              </Link>
            );
          })}
          {day && day.items.length === 0 && <Text style={ui.muted}>This day has no exercises yet. Tap Edit to add some.</Text>}
        </View>
      </ScrollView>

      <View style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, gap: 8, paddingHorizontal: 16, paddingTop: 12,
        paddingBottom: insets.bottom + 12, backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.border,
      }}>
        <TouchableOpacity style={ui.button} onPress={start} accessibilityRole="button" accessibilityLabel={`Start ${day?.name ?? program.name}`}>
          <Text style={ui.buttonText}>Start {day?.name ?? ''}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[ui.ghost, { flexDirection: 'row', gap: 8 }]} accessibilityRole="button"
          onPress={() => router.push({ pathname: '/program/[id]', params: { id: String(program.id) } })}>
          <Ionicons name="create-outline" size={18} color={colors.text} />
          <Text style={ui.ghostText}>Edit program</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
