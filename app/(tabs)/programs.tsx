import { useCallback, useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Link, useFocusEffect, useRouter } from 'expo-router';
import {
  deleteProgram, fullCatalog, getActiveProgramId, getProgram, listPrograms, nextDayPosition, setActiveProgramId,
  type StoredProgram,
} from '../../src/db';
import { startSession } from '../../src/session';
import { importPersonalPrograms, personalProgramCount } from '../../src/importPrograms';
import { CARD_PAD, TARGET, colors, type, ui } from '../../src/theme';

const GOAL: Record<string, string> = { strength: 'Strength', hypertrophy: 'Muscle size', both: 'Strength + size', custom: 'Custom' };

/** "Upper Lower Split" becomes "UL"; digits and symbols are skipped so "4-Day Push Pull" is "DP", not "4D". */
const initials = (name: string) =>
  name.split(/\s+/).map((w) => w.match(/[A-Za-z]/)?.[0] ?? '').filter(Boolean).slice(0, 2).join('').toUpperCase() || '·';

export default function ProgramsScreen() {
  const router = useRouter();
  const [programs, setPrograms] = useState<StoredProgram[]>([]);
  const [names, setNames] = useState<Map<string, string>>(new Map());
  const [active, setActive] = useState<number | null>(null);
  const [nextPos, setNextPos] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const [list, catalog, activeId] = await Promise.all([listPrograms(), fullCatalog(), getActiveProgramId()]);
    const full = (await Promise.all(list.map((p) => getProgram(p.id)))).filter((p): p is StoredProgram => p !== null);
    const current = full.find((p) => p.id === activeId);
    setNames(new Map(catalog.map((x) => [x.id, x.name])));
    setPrograms(full);
    setActive(current ? activeId : null);
    setNextPos(current ? await nextDayPosition(current.id, current.days.length) : 0);
    setLoaded(true);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const [importing, setImporting] = useState(false);
  const importSaved = async () => {
    setImporting(true);
    try {
      const r = await importPersonalPrograms();
      await load();
      Alert.alert(
        r.added ? `Added ${r.added} program${r.added === 1 ? '' : 's'}` : 'Already imported',
        `${r.skipped ? `${r.skipped} were already here. ` : ''}${r.customs ? `${r.customs} exercises that are not in the library were added to your own exercises.` : ''}`.trim() || 'Nothing new to add.',
      );
    } catch (e) {
      Alert.alert("Couldn't import", e instanceof Error ? e.message : 'Try again.');
    } finally {
      setImporting(false);
    }
  };

  const confirmDelete = (p: StoredProgram) =>
    Alert.alert(`Delete "${p.name}"?`, 'Logged workouts are kept.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteProgram(p.id); load(); } },
    ]);

  const activeProgram = programs.find((p) => p.id === active);
  const upNext = activeProgram?.days[nextPos] ?? activeProgram?.days[0];

  return (
    <ScrollView style={ui.screen} contentContainerStyle={ui.content}>
      {activeProgram && upNext && (
        <View style={{ backgroundColor: colors.accent, borderRadius: 24, padding: 18, gap: 14 }}>
          <View style={{ gap: 2 }}>
            <Text style={[type.header, { color: colors.onAccent, letterSpacing: 0.6 }]}>UP NEXT</Text>
            <Text style={[ui.h1, { color: colors.onAccent }]}>{upNext.name}</Text>
            <Text style={[type.meta, { color: colors.onAccent }]}>
              {activeProgram.name} · {upNext.items.length} exercise{upNext.items.length === 1 ? '' : 's'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => startSession(router, { mode: 'program', programId: activeProgram.id, day: nextPos })} accessibilityRole="button" accessibilityLabel={`Start ${upNext.name}`}
            style={{ alignSelf: 'flex-start', backgroundColor: colors.onAccent, borderRadius: 999, paddingHorizontal: 32, minHeight: TARGET, justifyContent: 'center' }}>
            <Text style={[ui.buttonText, { color: colors.accent }]}>Start</Text>
          </TouchableOpacity>
        </View>
      )}

      <Link href="/program/generate" asChild>
        <TouchableOpacity style={ui.button}><Text style={ui.buttonText}>Generate a program for me</Text></TouchableOpacity>
      </Link>
      <Link href={{ pathname: '/program/[id]', params: { id: 'new' } }} asChild>
        <TouchableOpacity style={ui.ghost}><Text style={ui.ghostText}>Build my own</Text></TouchableOpacity>
      </Link>

      {loaded && programs.length === 0 && (
        <View style={[ui.card, { gap: 6 }]}>
          <Text style={ui.h2}>No programs yet</Text>
          <Text style={ui.muted}>
            Generate one from your goal, schedule and equipment, or build your own. The program you make active shows up on Today as your next workout.
          </Text>
        </View>
      )}

      {programs.length > 0 && <Text style={[ui.h2, { marginTop: 4 }]}>Your programs</Text>}

      {programs.map((p) => {
        const isActive = p.id === active;
        const day = p.days[0];
        const top = day?.items.slice(0, 3) ?? [];
        const actions = [
          ...(isActive ? [] : [{ label: 'Make active', hint: `Make ${p.name} your active program`, color: colors.accentText, onPress: async () => { await setActiveProgramId(p.id); load(); } }]),
          { label: 'Delete', hint: `Delete ${p.name}`, color: colors.danger, onPress: () => confirmDelete(p) },
        ];
        return (
          <View key={p.id} style={[ui.card, { gap: 10, overflow: 'hidden' }]}>
            <View style={[ui.row, { alignItems: 'flex-start', gap: 12 }]}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={ui.h2} numberOfLines={2}>{p.name}</Text>
                <Text style={type.meta}>{p.days.length} day{p.days.length === 1 ? '' : 's'} · {GOAL[p.goal] ?? p.goal}</Text>
                {isActive && (
                  <View style={{ alignSelf: 'flex-start', backgroundColor: colors.accent, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
                    <Text style={[type.header, { color: colors.onAccent }]}>Active</Text>
                  </View>
                )}
              </View>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }} accessible={false}>
                <Text style={[type.action, { color: colors.accentText }]}>{initials(p.name)}</Text>
              </View>
            </View>

            {day && (
              <View style={{ gap: 6 }}>
                <Text style={type.header}>{day.name}</Text>
                {top.map((it, i) => (
                  <View key={i} style={[ui.row, { justifyContent: 'space-between' }]}>
                    <Text style={[ui.text, { flex: 1 }]} numberOfLines={1}>{names.get(it.exerciseId) ?? it.exerciseId}</Text>
                    <Text style={type.action}>{it.sets}×{it.repMin}–{it.repMax}</Text>
                  </View>
                ))}
                <Link href={{ pathname: '/program/view/[id]', params: { id: String(p.id) } }} asChild>
                  <TouchableOpacity accessibilityRole="button" accessibilityLabel={`View all of ${p.name}`}
                    style={{ alignSelf: 'flex-end', minHeight: TARGET, justifyContent: 'center' }}>
                    <Text style={[type.action, { color: colors.accentText }]}>View all</Text>
                  </TouchableOpacity>
                </Link>
              </View>
            )}

            <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border, marginHorizontal: -CARD_PAD, marginBottom: -CARD_PAD }}>
              {actions.map((a, i) => (
                <TouchableOpacity
                  key={a.label} onPress={a.onPress} accessibilityRole="button" accessibilityLabel={a.hint}
                  style={{ flex: 1, minHeight: TARGET, alignItems: 'center', justifyContent: 'center', borderLeftWidth: i ? 1 : 0, borderLeftColor: colors.border }}>
                  <Text style={[type.action, { color: a.color }]}>{a.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      })}

      {personalProgramCount > 0 && (
        <TouchableOpacity style={ui.ghost} onPress={importSaved} disabled={importing} accessibilityRole="button" accessibilityState={{ busy: importing }}>
          <Text style={ui.ghostText}>{importing ? 'Importing…' : `Import ${personalProgramCount} saved programs`}</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}
