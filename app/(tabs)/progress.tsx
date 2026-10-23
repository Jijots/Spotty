import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, type ViewStyle } from 'react-native';
import { Link, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { deleteWeighIn, fullCatalog, isoDate, logWeight, pastSets, recentDays, recentWeighIns, workoutHistory } from '../../src/db';
import type { Exercise } from '../../src/data/exercises';
import { sanitizeDecimal } from '../../src/lib/draft';
import { trendWeights, type DayData } from '../../src/lib/nutrition';
import {
  axisLabel, compact, duration, personalBests, shortDate, startOfWeek, totals, weekStrip, weeklyCounts, type PersonalBest,
} from '../../src/lib/report';
import { fromKg, toKg, type Unit } from '../../src/lib/units';
import { loadSettings } from '../../src/settings';
import { TARGET, colors, inputTheme, type, ui } from '../../src/theme';
import { Thumb } from '../../src/Thumb';
import { BodyMap, LevelLegend } from '../../src/BodyMap';
import { volumeLevels, weeklyMuscleSets } from '../../src/lib/body';
import { TrendBars, WeekBars, WeekStrip } from '../../src/charts';

type WorkoutRow = Awaited<ReturnType<typeof workoutHistory>>[number];
type WeighIn = Awaited<ReturnType<typeof recentWeighIns>>[number];

const RECORDS_SHOWN = 5;
const HISTORY_SHOWN = 20;

/** "2026-10-21" -> "OCT 21", without Date parsing quirks. */
const isoLabel = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  const l = axisLabel(new Date(y, m - 1, d).getTime());
  return `${l.month} ${l.day}`;
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <Text style={type.meta}>{label}</Text>
      <Text style={[type.data, { fontSize: 26, color: colors.accentText }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
    </View>
  );
}

export default function ProgressScreen() {
  const row = StyleSheet.flatten<ViewStyle>([ui.card, { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, minHeight: 64 }]);

  const [workouts, setWorkouts] = useState<WorkoutRow[]>([]);
  const [bests, setBests] = useState<PersonalBest[]>([]);
  const [muscleSets, setMuscleSets] = useState<ReturnType<typeof weeklyMuscleSets>>({});
  const [catalog, setCatalog] = useState<Map<string, Exercise>>(new Map());
  const [days, setDays] = useState<DayData[]>([]);
  const [weighIns, setWeighIns] = useState<WeighIn[]>([]);
  const [unit, setUnit] = useState<Unit>('kg');
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    const [ws, sets, d, wi, settings, cat] = await Promise.all([
      workoutHistory(1000), pastSets(), recentDays(42), recentWeighIns(5), loadSettings(), fullCatalog(),
    ]);
    const currentTime = Date.now();
    setWorkouts(ws); setBests(personalBests(sets)); setMuscleSets(weeklyMuscleSets(sets, startOfWeek(currentTime).getTime(), cat)); setDays(d); setWeighIns(wi); setUnit(settings.unit);
    setNow(currentTime);
    setCatalog(new Map(cat.map((x) => [x.id, x]))); setLoaded(true);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const all = totals(workouts);
  const bins = weeklyCounts(workouts, 8);
  const strip = weekStrip(workouts);
  const thisWeek = totals(workouts.filter((w) => w.started_at >= startOfWeek(now).getTime()));

  const muscleList = Object.entries(muscleSets).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0)).map(([m, n]) => [m, Math.round((n ?? 0) * 10) / 10] as const);

  const trend = trendWeights(days);
  const firstIdx = trend.findIndex((t) => t != null);
  const trendValues = trend.filter((t): t is number => t != null).map((kg) => fromKg(kg, unit));
  const latestTrend = trendValues[trendValues.length - 1];

  const saveWeight = async () => {
    const v = Number(input);
    const kg = toKg(v, unit);
    if (!(kg >= 30 && kg <= 300)) {
      setNotice('');
      setError(`Enter a weight between ${fromKg(30, unit)} and ${fromKg(300, unit)} ${unit}.`);
      return;
    }
    setError('');
    await logWeight(isoDate(), kg);
    setInput('');
    setNotice(`Logged ${v} ${unit} for today.`);
    load();
  };

  const confirmDeleteWeighIn = (w: WeighIn) =>
    Alert.alert('Delete this weigh-in?', `${isoLabel(w.date)}: ${fromKg(w.kg, unit)} ${unit}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteWeighIn(w.date); load(); } },
    ]);

  return (
    <ScrollView style={ui.screen} contentContainerStyle={ui.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
      {loaded && workouts.length === 0 && (
        <View style={[ui.card, { gap: 8 }]}>
          <Text style={ui.h2}>No workouts yet</Text>
          <Text style={ui.muted}>Finish a workout and your totals, weekly chart and personal records show up here.</Text>
          <Link href="/" asChild>
            <TouchableOpacity style={ui.button}><Text style={ui.buttonText}>Go to Today</Text></TouchableOpacity>
          </Link>
        </View>
      )}

      {workouts.length > 0 && (
        <>
          <View style={[ui.card, { gap: 16 }]}>
            <View style={[ui.row, { alignItems: 'flex-start' }]}>
              <Stat label="Workouts" value={String(all.workouts)} />
              <Stat label="Time" value={duration(all.minutes)} />
              <Stat label={`Volume (${unit})`} value={compact(fromKg(all.volumeKg, unit))} />
            </View>
            <Text style={ui.h2}>Workouts per week</Text>
            <WeekBars bins={bins} />
          </View>

          <View style={[ui.card, { gap: 14 }]}>
            <Text style={ui.h2}>This week</Text>
            <WeekStrip days={strip} />
            <View style={[ui.row, { alignItems: 'flex-start' }]}>
              <Stat label="Workouts" value={String(thisWeek.workouts)} />
              <Stat label="Time" value={thisWeek.minutes > 0 ? duration(thisWeek.minutes) : '0 min'} />
            </View>
          </View>

          <View style={[ui.card, { gap: 12 }]}>
            <Text style={ui.h2}>Muscles this week</Text>
            {muscleList.length > 0 ? (
              <>
                <View style={{ alignItems: 'center' }}><BodyMap levels={volumeLevels(muscleSets)} /></View>
                <LevelLegend high="High" low="Low" />
                <Text style={type.meta}>Darker means more sets. Secondary muscles count half.</Text>
                <Text style={type.meta}>{muscleList.map(([m, n]) => `${m[0].toUpperCase()}${m.slice(1)} ${n}`).join(' · ')}</Text>
              </>
            ) : (
              <Text style={ui.muted}>Nothing trained this week yet. Finish a workout and the muscles you hit light up here.</Text>
            )}
          </View>

          {bests.length > 0 && (
            <View style={{ gap: 8 }}>
              <Text style={[ui.h2, { marginTop: 4 }]}>Personal records</Text>
              {bests.slice(0, RECORDS_SHOWN).map((b) => {
                const ex = catalog.get(b.exerciseId);
                return (
                  <Link key={b.exerciseId} href={{ pathname: '/exercise/[id]', params: { id: b.exerciseId } }} asChild>
                    <TouchableOpacity style={row} accessibilityRole="button">
                      {ex ? <Thumb exercise={ex} size={44} /> : null}
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={ui.h2} numberOfLines={1}>{ex?.name ?? b.exerciseId}</Text>
                        <Text style={type.meta} numberOfLines={1}>
                          {b.weight > 0 ? `est. one-rep max ${fromKg(b.e1rm, unit)} ${unit} · ` : ''}{shortDate(b.at)}
                        </Text>
                      </View>
                      <View style={{ backgroundColor: colors.record, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
                        <Text style={[type.action, { color: colors.onRecord }]}>
                          {b.weight > 0 ? `${fromKg(b.weight, unit)} × ${b.reps}` : `${b.reps} reps`}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </Link>
                );
              })}
            </View>
          )}
        </>
      )}

      <View style={[ui.card, { gap: 12 }]}>
        <View style={[ui.row, { justifyContent: 'space-between', alignItems: 'flex-end' }]}>
          <Text style={ui.h2}>Body weight</Text>
          {latestTrend != null && (
            <Text style={[type.data, { color: colors.accentText }]}>
              {latestTrend.toFixed(1)} {unit} <Text style={type.meta}>trend</Text>
            </Text>
          )}
        </View>

        {trendValues.length >= 2 ? (
          <TrendBars
            values={trendValues} unit={unit}
            startLabel={days[firstIdx] ? isoLabel(days[firstIdx].date) : ''} endLabel="Today"
          />
        ) : (
          <Text style={ui.muted}>Log your weight on a few different days to see the trend. Your calorie target uses it too.</Text>
        )}

        <View style={{ gap: 6 }}>
          <Text style={type.header}>Today’s weight ({unit})</Text>
          <View style={ui.row}>
            <TextInput
              style={[ui.input, { flex: 1, minHeight: TARGET }]} keyboardType="decimal-pad" value={input} maxLength={7}
              onChangeText={(t) => { setInput(sanitizeDecimal(t)); setError(''); }} placeholder={`e.g. ${fromKg(80, unit)}`}
              accessibilityLabel={`Today's weight in ${unit}`} {...inputTheme}
            />
            <TouchableOpacity style={[ui.button, { paddingHorizontal: 28 }]} onPress={saveWeight} accessibilityRole="button">
              <Text style={ui.buttonText}>Log</Text>
            </TouchableOpacity>
          </View>
          {error ? <Text style={{ color: colors.danger }} accessibilityLiveRegion="polite">{error}</Text> : null}
          {notice ? <Text style={{ color: colors.accentText }} accessibilityLiveRegion="polite">{notice}</Text> : null}
        </View>

        {weighIns.length > 0 && (
          <View>
            {weighIns.map((w) => (
              <View key={w.date} style={[ui.row, { justifyContent: 'space-between', minHeight: TARGET }]}>
                <Text style={ui.text}>{isoLabel(w.date)}</Text>
                <View style={ui.row}>
                  <Text style={type.action}>{fromKg(w.kg, unit)} {unit}</Text>
                  <TouchableOpacity
                    onPress={() => confirmDeleteWeighIn(w)} accessibilityRole="button" accessibilityLabel={`Delete weigh-in from ${isoLabel(w.date)}`}
                    style={{ width: TARGET, height: TARGET, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="trash-outline" size={20} color={colors.muted} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {workouts.length > 0 && (
        <View style={{ gap: 8 }}>
          <Text style={[ui.h2, { marginTop: 4 }]}>Workouts</Text>
          {workouts.slice(0, HISTORY_SHOWN).map((w) => (
            <Link key={w.id} href={{ pathname: '/workout/[id]', params: { id: String(w.id) } }} asChild>
              <TouchableOpacity style={row} accessibilityRole="button">
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={ui.h2} numberOfLines={1}>{w.day_name ?? 'Workout'}</Text>
                  <Text style={type.meta} numberOfLines={1}>
                    {shortDate(w.started_at)} · {duration(Math.min(Math.max((w.finished_at - w.started_at) / 60000, 0), 300))}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={type.action}>{w.sets} sets</Text>
                  <Text style={type.meta}>{compact(fromKg(w.volume, unit))} {unit}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.muted} />
              </TouchableOpacity>
            </Link>
          ))}
          {workouts.length > HISTORY_SHOWN && <Text style={ui.muted}>Showing your latest {HISTORY_SHOWN} of {workouts.length} workouts.</Text>}
        </View>
      )}
    </ScrollView>
  );
}
