import { useCallback, useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Link, Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { deleteWorkout, fullCatalog, workoutDetail, type WorkoutDetail } from '../../src/db';
import type { Exercise } from '../../src/data/exercises';
import { compact, duration, shortDate } from '../../src/lib/report';
import { fromKg, type Unit } from '../../src/lib/units';
import { loadSettings } from '../../src/settings';
import { Thumb } from '../../src/Thumb';
import { colors, type, ui } from '../../src/theme';
import { useContentStyle } from '../../src/safe';

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <Text style={type.meta}>{label}</Text>
      <Text style={[type.data, { fontSize: 24, color: colors.accentText }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
    </View>
  );
}

export default function WorkoutDetailScreen() {
  const content = useContentStyle();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [workout, setWorkout] = useState<WorkoutDetail | null | undefined>(undefined);
  const [catalog, setCatalog] = useState<Map<string, Exercise>>(new Map());
  const [unit, setUnit] = useState<Unit>('kg');

  useFocusEffect(useCallback(() => {
    (async () => {
      const [w, cat, settings] = await Promise.all([workoutDetail(Number(id)), fullCatalog(), loadSettings()]);
      setWorkout(w); setCatalog(new Map(cat.map((x) => [x.id, x]))); setUnit(settings.unit);
    })();
  }, [id]));

  const header = (title: string) => (
    <Stack.Screen options={{ headerShown: true, title, headerStyle: { backgroundColor: colors.bg }, headerTintColor: colors.text }} />
  );

  if (workout === undefined) return header('Workout');
  if (workout === null) {
    return (
      <View style={ui.screen}>
        {header('Workout')}
        <Text style={[ui.muted, { padding: 16 }]}>This workout is no longer in your history.</Text>
      </View>
    );
  }

  const working = workout.sets.filter((s) => !s.warmup);
  const volumeKg = working.reduce((sum, s) => sum + s.weight * s.reps, 0);
  const minutes = Math.min(Math.max((workout.finished_at - workout.started_at) / 60000, 0), 300);

  // Keep the order the exercises were done in.
  const groups: { id: string; sets: WorkoutDetail['sets'] }[] = [];
  for (const s of workout.sets) {
    const g = groups.find((x) => x.id === s.exercise_id);
    if (g) g.sets.push(s); else groups.push({ id: s.exercise_id, sets: [s] });
  }

  const confirmDelete = () =>
    Alert.alert('Delete this workout?', 'It leaves your history, totals and records. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete workout', style: 'destructive', onPress: async () => { await deleteWorkout(workout.id); router.back(); } },
    ]);

  const title = workout.day_name ?? 'Workout';
  return (
    <ScrollView style={ui.screen} contentContainerStyle={content}>
      {header(shortDate(workout.started_at))}
      <View style={{ gap: 2 }}>
        <Text style={ui.h1}>{title}</Text>
        <Text style={ui.muted}>{shortDate(workout.started_at)}</Text>
      </View>

      <View style={[ui.card, ui.row, { alignItems: 'flex-start' }]}>
        <Stat label="Sets" value={String(working.length)} />
        <Stat label={`Volume (${unit})`} value={compact(fromKg(volumeKg, unit))} />
        <Stat label="Time" value={duration(minutes)} />
      </View>

      {groups.map((g) => {
        const ex = catalog.get(g.id);
        let n = 0;
        return (
          <View key={g.id} style={[ui.card, { gap: 10 }]}>
            <Link href={{ pathname: '/exercise/[id]', params: { id: g.id } }} asChild>
              <TouchableOpacity style={[ui.row, { gap: 12 }]} accessibilityRole="button">
                {ex ? <Thumb exercise={ex} size={48} /> : null}
                <Text style={[ui.h2, { flex: 1 }]} numberOfLines={2}>{ex?.name ?? g.id}</Text>
              </TouchableOpacity>
            </Link>
            {g.sets.map((s) => {
              const label = s.warmup ? 'W' : String(++n);
              return (
                <View key={s.id} style={[ui.row, { justifyContent: 'space-between' }]}
                  accessible accessibilityLabel={`${s.warmup ? 'Warm-up' : `Set ${n}`}: ${s.weight > 0 ? `${fromKg(s.weight, unit)} ${unit}, ` : ''}${s.reps} reps${s.rir != null ? `, ${s.rir} in reserve` : ''}`}>
                  <Text style={[type.header, { width: 24, fontSize: 13 }, s.warmup === 1 && { color: colors.accentText }]}>{label}</Text>
                  <Text style={[type.data, { flex: 1 }]}>
                    {s.weight > 0 ? `${fromKg(s.weight, unit)} ${unit} × ${s.reps}` : `${s.reps} reps`}
                  </Text>
                  {s.rir != null && <Text style={type.meta}>RIR {s.rir}</Text>}
                </View>
              );
            })}
          </View>
        );
      })}

      <TouchableOpacity style={[ui.ghost, { marginTop: 8 }]} onPress={confirmDelete} accessibilityRole="button">
        <Text style={{ color: colors.danger, fontWeight: '600' }}>Delete workout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
