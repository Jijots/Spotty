import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Alert, AppState, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  clearDraft, fullCatalog, getProgram, getSetting, loadDraft, pastSets, reopenWorkout, saveDraft, saveWorkout, setProgramItemRest, setSetting,
  type StoredProgram,
} from '../src/db';
import { DEFAULT_SETTINGS, loadSettings } from '../src/settings';
import { fromKg, stepFor, toKg, weightStepKg, type Unit } from '../src/lib/units';
import { followOffset } from '../src/lib/follow';
import { generateWorkout, suggestWeight, type PastSet } from '../src/lib/generator';
import { PR_LABEL, detectPRs } from '../src/lib/records';
import { restSeconds, warmupSets } from '../src/lib/warmup';
import { swapCandidates } from '../src/lib/swap';
import {
  hasProgress, isStale, propagateWeight, untickedWorkingSets, validateSets,
  type Block, type Mode, type Row, type WorkoutDraft,
} from '../src/lib/draft';
import type { Equipment, Exercise } from '../src/data/exercises';
import { ElapsedClock } from '../src/ElapsedClock';
import { ExercisePicker } from '../src/ExercisePicker';
import { RestTimer } from '../src/RestTimer';
import { RestDialog } from '../src/RestDialog';
import { formatRest } from '../src/lib/rest';
import { ColumnHeader, SetRow } from '../src/SetRow';
import { formatLast, lastSessions } from '../src/lib/last';
import { buildSummary, nextSetLabel, sessionProgress, type Summary } from '../src/lib/summary';
import { SummaryView } from '../src/SummaryView';
import { CARD_PAD, TARGET, colors, type, ui } from '../src/theme';

const MAX_ROWS_PER_EXERCISE = 20;
const UNWEIGHTED: Equipment[] = ['bodyweight', 'bands', 'other'];

interface Context { history: PastSet[]; settings: Awaited<ReturnType<typeof loadSettings>>; catalog: Exercise[]; variant?: number }

const makeBlock = (ex: Exercise, sets: number, repMin: number, repMax: number, label: string, hist: PastSet[], u: Unit, rest?: number | null): Block => {
  const w = suggestWeight(ex.id, hist, weightStepKg(u), repMax);
  const loadable = !UNWEIGHTED.includes(ex.equipment);
  return {
    exerciseId: ex.id, name: ex.name, muscle: ex.muscle, compound: ex.compound, barbell: ex.equipment === 'barbell',
    // Bodyweight/band work has no weight column, unless you have logged weight on it before (weighted dips).
    weighted: loadable || w > 0, step: stepFor(ex.equipment, u), repMin, repMax, target: label, rest: rest ?? undefined,
    rows: Array.from({ length: sets }, () => ({ weight: w ? String(fromKg(w, u)) : '', reps: String(repMin), rir: '', done: false, warmup: false })),
  };
};

function buildBlocks(m: Mode, prog: StoredProgram | null, pos: number, ctx: Context): Block[] {
  const { history, settings, catalog } = ctx;
  if (m === 'program' && prog?.days[pos]) {
    const byId = new Map<string, Exercise>(catalog.map((x) => [x.id, x]));
    return prog.days[pos].items.flatMap((it) => {
      const ex = byId.get(it.exerciseId);
      return ex ? [makeBlock(ex, it.sets, it.repMin, it.repMax, `${it.sets} × ${it.repMin}–${it.repMax} · RIR ${it.rir}`, history, settings.unit, it.rest)] : [];
    });
  }
  const plan = generateWorkout({ equipment: settings.equipment, history, weightStep: weightStepKg(settings.unit), catalog, variant: ctx.variant });
  return plan.map((p) => makeBlock(p.exercise, p.sets, p.repRange[0], p.repRange[1], `${p.sets} × ${p.repRange[0]}–${p.repRange[1]}`, history, settings.unit));
}

const askResume = (d: WorkoutDraft) =>
  new Promise<boolean>((resolve) => {
    const when = new Date(d.savedAt).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' });
    Alert.alert('Resume your workout?', `You have an unfinished workout from ${when}.`, [
      { text: 'Discard it', style: 'destructive', onPress: () => resolve(false) },
      { text: 'Resume', onPress: () => resolve(true) },
    ], { cancelable: false });
  });

