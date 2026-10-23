import { useCallback, useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Link, useFocusEffect, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  clearDraft, fullCatalog, getActiveProgramId, getProgram, loadDraft, nextDayPosition, pastSets, workoutHistory,
  type StoredProgram,
} from '../../src/db';
import { MUSCLES } from '../../src/data/exercises';
import { isStale, type WorkoutDraft } from '../../src/lib/draft';
import { RECOVERY_HOURS, recovery } from '../../src/lib/generator';
import { shortDate, startOfWeek, totals, weekStrip, duration } from '../../src/lib/report';
import { sessionProgress } from '../../src/lib/summary';
import { startSession } from '../../src/session';
import { ElapsedClock } from '../../src/ElapsedClock';
import { WeekStrip } from '../../src/charts';
import { BodyMap, LevelLegend } from '../../src/BodyMap';
import { TARGET, colors, type, ui } from '../../src/theme';
import { cap } from '../../src/lib/text';

type WorkoutRow = Awaited<ReturnType<typeof workoutHistory>>[number];


function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <Text style={type.meta}>{label}</Text>
      <Text style={[type.data, { fontSize: 24, color: colors.accentText }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
    </View>
  );
}

/** A pill that sits on the big accent card: inverted so it reads as the one thing to press. */
function OnAccentPill({ label, onPress, hint }: { label: string; onPress: () => void; hint?: string }) {
  return (
    <TouchableOpacity
      onPress={onPress} accessibilityRole="button" accessibilityLabel={hint ?? label}
      style={{ alignSelf: 'flex-start', backgroundColor: colors.onAccent, borderRadius: 999, paddingHorizontal: 32, minHeight: TARGET, justifyContent: 'center' }}>
      <Text style={[ui.buttonText, { color: colors.accent }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function TodayScreen() {
  const router = useRouter();
  const [draft, setDraft] = useState<WorkoutDraft | null>(null);
  const [draftProgram, setDraftProgram] = useState<StoredProgram | null>(null);
  const [program, setProgram] = useState<StoredProgram | null>(null);
  const [nextPos, setNextPos] = useState(0);
  const [workouts, setWorkouts] = useState<WorkoutRow[]>([]);
  const [rec, setRec] = useState<Record<string, number>>({});
  const [loaded, setLoaded] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    const [d, activeId, ws, history, catalog] = await Promise.all([
      loadDraft(), getActiveProgramId(), workoutHistory(500), pastSets(), fullCatalog(),
    ]);
    const prog = activeId ? await getProgram(activeId) : null;
    setDraft(d);
    setDraftProgram(d?.programId != null ? (d.programId === prog?.id ? prog : await getProgram(d.programId)) : null);
    setProgram(prog);
    setNextPos(prog ? await nextDayPosition(prog.id, prog.days.length) : 0);
    setWorkouts(ws);
    const currentTime = Date.now();
    setRec(recovery(history, currentTime, catalog));
    setNow(currentTime);
    setLoaded(true);
  }, []);
  useFocusEffect(useCallback(() => { load().catch(() => setLoaded(true)); }, [load]));

  const discardOpen = () =>
    Alert.alert('Discard this workout?', 'This workout, and anything you logged in it, will be removed.', [
      { text: 'Keep it', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: async () => { await clearDraft().catch(() => {}); load(); } },
    ]);

  const strip = weekStrip(workouts);
  const thisWeek = totals(workouts.filter((w) => w.started_at >= startOfWeek(now).getTime()));
  const upNext = program?.days[nextPos] ?? program?.days[0];

  // The open workout, if any.
  const stale = draft ? isStale(draft) : false;
  const draftDay = draft && draft.mode === 'program' ? draftProgram?.days[draft.dayPos]?.name : undefined;
  const draftTitle = draftDay ?? 'Quick workout';
  const draftProgress = draft ? sessionProgress(draft.blocks) : { done: 0, total: 0 };

  const muscles = MUSCLES.filter((m) => m !== 'forearms');
  const recovering = muscles.filter((m) => (rec[m] ?? 1) < 0.9);
  // Recovery rises toward 1. The map shows the inverse so color means "you trained this" rather than "you did not".
  const worked = Object.fromEntries(muscles.map((m) => [m, Math.max(0, 1 - (rec[m] ?? 1))]));

  return (
    <ScrollView style={ui.screen} contentContainerStyle={ui.content}>
      <Text style={type.meta}>{shortDate(now)}</Text>

      {draft ? (
        <View style={{ backgroundColor: colors.accent, borderRadius: 24, padding: 18, gap: 14 }}>
          <View style={{ gap: 2 }}>
            <Text style={[type.header, { color: colors.onAccent, letterSpacing: 0.6 }]}>{stale ? 'UNFINISHED' : 'IN PROGRESS'}</Text>
            <Text style={[ui.h1, { color: colors.onAccent }]}>{draftTitle}</Text>
            {stale
              ? <Text style={[type.meta, { color: colors.onAccent }]}>Started {shortDate(draft.startedAt)}</Text>
              : <ElapsedClock since={draft.startedAt} style={{ color: colors.onAccent, fontSize: 30 }} />}
            <Text style={[type.meta, { color: colors.onAccent }]}>{draftProgress.done} of {draftProgress.total} sets</Text>
          </View>
          <View style={[ui.row, { gap: 16 }]}>
            <OnAccentPill label="Resume" onPress={() => router.push('/session')} hint={`Resume ${draftTitle}`} />
            <TouchableOpacity onPress={discardOpen} accessibilityRole="button" style={{ minHeight: TARGET, justifyContent: 'center' }}>
              <Text style={[type.action, { color: colors.onAccent }]}>Discard</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : program && upNext ? (
        <>
          <View style={{ backgroundColor: colors.accent, borderRadius: 24, padding: 18, gap: 14 }}>
            <View style={{ gap: 2 }}>
              <Text style={[type.header, { color: colors.onAccent, letterSpacing: 0.6 }]}>UP NEXT</Text>
              <Text style={[ui.h1, { color: colors.onAccent }]}>{upNext.name}</Text>
              <Text style={[type.meta, { color: colors.onAccent }]}>
                {program.name} · {upNext.items.length} exercise{upNext.items.length === 1 ? '' : 's'}
              </Text>
            </View>
            <OnAccentPill label="Start" hint={`Start ${upNext.name}`} onPress={() => startSession(router, { mode: 'program', programId: program.id, day: nextPos })} />
          </View>
          <TouchableOpacity
            style={{ minHeight: TARGET, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }} accessibilityRole="button"
            onPress={() => startSession(router, { mode: 'auto' })}>
            <Ionicons name="flash-outline" size={18} color={colors.accentText} />
            <Text style={[type.action, { color: colors.accentText }]}>No plan today? Quick workout</Text>
          </TouchableOpacity>
        </>
      ) : loaded ? (
        <View style={[ui.card, { gap: 8 }]}>
          <Text style={ui.h2}>No program yet</Text>
          <Text style={ui.muted}>Make a program and the next workout shows up here. Or start a quick one picked from the muscles you have recovered.</Text>
          <Link href="/program/generate" asChild><TouchableOpacity style={ui.button}><Text style={ui.buttonText}>Generate a program for me</Text></TouchableOpacity></Link>
          <TouchableOpacity
            style={{ minHeight: TARGET, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }} accessibilityRole="button"
            onPress={() => startSession(router, { mode: 'auto' })}>
            <Ionicons name="flash-outline" size={18} color={colors.accentText} />
            <Text style={[type.action, { color: colors.accentText }]}>No plan today? Quick workout</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={[ui.card, { gap: 14 }]}>
        <Text style={ui.h2}>This week</Text>
        <WeekStrip days={strip} />
        <View style={[ui.row, { alignItems: 'flex-start' }]}>
          <Stat label="Workouts" value={String(thisWeek.workouts)} />
          <Stat label="Time" value={thisWeek.minutes > 0 ? duration(thisWeek.minutes) : '0 min'} />
        </View>
      </View>

      <View style={[ui.card, { gap: 12 }]}>
        <Text style={ui.h2}>Muscles worked</Text>
        <Text style={ui.muted}>
          {recovering.length > 0 ? `Recently trained: ${recovering.map(cap).join(', ')}.` : 'Complete a workout to see it here.'}
        </Text>
        <View style={{ alignItems: 'center' }}><BodyMap levels={worked} /></View>
        <LevelLegend high="More recent" low="Recovered" />
        <Text style={type.meta}>Highlighted muscles are what you worked. Brighter means more recent.</Text>
        {recovering.length > 0 && (
          <Text style={type.meta}>
            Still recovering: {recovering.map((m) => `${cap(m)} (${Math.ceil((1 - (rec[m] ?? 1)) * RECOVERY_HOURS)}h)`).join(', ')}.
          </Text>
        )}
      </View>
    </ScrollView>
  );
}