export default function SessionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // Set when a session is started from Today, Programs or a program's detail screen; absent when resuming.
  const params = useLocalSearchParams<{ mode?: string; programId?: string; day?: string }>();
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [dirty, setDirty] = useState(false);
  const [startedAt, setStartedAt] = useState(Date.now());
  const [unit, setUnit] = useState<Unit>('kg');
  const [program, setProgram] = useState<StoredProgram | null>(null);
  const [mode, setMode] = useState<Mode>('auto');
  const [dayPos, setDayPos] = useState(0);
  const [history, setHistory] = useState<PastSet[]>([]);
  const [catalog, setCatalog] = useState<Exercise[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [rest, setRest] = useState(DEFAULT_SETTINGS.rest);
  const [timer, setTimer] = useState<{ endsAt: number; total: number } | null>(null);
  const [swapIdx, setSwapIdx] = useState<number | null>(null);
  const [restIdx, setRestIdx] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [resumed, setResumed] = useState(false);
  const [active, setActive] = useState<{ b: number; r: number } | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  // The just-finished workout, kept only while its summary is on screen so a mistaken Finish can be undone.
  const [saved, setSaved] = useState<{ id: number; draft: WorkoutDraft } | null>(null);
  const [reopening, setReopening] = useState(false);
  const [tipSeen, setTipSeen] = useState<boolean | null>(null); // null until read, so the tip never flashes for people who dismissed it
  const reopeningRef = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
  // Positions for following the workout: card tops (in scroll content) and set-row tops (within their card).
  const cardY = useRef<number[]>([]);
  const rowY = useRef<Record<string, number>>({});
  const scrollY = useRef(0);
  const viewH = useRef(0);
  const wantFollow = useRef(false);
  const reduceMotion = useRef(false);

  // Refs let long-lived callbacks (focus, AppState, debounced save) see current values.
  const request = useRef(0);          // newest load wins; stale async results are dropped
  const draftArmed = useRef(false);   // autosave is off while loading, saving or discarding
  const savingRef = useRef(false);
  const progressRef = useRef(false);
  const snapshot = useRef<() => WorkoutDraft | null>(() => null);

  progressRef.current = hasProgress(blocks, dirty);
  snapshot.current = () =>
    progressRef.current
      ? { v: 1, mode, programId: program?.id ?? null, dayPos, startedAt, savedAt: Date.now(), unit, blocks }
      : null;

  const step = weightStepKg(unit);
  const displayStep = unit === 'kg' ? 2.5 : 5; // what the ± buttons add, in the unit on screen
  const showKg = (kg: number) => (kg ? String(fromKg(kg, unit)) : '');

  /**
   * Opens the session. An unfinished one is always resumed (so a remount can never replace your sets); otherwise a
   * new workout is built from the route and its clock starts now. Nothing to resume and nothing requested shows an empty state.
   */
  const init = useCallback(async () => {
    const token = ++request.current;
    draftArmed.current = false;
    setLoadError(null);
    try {
      const [history, settings, catalog] = await Promise.all([pastSets(), loadSettings(), fullCatalog()]);
      let draft = await loadDraft();
      if (draft && isStale(draft) && !params.mode && !(await askResume(draft))) { await clearDraft(); draft = null; }
      if (token !== request.current) return; // a newer load started while we waited

      const ctx: Context = { history, settings, catalog };
      setTipSeen(await getSetting<boolean>('tip:rir', false));
      setHistory(history); setCatalog(catalog); setEquipment(settings.equipment); setRest(settings.rest);
      setTimer(null); setActive(null);

      if (draft) {
        const prog = draft.programId == null ? null : await getProgram(draft.programId);
        if (token !== request.current) return;
        setUnit(draft.unit); setBlocks(draft.blocks); setStartedAt(draft.startedAt); setDirty(true); setResumed(true);
        setProgram(prog); setMode(draft.mode === 'program' && prog ? 'program' : 'auto'); setDayPos(draft.dayPos);
      } else if (params.mode === 'program' || params.mode === 'auto') {
        const prog = params.programId ? await getProgram(Number(params.programId)) : null;
        const m: Mode = params.mode === 'program' && prog ? 'program' : 'auto';
        const pos = Math.max(0, Number(params.day) || 0);
        if (token !== request.current) return;
        setUnit(settings.unit); setProgram(prog); setMode(m); setDayPos(pos);
        // Starting is a decision, so the clock and the autosaved draft begin now, not at the first edit.
        setBlocks(buildBlocks(m, prog, pos, ctx)); setStartedAt(Date.now()); setDirty(true); setResumed(false);
      } else {
        setBlocks([]); setDirty(false);
      }
      draftArmed.current = true;
    } catch (e) {
      if (token === request.current) {
        setLoadError(e instanceof Error ? e.message : 'Unknown error');
        draftArmed.current = progressRef.current; // sets still on screen stay protected
      }
    } finally {
      if (token === request.current) setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- the route params are fixed for this screen

  useEffect(() => { init(); }, [init]);

  // Autosave the draft shortly after every change, and immediately when the app is backgrounded.
  useEffect(() => {
    const t = setTimeout(() => {
      const d = snapshot.current();
      if (d && draftArmed.current) saveDraft(d).catch(() => {});
    }, 400);
    return () => clearTimeout(t);
  }, [blocks, dirty, mode, dayPos, startedAt, unit, program?.id]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') return;
      const d = snapshot.current();
      if (d && draftArmed.current) saveDraft(d).catch(() => {});
    });
    return () => sub.remove();
  }, []);

  /** Runs `action` after confirming, but only when there is logged work that it would throw away. */
  const guardDiscard = (title: string, action: () => void) => {
    if (!progressRef.current) return action();
    Alert.alert(title, 'This workout, and anything you logged in it, will be removed.', [
      { text: 'Keep logging', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: action },
    ]);
  };

  const discardSession = async () => {
    draftArmed.current = false;
    await clearDraft().catch(() => {});
    router.dismissTo('/');
  };

  const edit = (fn: (b: Block[]) => Block[]) => { setBlocks(fn); setDirty(true); };

  const patchRow = (b: number, r: number, patch: Partial<Row>) =>
    edit((cur) => cur.map((blk, i) => {
      if (i !== b) return blk;
      const { weight, ...rest } = patch;
      let rows = blk.rows.map((row, j) => (j === r ? { ...row, ...rest } : row));
      if (weight !== undefined) rows = propagateWeight(rows, r, weight); // enter a weight once, not once per set
      return { ...blk, rows };
    }));

  const toggleDone = (b: number, r: number) => {
    const row = blocks[b].rows[r];
    patchRow(b, r, { done: !row.done });
    if (!row.done) {
      setActive(null);
      wantFollow.current = true; // bring the next set into view once it has moved
      const sec = restSeconds({ compound: blocks[b].compound, warmup: row.warmup, compoundRest: rest.compound, isolationRest: rest.isolation, override: blocks[b].rest });
      setTimer({ endsAt: Date.now() + sec * 1000, total: sec });
    }
  };

  const adjustTimer = (delta: number) =>
    setTimer((t) => (t ? { endsAt: Math.max(t.endsAt + delta * 1000, Date.now()), total: Math.max(t.total + delta, 1) } : t));

  const addSet = (b: number) => {
    if (blocks[b].rows.length >= MAX_ROWS_PER_EXERCISE) return Alert.alert('That is a lot of sets', `${MAX_ROWS_PER_EXERCISE} is the most for one exercise.`);
    edit((cur) => cur.map((blk, i) => {
      if (i !== b) return blk;
      const last = [...blk.rows].reverse().find((r) => !r.warmup);
      return { ...blk, rows: [...blk.rows, { weight: last?.weight ?? '', reps: last?.reps ?? '8', rir: '', done: false, warmup: false }] };
    }));
  };

  const enableWeight = (b: number) => edit((cur) => cur.map((x, i) => (i === b ? { ...x, weighted: true } : x)));

  const removeRow = (b: number, r: number) => {
    if (blocks[b].rows.length <= 1) return Alert.alert('Keep at least one set', 'Use Swap to change the exercise instead.');
    edit((cur) => cur.map((blk, i) => (i !== b ? blk : { ...blk, rows: blk.rows.filter((_, j) => j !== r) })));
  };

  const addWarmups = (b: number) => {
    const blk = blocks[b];
    const working = Number(blk.rows.find((r) => !r.warmup)?.weight);
    const ramp = warmupSets(toKg(working || 0, unit), step, blk.barbell);
    if (!ramp.length) return Alert.alert('Enter a weight first', `Warm-ups are built from the weight of your first set and start at ${unit === 'kg' ? '30 kg' : '66 lb'}.`);
    const rows: Row[] = ramp.map((w) => ({ weight: showKg(w.weight), reps: String(w.reps), rir: '', done: false, warmup: true }));
    edit((cur) => cur.map((x, i) => (i === b ? { ...x, rows: [...rows, ...x.rows] } : x)));
  };

  const swap = (b: number, ex: Exercise) => {
    const apply = () => {
      const old = blocks[b];
      const sets = old.rows.filter((r) => !r.warmup).length;
      edit((cur) => cur.map((x, i) => (i === b ? makeBlock(ex, sets, old.repMin, old.repMax, old.target, history, unit, old.rest) : x)));
      setSwapIdx(null);
    };
    if (blocks[b].rows.some((r) => r.done)) {
      Alert.alert('Swap exercise?', 'Sets you already ticked for this exercise will be cleared.', [
        { text: 'Cancel', style: 'cancel', onPress: () => setSwapIdx(null) },
        { text: 'Swap', style: 'destructive', onPress: apply },
      ]);
    } else apply();
  };

  const sessionSets = () =>
    blocks.flatMap((b) =>
      b.rows.filter((r) => r.done && Number(r.reps) > 0).map((r) => ({
        exerciseId: b.exerciseId, weight: toKg(Number(r.weight) || 0, unit), reps: Number(r.reps),
        rir: r.rir === '' ? null : Number(r.rir), warmup: r.warmup,
      })),
    );

  const prsFor = (b: Block) => {
    const mine = b.rows.filter((r) => r.done && !r.warmup && Number(r.reps) > 0)
      .map((r) => ({ exerciseId: b.exerciseId, weight: toKg(Number(r.weight) || 0, unit), reps: Number(r.reps) }));
    return detectPRs(history, mine)[0]?.kinds ?? [];
  };

  const save = async () => {
    if (savingRef.current) return; // a double tap must not log the workout twice
    savingRef.current = true; setSaving(true); draftArmed.current = false;
    try {
      const sets = sessionSets();
      const working = sets.filter((s) => !s.warmup);
      const prs = detectPRs(history, working);
      const fromProgram = mode === 'program' && program;
      const workoutId = await saveWorkout(startedAt, sets, fromProgram ? program.id : null, fromProgram ? dayPos : null);
      await clearDraft().catch(() => {});
      const nextDay = fromProgram && program.days.length > 1 ? program.days[(dayPos + 1) % program.days.length]?.name : null;
      setSaved({ id: workoutId, draft: { v: 1, mode, programId: program?.id ?? null, dayPos, startedAt, savedAt: Date.now(), unit, blocks } });
      setSummary(buildSummary({
        blocks, unit, startedAt, now: Date.now(), prs, next: nextDay ?? null,
        title: fromProgram && dayName ? `${dayName} done` : 'Workout done',
      }));
      setBlocks([]); setDirty(false); setTimer(null); // saved: nothing left on screen that Finish could log twice
      savingRef.current = false; setSaving(false);
    } catch (e) {
      draftArmed.current = true; // the sets are still on screen: keep protecting them
      Alert.alert("Couldn't save your workout", `Your sets are still here. Try Finish again.\n\n${e instanceof Error ? e.message : ''}`.trim());
    } finally {
      savingRef.current = false; setSaving(false);
    }
  };

  /** Undo Finish: the workout leaves the history and its sets come back, exactly as they were. */
  const reopen = async () => {
    if (!saved || reopeningRef.current) return; // double tap
    reopeningRef.current = true; setReopening(true);
    const { id, draft } = saved;
    draftArmed.current = false;
    try {
      // One transaction removes the saved workout and writes the draft, so a failure here loses nothing.
      await reopenWorkout(id, { ...draft, savedAt: Date.now() });
    } catch (e) {
      draftArmed.current = true;
      Alert.alert("Couldn't reopen the workout", `It is still saved in your history.\n\n${e instanceof Error ? e.message : ''}`.trim());
      reopeningRef.current = false; setReopening(false);
      return;
    }
    try {
      const prog = draft.programId == null ? null : draft.programId === program?.id ? program : await getProgram(draft.programId);
      const hist = await pastSets(); // the reopened workout no longer counts as history: PRs, Last lines and weights must not see it
      setHistory(hist);
      setUnit(draft.unit); setBlocks(draft.blocks); setStartedAt(draft.startedAt); setDirty(true); setResumed(false);
      setProgram(prog ?? program); setMode(draft.mode === 'program' && prog ? 'program' : 'auto'); setDayPos(draft.dayPos);
      setActive(null); setTimer(null); setSummary(null); setSaved(null);
      draftArmed.current = true;
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 100); // the last sets are what you want to fix
    } catch {
      // The database is already reopened and the draft is saved; reload from it instead of leaving the screen half-restored.
      setSummary(null); setSaved(null);
      await init(); // the reopened workout is a draft now, so this resumes it
    } finally {
      reopeningRef.current = false; setReopening(false);
    }
  };

  const finish = () => {
    if (savingRef.current) return;
    const problems = validateSets(blocks, unit);
    const errors = problems.filter((p) => p.severity === 'error');
    if (errors.length) {
      const more = errors.length > 3 ? `\n…and ${errors.length - 3} more.` : '';
      return Alert.alert('Fix this before finishing', errors.slice(0, 3).map((p) => p.message).join('\n') + more);
    }
    if (!sessionSets().some((s) => !s.warmup)) return Alert.alert('Nothing to save yet', "Tick at least one finished set. Warm-ups don't count.");

    const notes = problems.filter((p) => p.severity === 'warn').map((p) => p.message);
    const left = untickedWorkingSets(blocks);
    if (left > 0) notes.push(`${left} set${left === 1 ? ' is' : 's are'} not ticked and won't be saved.`);
    if (!notes.length) return void save();
    Alert.alert('Finish this workout?', notes.join('\n'), [
      { text: 'Keep logging', style: 'cancel' },
      { text: 'Finish', onPress: () => void save() },
    ]);
  };

  const dayName = program?.days[dayPos]?.name;
  const title = summary ? 'Workout done' : mode === 'program' && dayName ? dayName : 'Quick workout';
  const leave = () => (router.canGoBack() ? router.back() : router.replace('/'));

  // Opened with nothing to resume (a restored route, an old link): go to Today instead of a dead end.
  const orphan = !loading && !loadError && blocks.length === 0 && !params.mode && !summary && !saved;
  useEffect(() => { if (orphan) router.replace('/'); }, [orphan, router]);
  const swapBlock = swapIdx !== null ? blocks[swapIdx] : null;
  const swapEx = swapBlock ? catalog.find((x) => x.id === swapBlock.exerciseId) : undefined;
  const inProgress = hasProgress(blocks, dirty);
  // Finish is tapped near the bottom of a long list; show the summary from its top.
  useEffect(() => { if (summary) scrollRef.current?.scrollTo({ y: 0, animated: false }); }, [summary]);
  const firstOpen = (() => {
    for (let b = 0; b < blocks.length; b++) {
      const r = blocks[b].rows.findIndex((row) => !row.done);
      if (r !== -1) return { b, r };
    }
    return null;
  })();
  const current = active && blocks[active.b]?.rows[active.r] ? active : firstOpen;
  const progress = sessionProgress(blocks);
  // While resting, say what comes next; after the last set, say so instead of leaving a blank.
  const nextSet = nextSetLabel(blocks, unit);
  const restNext = nextSet ? `Up next: ${nextSet}` : progress.done > 0 ? 'All sets done. Finish when you are ready.' : null;

  useEffect(() => { AccessibilityInfo.isReduceMotionEnabled().then((v) => { reduceMotion.current = v; }).catch(() => {}); }, []);

  // After a tick, keep the next set in view above the rest bar; after the last set, bring up Finish.
  const currentKey = current ? `${current.b}:${current.r}` : '';
  useEffect(() => {
    if (!wantFollow.current) return;
    const t = setTimeout(() => {
      wantFollow.current = false;
      const animated = !reduceMotion.current;
      if (!current) return scrollRef.current?.scrollToEnd({ animated });
      const cy = cardY.current[current.b];
      const ry = rowY.current[currentKey];
      if (cy === undefined || ry === undefined) return; // not measured yet: staying put beats jumping to the top
      const top = cy + ry;
      const to = followOffset({ top, height: 116, offset: scrollY.current, view: viewH.current, bottomPad: timer ? 150 : 24 });
      if (to !== null) scrollRef.current?.scrollTo({ y: to, animated });
    }, 80); // let the old highlight collapse and the new row lay out first
    return () => clearTimeout(t);
  }, [currentKey, blocks]); // eslint-disable-line react-hooks/exhaustive-deps
  const exerciseKey = blocks.map((b) => b.exerciseId).join('|');
  // One pass over history per workout change, not per keystroke.
  const lastBy = useMemo(() => lastSessions(history, new Set(exerciseKey ? exerciseKey.split('|') : [])), [history, exerciseKey]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{
        paddingTop: insets.top + 4, paddingHorizontal: 8, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: colors.bg, borderBottomWidth: 1, borderBottomColor: colors.border,
      }}>
        <TouchableOpacity
          onPress={leave} accessibilityRole="button" accessibilityLabel="Leave the workout. It keeps running."
          style={{ width: TARGET, height: TARGET, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="chevron-down" size={26} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={ui.h2} numberOfLines={1}>{title}</Text>
          {!summary && program && mode === 'program' && <Text style={type.meta} numberOfLines={1}>{program.name}</Text>}
        </View>
        {!summary && blocks.length > 0 && <ElapsedClock since={startedAt} style={{ fontSize: 22, marginRight: 8 }} />}
      </View>

      <ScrollView ref={scrollRef} onScroll={(e) => { scrollY.current = e.nativeEvent.contentOffset.y; }} scrollEventThrottle={32} onLayout={(e) => { viewH.current = e.nativeEvent.layout.height; }} style={ui.screen} contentContainerStyle={[ui.content, { paddingBottom: 16 + insets.bottom }, timer && { paddingBottom: 150 + insets.bottom }]} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets>
        {summary ? <SummaryView summary={summary} onDone={() => router.dismissTo('/')} onReopen={saved ? reopen : undefined} reopening={reopening} /> : (<>
          {progress.total > 0 && (
            <Text style={type.meta}>
              {progress.done} of {progress.total} sets{resumed && inProgress ? ' · picked up where you left off' : ''}
            </Text>
          )}

          {tipSeen === false && blocks.length > 0 && (
            <View style={[ui.card, { gap: 8 }]}>
              <Text style={ui.h2}>What's RIR?</Text>
              <Text style={ui.muted}>Reps in reserve: how many more reps you could have done. If you stopped with 2 left, enter 2. Not sure? Leave it blank.</Text>
              <Text style={ui.muted}>Hold a set number to remove that set.</Text>
              <TouchableOpacity
                style={ui.ghost} accessibilityRole="button"
                onPress={() => { setTipSeen(true); setSetting('tip:rir', true).catch(() => {}); }}>
                <Text style={ui.ghostText}>Got it</Text>
              </TouchableOpacity>
            </View>
          )}

          {mode === 'auto' && !loading && blocks.length > 0 && (
            <Text style={ui.muted}>Built from the muscles you have recovered.</Text>
          )}

          {loading && blocks.length === 0 && !loadError && <Text style={ui.muted}>Loading your workout…</Text>}

          {loadError && (
            <View style={[ui.card, { gap: 8 }]}>
              <Text style={ui.h2}>Couldn't load your workout</Text>
              <Text style={ui.muted}>Your workouts are safe on this device. Try again, and restart the app if it keeps happening.</Text>
              <Text style={type.meta}>{loadError}</Text>
              <TouchableOpacity style={ui.button} onPress={() => { setLoading(true); init(); }}><Text style={ui.buttonText}>Try again</Text></TouchableOpacity>
            </View>
          )}

          {!loading && !loadError && blocks.length === 0 && !orphan && (
            <View style={[ui.card, { gap: 8 }]}>
              <Text style={ui.h2}>{params.mode ? 'Nothing to train' : 'No workout in progress'}</Text>
              <Text style={ui.muted}>
                {!params.mode
                  ? 'Start one from Today or Programs.'
                  : mode === 'program'
                    ? "This day's exercises were removed from your library. Edit the program or pick another day."
                    : 'Either no equipment is selected, or every muscle you can train with it was worked recently.'}
              </Text>
              <TouchableOpacity style={ui.button} onPress={leave}><Text style={ui.buttonText}>Back</Text></TouchableOpacity>
              {!!params.mode && <Link href="/settings" asChild><TouchableOpacity style={ui.ghost}><Text style={ui.ghostText}>Check my equipment</Text></TouchableOpacity></Link>}
            </View>
          )}

          {blocks.map((b, bi) => {
            const prs = prsFor(b);
            const lastLine = formatLast(lastBy.get(b.exerciseId), unit);
            const hasWarmups = b.rows.some((r) => r.warmup);
            let workNo = 0;
            return (
              <View key={`${b.exerciseId}-${bi}`} onLayout={(e) => { cardY.current[bi] = e.nativeEvent.layout.y; }} style={[ui.card, { gap: 8, overflow: 'hidden' }]}>
                <View style={{ gap: 2 }}>
                  <View style={[ui.row, { justifyContent: 'space-between', alignItems: 'flex-start' }]}>
                    <Link href={{ pathname: '/exercise/[id]', params: { id: b.exerciseId } }} style={{ flex: 1 }}>
                      <Text style={ui.h2} numberOfLines={2}>{b.name}</Text>
                    </Link>
                    <TouchableOpacity
                      onPress={() => setRestIdx(bi)} accessibilityRole="button"
                      accessibilityLabel={`Rest timer for ${b.name}: ${formatRest(b.rest ?? (b.compound ? rest.compound : rest.isolation))}. Tap to change.`}
                      style={{ minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: b.rest != null ? colors.accent : colors.border }}>
                      <Ionicons name="timer-outline" size={16} color={colors.accentText} />
                      <Text style={[type.action, { color: colors.accentText }]}>{formatRest(b.rest ?? (b.compound ? rest.compound : rest.isolation))}</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={type.meta} numberOfLines={1}>{hasWarmups ? `${b.target} · W = warm-up` : b.target}</Text>
                  {lastLine ? <Text style={type.meta} numberOfLines={1}>{lastLine}</Text> : null}
                </View>
                {prs.length > 0 && (
                  <View style={[ui.row, { gap: 8 }]}>
                    <View style={{ backgroundColor: colors.record, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
                      <Text style={[type.header, { color: colors.onRecord, fontWeight: '700' }]}>PR</Text>
                    </View>
                    <Text style={[type.action, { color: colors.accentText, fontWeight: '700' }]}>{prs.map((k) => PR_LABEL[k]).join(' + ')}</Text>
                  </View>
                )}

                <ColumnHeader unit={unit} weighted={b.weighted} />
                {b.rows.map((r, ri) => {
                  const no = r.warmup ? 0 : ++workNo;
                  return (
                    <SetRow
                      key={ri}
                      row={r}
                      label={r.warmup ? 'Warm-up' : `Set ${no}`}
                      shortLabel={r.warmup ? 'W' : String(no)}
                      unit={unit}
                      weighted={b.weighted}
                    weightStep={b.step ?? displayStep}
                    onMeasure={(y) => { rowY.current[`${bi}:${ri}`] = y; }}
                      active={current?.b === bi && current?.r === ri}
                      onActivate={() => setActive({ b: bi, r: ri })}
                      onChange={(patch) => patchRow(bi, ri, patch)}
                      onToggle={() => toggleDone(bi, ri)}
                      onRemove={() => removeRow(bi, ri)}
                    />
                  );
                })}

                {/* Card actions: full-width 48 dp segments instead of three loose text links */}
                <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border, marginHorizontal: -CARD_PAD, marginBottom: -CARD_PAD, marginTop: 2 }}>
                  {[
                    { label: '+ Set', hint: 'Add a set', color: colors.accentText, onPress: () => addSet(bi) },
                    ...(!b.weighted ? [{ label: '+ Weight', hint: 'Add weight to this exercise', color: colors.accentText, onPress: () => enableWeight(bi) }] : []),
                  ...(b.compound && b.weighted && !hasWarmups ? [{ label: '+ Warm-ups', hint: 'Add warm-up sets', color: colors.accentText, onPress: () => addWarmups(bi) }] : []),
                    { label: 'Swap', hint: 'Swap this exercise for a similar one', color: colors.text, onPress: () => setSwapIdx(bi) },
                  ].map((a, i) => (
                    <TouchableOpacity
                      key={a.label} onPress={a.onPress} accessibilityRole="button" accessibilityLabel={a.hint}
                      style={{ flex: 1, minHeight: TARGET, alignItems: 'center', justifyContent: 'center', borderLeftWidth: i ? 1 : 0, borderLeftColor: colors.border }}>
                      <Text maxFontSizeMultiplier={1.3} style={[type.action, { color: a.color }]}>{a.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            );
          })}

            {blocks.length > 0 && (
            <TouchableOpacity style={[ui.button, saving && { opacity: 0.6 }]} onPress={finish} disabled={saving}>
              <Text style={ui.buttonText}>{saving ? 'Saving…' : 'Finish workout'}</Text>
            </TouchableOpacity>
          )}
          {inProgress && !saving && (
            <TouchableOpacity style={ui.ghost} onPress={() => guardDiscard('Discard this workout?', discardSession)}>
              <Text style={{ color: colors.danger, fontWeight: '600' }}>Discard workout</Text>
            </TouchableOpacity>
          )}
        </>)}
      </ScrollView>

      {timer && <RestTimer bottomInset={insets.bottom} endsAt={timer.endsAt} totalSec={timer.total} next={restNext} onAdjust={adjustTimer} onClose={() => setTimer(null)} />}

      <RestDialog
        visible={restIdx !== null}
        title={restIdx !== null ? blocks[restIdx]?.name ?? '' : ''}
        value={restIdx !== null ? blocks[restIdx]?.rest ?? null : null}
        defaultSec={restIdx !== null && blocks[restIdx]?.compound ? rest.compound : rest.isolation}
        onClose={() => setRestIdx(null)}
        onSave={(v) => {
          const idx = restIdx;
          setRestIdx(null);
          if (idx === null) return;
          const blk = blocks[idx];
          edit((cur) => cur.map((x, k) => (k === idx ? { ...x, rest: v ?? undefined } : x)));
          // In a program workout the time is remembered on the program, so next time it is already set.
          if (mode === 'program' && program && blk) setProgramItemRest(program.id, dayPos, blk.exerciseId, v).catch(() => {});
        }}
      />
      <ExercisePicker
        visible={swapIdx !== null}
        catalog={catalog}
        title={swapEx ? `Similar to ${swapEx.name}` : 'Suggested'}
        suggestions={swapEx ? swapCandidates(swapEx, catalog, equipment, blocks.map((b) => b.exerciseId)) : undefined}
        onClose={() => setSwapIdx(null)}
        onPick={(ex) => swapIdx !== null && swap(swapIdx, ex)}
      />
    </View>
  );
}
