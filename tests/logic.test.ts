import test from 'node:test';
import assert from 'node:assert/strict';
import { generateWorkout, suggestWeight } from '../src/lib/generator';
import { estimateTdee, macroTarget, type DayData } from '../src/lib/nutrition';

test('adaptive TDEE recovers true expenditure from intake + weight trend', () => {
  // True TDEE 2800, eating 2300 => loses 500*7/7700 kg/week
  const perDay = 500 / 7700;
  const days: DayData[] = Array.from({ length: 28 }, (_, i) => ({
    date: `d${i}`, kcal: 2300, weightKg: 80 - perDay * i,
  }));
  const est = estimateTdee(days, 2500);
  assert.ok(Math.abs(est.tdee - 2800) < 120, `got ${est.tdee}`);
});

test('falls back to formula without enough data', () => {
  assert.equal(estimateTdee([], 2500).tdee, 2500);
});

test('macro target adds up to calories', () => {
  const m = macroTarget(2600, -0.5, 80);
  assert.ok(Math.abs(m.protein * 4 + m.carbs * 4 + m.fat * 9 - m.kcal) < 12);
});

test('double progression adds weight after hitting top reps', () => {
  const at = 1;
  const h = [1, 2, 3].map(() => ({ exerciseId: 'squat', weight: 100, reps: 12, at }));
  assert.equal(suggestWeight('squat', h), 102.5);
  assert.equal(suggestWeight('squat', [{ exerciseId: 'squat', weight: 100, reps: 9, at }]), 100);
});

test('generator skips recently trained muscles', () => {
  const now = Date.now();
  const history = [{ exerciseId: 'Barbell_Bench_Press_-_Medium_Grip', weight: 60, reps: 10, at: now - 3600_000 }];
  const plan = generateWorkout({ equipment: ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight'], history, now });
  assert.ok(plan.length >= 4);
  assert.ok(!plan.some((p) => p.exercise.muscle === 'chest'));
});

import { fromKg, toKg, weightStepKg } from '../src/lib/units';

test('unit conversion round-trips and uses plate-friendly steps', () => {
  assert.equal(fromKg(100, 'kg'), 100);
  assert.equal(fromKg(100, 'lb'), 220.5);
  assert.ok(Math.abs(toKg(225, 'lb') - 102.06) < 0.01);
  assert.ok(Math.abs(weightStepKg('lb') * 2.20462 - 5) < 1e-9);
});

import { LIBRARY } from '../src/data/exercises';
import { generateProgram, weeklyVolume, splitFor, type ProgramOptions } from '../src/lib/programs';

const ALL_EQ = ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight'] as ProgramOptions['equipment'];
const base = (over: Partial<ProgramOptions> = {}): ProgramOptions => ({
  goal: 'hypertrophy', daysPerWeek: 4, experience: 'intermediate', minutesPerSession: 60,
  equipment: ALL_EQ, catalog: LIBRARY, ...over,
});

test('program: split matches days and experience', () => {
  assert.deepEqual(splitFor(3, 'beginner'), ['Full Body', 'Full Body', 'Full Body']);
  assert.deepEqual(splitFor(3, 'advanced'), ['Push', 'Pull', 'Legs']);
  assert.equal(generateProgram(base({ daysPerWeek: 6 })).days.length, 6);
});

test('program: respects time budget and uses only allowed equipment', () => {
  for (const minutes of [30, 45, 60, 90]) {
    const p = generateProgram(base({ daysPerWeek: 3, experience: 'advanced', minutesPerSession: minutes, equipment: ['dumbbell', 'bodyweight'] }));
    const cap = Math.max(8, Math.floor((minutes * 60) / 150));
    for (const d of p.days) {
      assert.ok(d.items.reduce((s, i) => s + i.sets, 0) <= cap, `${d.name} over ${cap} at ${minutes}min`);
      for (const it of d.items) {
        const ex = LIBRARY.find((x) => x.id === it.exerciseId)!;
        assert.ok(['dumbbell', 'bodyweight'].includes(ex.equipment));
      }
    }
  }
});

test('program: priority muscles get more weekly volume; no duplicate exercises in a day', () => {
  const plain = weeklyVolume(generateProgram(base({ daysPerWeek: 5 })), LIBRARY);
  const prio = weeklyVolume(generateProgram(base({ daysPerWeek: 5, priority: ['shoulders'] })), LIBRARY);
  assert.ok((prio.shoulders ?? 0) > (plain.shoulders ?? 0));
  const p = generateProgram(base({ daysPerWeek: 6 }));
  for (const d of p.days) assert.equal(new Set(d.items.map((i) => i.exerciseId)).size, d.items.length);
});

test('program: strength uses lower reps than hypertrophy; seed changes variants', () => {
  const s = generateProgram(base({ goal: 'strength' })), h = generateProgram(base({ goal: 'hypertrophy' }));
  assert.ok(s.days[0].items[0].repMax < h.days[0].items[0].repMax);
  const a = JSON.stringify(generateProgram(base({ seed: 0 }))), b = JSON.stringify(generateProgram(base({ seed: 1 })));
  assert.notEqual(a, b);
  assert.equal(a, JSON.stringify(generateProgram(base({ seed: 0 }))));
});

import { bestOf, detectPRs, prKinds } from '../src/lib/records';
import { warmupSets, restSeconds } from '../src/lib/warmup';
import { swapCandidates } from '../src/lib/swap';
import { exerciseById } from '../src/data/exercises';

test('records: first session is a baseline, later heavier/e1RM sets are PRs', () => {
  const hist = [{ exerciseId: 'a', weight: 100, reps: 5 }];
  assert.deepEqual(detectPRs([], [{ exerciseId: 'a', weight: 100, reps: 5 }]), []);
  const r = detectPRs(hist, [{ exerciseId: 'a', weight: 100, reps: 8 }]);
  assert.deepEqual(r[0].kinds, ['e1rm']); // same weight, more reps
  const r2 = detectPRs(hist, [{ exerciseId: 'a', weight: 105, reps: 5 }]);
  assert.deepEqual(r2[0].kinds.sort(), ['e1rm', 'weight']);
  assert.deepEqual(detectPRs(hist, [{ exerciseId: 'a', weight: 90, reps: 5 }]), []);
});

test('records: bodyweight PRs count reps', () => {
  const prev = bestOf([{ weight: 0, reps: 10 }]);
  assert.deepEqual(prKinds(prev, bestOf([{ weight: 0, reps: 12 }])), ['reps']);
  assert.deepEqual(prKinds(prev, bestOf([{ weight: 0, reps: 9 }])), []);
});

test('warm-ups: ramp is increasing, below working weight, plate-rounded', () => {
  const w = warmupSets(100, 2.5, true);
  assert.equal(w[0].weight, 20);
  for (let i = 1; i < w.length; i++) assert.ok(w[i].weight > w[i - 1].weight);
  assert.ok(w.every((x) => x.weight < 100 && (x.weight / 2.5) % 1 === 0));
  assert.deepEqual(warmupSets(20, 2.5, false), []);
  assert.deepEqual(warmupSets(NaN, 2.5, true), []);
  assert.equal(restSeconds({ compound: true, warmup: false, compoundRest: 150, isolationRest: 60 }), 150);
  assert.equal(restSeconds({ compound: true, warmup: true, compoundRest: 150, isolationRest: 60 }), 45);
});

test('swap: same muscle, respects equipment, excludes current and already-used', () => {
  const bench = exerciseById('Barbell_Bench_Press_-_Medium_Grip')!;
  const alts = swapCandidates(bench, LIBRARY, ['dumbbell', 'machine'], ['Dumbbell_Bench_Press']);
  assert.ok(alts.length > 0);
  assert.ok(alts.every((x) => x.muscle === 'chest' && ['dumbbell', 'machine'].includes(x.equipment)));
  assert.ok(!alts.some((x) => x.id === bench.id || x.id === 'Dumbbell_Bench_Press'));
  assert.ok(alts[0].compound); // compound swaps rank first
});

import { hasProgress, isStale, parseDraft, sanitizeDecimal, sanitizeInt, stepValue, untickedWorkingSets, validateSets, type Block } from '../src/lib/draft';

const blk = (over: Partial<Block> = {}, rows: Block['rows'] = [{ weight: '80', reps: '8', rir: '', done: true, warmup: false }]): Block => ({
  exerciseId: 'x', name: 'Bench Press', muscle: 'chest', compound: true, barbell: true, weighted: true,
  repMin: 5, repMax: 8, target: '3 x 5-8', rows, ...over,
});

test('draft: round-trips and rejects junk without throwing', () => {
  const d = { v: 1, mode: 'program', programId: 3, dayPos: 2, startedAt: 10, savedAt: 20, unit: 'lb', blocks: [blk()] };
  const back = parseDraft(JSON.parse(JSON.stringify(d)))!;
  assert.equal(back.unit, 'lb'); assert.equal(back.programId, 3); assert.equal(back.blocks[0].rows[0].weight, '80');
  for (const junk of [null, undefined, 'x', 5, [], {}, { v: 2, blocks: [] }, { v: 1, blocks: 'no' }, { v: 1, blocks: [{ exerciseId: 1 }] }, { v: 1, blocks: [{ exerciseId: 'a', rows: [] }] }]) {
    assert.equal(parseDraft(junk), null);
  }
  const odd = parseDraft({ v: 1, mode: 'weird', dayPos: -4, unit: 'stone', blocks: [{ exerciseId: 'a', rows: [{ weight: 5, done: 'yes' }, null] }] })!;
  assert.equal(odd.mode, 'auto'); assert.equal(odd.dayPos, 0); assert.equal(odd.unit, 'kg');
  assert.equal(odd.blocks[0].rows.length, 1); assert.equal(odd.blocks[0].rows[0].weight, ''); assert.equal(odd.blocks[0].rows[0].done, false);
});

test('draft: staleness and progress detection', () => {
  const d = parseDraft({ v: 1, savedAt: 0, blocks: [blk()] })!;
  assert.ok(isStale(d, 9 * 3600_000)); assert.ok(!isStale(d, 7 * 3600_000));
  const fresh = [blk({}, [{ weight: '', reps: '8', rir: '', done: false, warmup: false }])];
  assert.equal(hasProgress(fresh, false), false);
  assert.equal(hasProgress(fresh, true), true);
  assert.equal(hasProgress([blk()], false), true);
  assert.equal(untickedWorkingSets([blk({}, [{ weight: '', reps: '8', rir: '', done: false, warmup: false }, { weight: '', reps: '8', rir: '', done: false, warmup: true }])]), 1);
});

test('input sanitising', () => {
  assert.equal(sanitizeDecimal('82,5'), '82.5');
  assert.equal(sanitizeDecimal('1.2.3'), '1.23');
  assert.equal(sanitizeDecimal('abc'), '');
  assert.equal(sanitizeDecimal('82.555'), '82.55');
  assert.equal(sanitizeDecimal('12345678901'), '1234567');
  assert.equal(sanitizeInt('1a2b3c4'), '123');
});

test('validation: blocks unticked-weight and zero-rep sets, warns on absurd values', () => {
  const row = (o: Partial<Block['rows'][0]>) => ({ weight: '80', reps: '8', rir: '', done: true, warmup: false, ...o });
  assert.equal(validateSets([blk({}, [row({})])], 'kg').length, 0);
  assert.equal(validateSets([blk({}, [row({ weight: '' })])], 'kg')[0].severity, 'error');
  assert.equal(validateSets([blk({ weighted: false }, [row({ weight: '' })])], 'kg').length, 0); // bodyweight is fine
  assert.equal(validateSets([blk({}, [row({ reps: '' })])], 'kg')[0].severity, 'error');
  assert.equal(validateSets([blk({}, [row({ weight: '800' })])], 'kg')[0].severity, 'warn');
  assert.equal(validateSets([blk({}, [row({ weight: '800' })])], 'lb').length, 0); // 800 lb is ~363 kg: plausible
  assert.equal(validateSets([blk({}, [row({ done: false, weight: '' })])], 'kg').length, 0); // unticked is ignored
  assert.equal(validateSets([blk({}, [row({ warmup: true, weight: '' })])], 'kg').length, 0);
});

test('stepValue: nudges without float noise, clamps at zero, tolerates junk', () => {
  assert.equal(stepValue('80', 2.5), '82.5');
  assert.equal(stepValue('82.5', -2.5), '80');
  assert.equal(stepValue('0.1', 0.2), '0.3');
  assert.equal(stepValue('1', -2.5), '0');
  assert.equal(stepValue('', 5), '5');
  assert.equal(stepValue('abc', 1), '1');
  assert.equal(stepValue('7', 1, 0, 0), '8');
  assert.equal(stepValue('0', -1, 0, 0), '0');
});

import { formatLast, lastSessions } from '../src/lib/last';

test('last session: groups equal weights, handles bodyweight and units, picks the newest session in set order', () => {
  assert.equal(formatLast([{ weight: 82.5, reps: 8 }, { weight: 82.5, reps: 8 }, { weight: 80, reps: 7 }], 'kg'), 'Last: 82.5 × 8, 8 · 80 × 7 kg');
  assert.equal(formatLast([{ weight: 0, reps: 10 }, { weight: 0, reps: 9 }], 'kg'), 'Last: bodyweight × 10, 9');
  assert.equal(formatLast([{ weight: 100, reps: 5 }], 'lb'), 'Last: 220.5 × 5 lb');
  assert.equal(formatLast([], 'kg'), '');
  assert.equal(formatLast(undefined, 'kg'), '');
  const h = [
    { exerciseId: 'a', weight: 50, reps: 10, at: 1, id: 1 },
    { exerciseId: 'a', weight: 60, reps: 9, at: 2, id: 9 },
    { exerciseId: 'a', weight: 60, reps: 8, at: 2, id: 4 },
    { exerciseId: 'b', weight: 20, reps: 12, at: 3, id: 7 },
  ];
  const m = lastSessions(h, new Set(['a']));
  assert.deepEqual(m.get('a')!.map((s) => s.reps), [8, 9]); // newest session only, ordered by row id
  assert.equal(m.has('b'), false);
});

import { buildSummary, nextSetLabel, sessionProgress } from '../src/lib/summary';

const srow = (o: Partial<Block['rows'][0]> = {}) => ({ weight: '80', reps: '8', rir: '', done: false, warmup: false, ...o });
const sblock = (name: string, rows: Block['rows'], id = name) => ({
  exerciseId: id, name, muscle: 'chest', compound: true, barbell: true, weighted: true, repMin: 5, repMax: 8, target: '', rows,
}) as Block;

test('summary: progress counts working sets only', () => {
  const b = [sblock('Bench', [srow({ warmup: true, done: true }), srow({ done: true }), srow(), srow()]), sblock('Row', [srow({ done: true })])];
  assert.deepEqual(sessionProgress(b), { done: 2, total: 4 });
  assert.deepEqual(sessionProgress([]), { done: 0, total: 0 });
});

test('summary: next set label names exercise, set number and target', () => {
  const b = [sblock('Bench', [srow({ done: true }), srow({ weight: '82.5', reps: '6' }), srow()]), sblock('Row', [srow({ weight: '', reps: '10' })])];
  assert.equal(nextSetLabel(b, 'kg'), 'Bench · set 2 · 82.5 kg × 6');
  b[0].rows.forEach((r) => (r.done = true));
  assert.equal(nextSetLabel(b, 'kg'), 'Row · set 1 · 10 reps'); // bodyweight-style row: no weight shown
  b[1].rows[0].done = true;
  assert.equal(nextSetLabel(b, 'kg'), null);
  assert.equal(nextSetLabel([sblock('Squat', [srow({ warmup: true, weight: '40', reps: '5' }), srow()])], 'lb'), 'Squat · warm-up · 40 lb × 5');
});

test('summary: totals count ticked working sets, ignore warm-ups and zero-rep rows', () => {
  const b = [sblock('Bench', [srow({ warmup: true, done: true, weight: '40' }), srow({ done: true }), srow({ done: true, weight: '82.5', reps: '6' }), srow({ done: true, reps: '0' }), srow()]), sblock('Row', [srow()])];
  const s = buildSummary({ blocks: b, unit: 'kg', startedAt: 0, now: 52 * 60000 + 20000, prs: [{ exerciseId: 'Bench', kinds: ['e1rm'], best: { count: 1, e1rm: 0, weight: 0, reps: 0 } }], title: 'Push done', next: 'Pull' });
  assert.equal(s.sets, 2);
  assert.equal(s.exercises, 1);
  assert.equal(s.volume, 80 * 8 + 82.5 * 6); // 1135
  assert.equal(s.minutes, 52);
  assert.deepEqual(s.prs, [{ name: 'Bench', kinds: ['e1rm'] }]);
  assert.equal(buildSummary({ blocks: b, unit: 'kg', startedAt: 10, now: 0, prs: [], title: '', next: null }).minutes, 0); // clock skew can't go negative
});

import { followOffset } from '../src/lib/follow';
import { stepFor } from '../src/lib/units';

test('step follows how the equipment is loaded, in the unit on screen', () => {
  assert.equal(stepFor('barbell', 'kg'), 2.5);
  assert.equal(stepFor('dumbbell', 'kg'), 2);
  assert.equal(stepFor('machine', 'kg'), 5);
  assert.equal(stepFor('machine', 'lb'), 10);
  assert.equal(stepFor('bodyweight', 'kg'), 2.5); // falls back to the default
  assert.equal(stepFor('bands', 'lb'), 5);
});

test('draft: a block keeps its step, and drafts without one still load', () => {
  const withStep = parseDraft({ v: 1, blocks: [{ exerciseId: 'a', step: 5, rows: [{}] }] })!;
  assert.equal(withStep.blocks[0].step, 5);
  const old = parseDraft({ v: 1, blocks: [{ exerciseId: 'a', rows: [{}] }] })!;
  assert.equal(old.blocks[0].step, undefined);
  assert.equal(parseDraft({ v: 1, blocks: [{ exerciseId: 'a', step: -3, rows: [{}] }] })!.blocks[0].step, undefined);
});

test('follow: scrolls only when the row would leave the usable area', () => {
  const base = { height: 116, offset: 1000, view: 700, bottomPad: 150 };
  assert.equal(followOffset({ ...base, top: 1200 }), null); // comfortably visible
  assert.equal(followOffset({ ...base, top: 1450 }), 1310); // row bottom 1566 > 1550: hidden under the rest bar
  assert.equal(followOffset({ ...base, top: 1550 }), 1410); // below the fold
  assert.equal(followOffset({ ...base, top: 900 }), 760);   // above the fold
  assert.equal(followOffset({ ...base, top: 60, offset: 0 }), null);
  assert.equal(followOffset({ ...base, top: 100, offset: 500 }), 0); // never negative
});

test('suggest another: a higher variant changes the workout, variant 0 matches the default, same inputs repeat', () => {
  const base = { equipment: ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight'] as ProgramOptions['equipment'], history: [], now: 1_000_000 };
  const ids = (v?: number) => generateWorkout({ ...base, variant: v }).map((p) => p.exercise.id).join(',');
  assert.equal(ids(0), ids(undefined));
  assert.equal(ids(1), ids(1));
  assert.notEqual(ids(1), ids(0));
  assert.notEqual(ids(2), ids(1));
});

import { axisLabel, compact, duration, personalBests, shortDate, startOfWeek, totals, weekStrip, weeklyCounts } from '../src/lib/report';

// A fixed "now": Friday 23 Oct 2026, 15:00 local.
const NOW = new Date(2026, 9, 23, 15, 0, 0).getTime();
const at = (y: number, m: number, d: number, h = 10) => new Date(y, m, d, h, 0, 0).getTime();

test('report: weeks start on Monday and the chart ends with the current week', () => {
  assert.equal(startOfWeek(NOW).getDate(), 19); // Monday 19 Oct
  assert.equal(startOfWeek(at(2026, 9, 18)).getDate(), 12); // Sunday 18 Oct belongs to the week of Mon 12
  const bins = weeklyCounts([{ started_at: at(2026, 9, 19) }, { started_at: at(2026, 9, 23) }, { started_at: at(2026, 9, 13) }, { started_at: at(2025, 0, 1) }], 4, NOW);
  assert.equal(bins.length, 4);
  assert.deepEqual(bins.map((b) => b.count), [0, 0, 1, 2]); // too-old workout ignored
  assert.equal(bins[3].current, true);
  assert.equal(bins.filter((b) => b.current).length, 1);
  assert.deepEqual(axisLabel(bins[3].start), { day: '19', month: 'OCT' });
});

test('report: totals cap runaway sessions; compact and duration read cleanly', () => {
  const t = totals([
    { started_at: 0, finished_at: 50 * 60000, volume: 1000 },
    { started_at: 0, finished_at: 9 * 3600_000, volume: 500 }, // left open for 9 hours
    { started_at: 100, finished_at: 50, volume: 0 }, // clock skew
  ]);
  assert.deepEqual(t, { workouts: 3, minutes: 350, volumeKg: 1500 });
  assert.equal(compact(950), '950'); assert.equal(compact(1500), '1.5k'); assert.equal(compact(12400), '12.4k');
  assert.equal(compact(1940000), '1.94M'); assert.equal(compact(2000000), '2M'); assert.equal(compact(0), '0');
  assert.equal(duration(42), '42 min'); assert.equal(duration(125), '2h 5m'); assert.equal(duration(120), '2h');
});

test('report: week strip marks done days and today', () => {
  const strip = weekStrip([{ started_at: at(2026, 9, 19) }, { started_at: at(2026, 9, 21) }], NOW);
  assert.equal(strip.length, 7);
  assert.deepEqual(strip.map((d) => d.date), [19, 20, 21, 22, 23, 24, 25]);
  assert.deepEqual(strip.map((d) => d.letter), ['M', 'T', 'W', 'T', 'F', 'S', 'S']);
  assert.deepEqual(strip.map((d) => d.done), [true, false, true, false, false, false, false]);
  assert.deepEqual(strip.map((d) => d.today), [false, false, false, false, true, false, false]);
});

test('report: personal bests pick the best set per exercise, newest record first; ties keep the first', () => {
  const pb = personalBests([
    { exerciseId: 'bench', weight: 100, reps: 5, at: 1 },
    { exerciseId: 'bench', weight: 100, reps: 5, at: 9 }, // same again: not a new record
    { exerciseId: 'bench', weight: 90, reps: 8, at: 5 },  // est. 114 is below 100x5 (est. 116.7): not a record
    { exerciseId: 'squat', weight: 140, reps: 3, at: 7 },
    { exerciseId: 'pushup', weight: 0, reps: 20, at: 8 },
    { exerciseId: 'pushup', weight: 0, reps: 25, at: 3 },
  ]);
  // Newest record first: squat (set at 7), pushup (its best, 25 reps, at 3), bench (first 100x5, at 1).
  assert.deepEqual(pb.map((p) => p.exerciseId), ['squat', 'pushup', 'bench']);
  assert.equal(pb.find((p) => p.exerciseId === 'bench')!.at, 1);
  assert.equal(pb.find((p) => p.exerciseId === 'pushup')!.reps, 25);
});

test('report: dates format without locale support', () => {
  assert.equal(shortDate(at(2026, 9, 23)), 'Fri, Oct 23');
  assert.equal(shortDate(at(2026, 0, 5)), 'Mon, Jan 5');
});

import { formatElapsed } from '../src/lib/report';

test('session clock formats minutes and hours, and never goes negative', () => {
  assert.equal(formatElapsed(0), '00:00');
  assert.equal(formatElapsed(754_000), '12:34');
  assert.equal(formatElapsed(59_999), '00:59');
  assert.equal(formatElapsed(3_725_000), '1:02:05');
  assert.equal(formatElapsed(-5000), '00:00'); // clock skew
});

import { propagateWeight } from '../src/lib/draft';

test('weight autofill: carries a weight down to open, empty or matching later sets only', () => {
  const r = (weight: string, o: Partial<Block['rows'][0]> = {}) => ({ weight, reps: '8', rir: '', done: false, warmup: false, ...o });
  // First weight typed on a fresh exercise fills every empty set below it.
  let rows = propagateWeight([r(''), r(''), r('')], 0, '60');
  assert.deepEqual(rows.map((x) => x.weight), ['60', '60', '60']);
  // Keystroke by keystroke: "6" then "60" keeps following, because the later sets still hold the old value.
  rows = propagateWeight(propagateWeight([r(''), r(''), r('')], 0, '6'), 0, '60');
  assert.deepEqual(rows.map((x) => x.weight), ['60', '60', '60']);
  // A deliberate back-off weight on a later set is preserved.
  rows = propagateWeight([r('60'), r('60'), r('50')], 0, '65');
  assert.deepEqual(rows.map((x) => x.weight), ['65', '65', '50']);
  // Sets above the edited one and finished sets never change.
  rows = propagateWeight([r('60'), r('60', { done: true }), r('60')], 0, '62.5');
  assert.deepEqual(rows.map((x) => x.weight), ['62.5', '60', '62.5']);
  rows = propagateWeight([r('60'), r('60'), r('60')], 1, '65');
  assert.deepEqual(rows.map((x) => x.weight), ['60', '65', '65']);
  // Warm-ups neither start a carry nor receive one.
  rows = propagateWeight([r('40', { warmup: true }), r('', { warmup: true }), r('')], 0, '45');
  assert.deepEqual(rows.map((x) => x.weight), ['40', '', '']);
  rows = propagateWeight([r(''), r('', { warmup: true }), r('')], 0, '80');
  assert.deepEqual(rows.map((x) => x.weight), ['80', '', '80']);
  assert.equal(propagateWeight([r('1')], 5, '2').length, 1); // out of range is harmless
});

import { addDays, dayLabel, toIso } from '../src/lib/dates';
import { foodKey, quickList, validateFood } from '../src/lib/foods';

test('dates: calendar arithmetic and friendly labels', () => {
  assert.equal(addDays('2026-10-23', 1), '2026-10-24');
  assert.equal(addDays('2026-10-31', 1), '2026-11-01');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  assert.equal(addDays('2024-03-01', -1), '2024-02-29'); // leap year
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(toIso(new Date(2026, 0, 5)), '2026-01-05');
  assert.equal(dayLabel('2026-10-23', '2026-10-23'), 'Today');
  assert.equal(dayLabel('2026-10-22', '2026-10-23'), 'Yesterday');
  assert.equal(dayLabel('2026-10-24', '2026-10-23'), 'Tomorrow');
  assert.equal(dayLabel('2026-10-21', '2026-10-23'), 'Wed, Oct 21');
});

test('foods: quick list puts favorites first and never repeats a food', () => {
  const oats = { name: 'Oats', kcal: 300, protein: 10, carbs: 50, fat: 6 };
  const egg = { name: 'Egg', kcal: 70, protein: 6, carbs: 0, fat: 5 };
  const rice = { name: 'Rice', kcal: 200, protein: 4, carbs: 44, fat: 0 };
  const list = quickList([egg], [oats, { ...egg, name: ' EGG ' }, rice, oats]);
  assert.deepEqual(list.map((q) => q.item.name), ['Egg', 'Oats', 'Rice']);
  assert.deepEqual(list.map((q) => q.favorite), [true, false, false]);
  assert.equal(quickList([], [oats, egg, rice], 2).length, 2);
  assert.equal(foodKey(egg), foodKey({ ...egg, name: '  egg' }));
});

test('foods: validation names the problem and keeps macros optional', () => {
  const ok = { name: ' Oats ', kcal: '300', protein: '', carbs: '50', fat: '' };
  assert.deepEqual(validateFood(ok), { value: { name: 'Oats', kcal: 300, protein: 0, carbs: 50, fat: 0 } });
  assert.match((validateFood({ ...ok, name: ' ' }) as { error: string }).error, /Name the food/);
  assert.match((validateFood({ ...ok, kcal: '' }) as { error: string }).error, /Enter the calories/);
  assert.match((validateFood({ ...ok, kcal: '-5' }) as { error: string }).error, /0 or more/);
  assert.match((validateFood({ ...ok, kcal: '9000' }) as { error: string }).error, /5,000/);
  assert.match((validateFood({ ...ok, protein: '900' }) as { error: string }).error, /Protein looks too high/);
  assert.match((validateFood({ ...ok, carbs: 'abc' }) as { error: string }).error, /Carbs must be a number/);
});

import { cmToFtIn, ftInToCm } from '../src/lib/units';
test('height converts between cm and feet/inches', () => {
  assert.deepEqual(cmToFtIn(180), { ft: 5, inch: 11 });
  assert.deepEqual(cmToFtIn(152.4), { ft: 5, inch: 0 });
  assert.equal(ftInToCm(6, 0), 183);
  assert.equal(ftInToCm(5, 11), 180);
});

import { levelOpacity, volumeLevels, weeklyMuscleSets } from '../src/lib/body';
test('weekly muscle sets count primary fully, secondary half, and ignore old sets', () => {
  const cat = [{ id: 'bench', muscle: 'chest' as const, secondary: ['triceps' as const, 'shoulders' as const] }, { id: 'curl', muscle: 'biceps' as const }];
  const sets = weeklyMuscleSets(
    [{ exerciseId: 'bench', at: 10 }, { exerciseId: 'bench', at: 11 }, { exerciseId: 'curl', at: 12 }, { exerciseId: 'bench', at: 1 }, { exerciseId: 'gone', at: 12 }],
    5, cat,
  );
  assert.deepEqual(sets, { chest: 2, triceps: 1, shoulders: 1, biceps: 1 });
  assert.deepEqual(volumeLevels(sets), { chest: 1, triceps: 0.5, shoulders: 0.5, biceps: 0.5 });
  assert.deepEqual(volumeLevels({}), {});
});
test('level opacity hides zero and stays visible for any work', () => {
  assert.equal(levelOpacity(0), 0);
  assert.equal(levelOpacity(undefined), 0);
  assert.ok(levelOpacity(0.01) > 0.25);
  assert.equal(levelOpacity(2), 1);
});

import { bodyData, levelStep, mixHex } from '../src/lib/body';
test('body shading maps levels to steps and regions', () => {
  assert.equal(levelStep(0), 0);
  assert.equal(levelStep(0.01), 1);
  assert.equal(levelStep(1), 4);
  assert.equal(levelStep(0.5), 2);
  assert.deepEqual(bodyData({ core: 1, calves: 0.3 }), [
    { slug: 'abs', intensity: 4 }, { slug: 'obliques', intensity: 4 }, { slug: 'calves', intensity: 2 },
  ]);
  assert.equal(mixHex('#000000', '#FFFFFF', 0.5), '#808080');
  assert.equal(mixHex('#2196F3', '#2196F3', 0.3), '#2196F3');
});

import { effortFor, readableOn } from '../src/lib/effort';
test('effort comes from reps in reserve and ignores empty or odd input', () => {
  assert.equal(effortFor(''), null);
  assert.equal(effortFor('x'), null);
  assert.deepEqual(effortFor('0'), { level: 4, word: 'all-out' });
  assert.equal(effortFor('2')?.level, 2);
  assert.equal(effortFor('5')?.level, 0);
});
test('readable text color flips with the fill', () => {
  assert.equal(readableOn('#E3F2FD'), '#0A2A52');
  assert.equal(readableOn('#0D47A1'), '#FFFFFF');
  assert.equal(readableOn('#BBDEFB'), '#0A2A52');
  assert.equal(readableOn('#12335F'), '#FFFFFF');
});

import { FIVE_NINE } from '../src/lib/programs';
test('5-9 rep scheme gives every exercise 2 sets of 5-9 reps to failure', () => {
  const p = generateProgram({ goal: 'hypertrophy', daysPerWeek: 5, experience: 'intermediate', minutesPerSession: 75, equipment: ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight'], catalog: LIBRARY, repScheme: '5-9' });
  assert.equal(p.name, '5-Day 5–9 Reps');
  const items = p.days.flatMap((d) => d.items);
  assert.ok(items.length > 20);
  for (const it of items) {
    assert.deepEqual([it.repMin, it.repMax], FIVE_NINE);
    assert.equal(it.rir, 0);
    assert.ok(it.sets >= 1 && it.sets <= 2);
  }
  assert.ok(items.filter((it) => it.sets === 2).length > items.length / 2);
});
test('weight goes up only once every top set reaches 9 reps', () => {
  const at = 1000;
  const sets = (reps: number[]) => reps.map((r) => ({ exerciseId: 'x', weight: 50, reps: r, at }));
  assert.equal(suggestWeight('x', sets([9, 9]), 2.5, 9), 52.5);
  assert.equal(suggestWeight('x', sets([9, 8]), 2.5, 9), 50);
});

import { draftsFrom, problemsIn, type PersonalData } from '../src/lib/personal';
import personalData from '../src/data/personalPrograms.json';
test('saved personal programs reference real library ids and sane sets and reps', () => {
  const d = personalData as unknown as PersonalData;
  const ids = new Set(LIBRARY.map((x) => x.id));
  assert.deepEqual(problemsIn(d, ids), []); // the public file is empty; with private programs installed this checks them too
});
test('drafts take their exercise ids from the key map', () => {
  const d: PersonalData = {
    source: 'test',
    exercises: { a: { name: 'A', libraryId: null, muscle: 'chest', equipment: 'machine', compound: true } },
    programs: [{ name: 'P', note: '', goal: 'hypertrophy', days: [{ name: 'D', items: [{ ex: 'a', sets: 2, repMin: 5, repMax: 9, rir: 0 }] }] }],
  };
  assert.deepEqual(draftsFrom(d, { a: 'custom-7' })[0].days[0].items[0], { exerciseId: 'custom-7', sets: 2, repMin: 5, repMax: 9, rir: 0, rest: null });
  assert.deepEqual(problemsIn({ ...d, programs: [{ ...d.programs[0], days: [{ name: 'D', items: [{ ex: 'zzz', sets: 0, repMin: 9, repMax: 5, rir: 0 }] }] }] }, new Set()).length, 3);
});

import { cleanRest, clampRest, formatRest, stepRest } from '../src/lib/rest';

test('rest helpers format, step within limits and ignore junk', () => {
  assert.equal(formatRest(150), '2:30');
  assert.equal(formatRest(0), '0:00');
  assert.equal(formatRest(65), '1:05');
  assert.equal(stepRest(120, 'sec', 1), 125);
  assert.equal(stepRest(120, 'min', -1), 60);
  assert.equal(stepRest(0, 'sec', -1), 0);
  assert.equal(stepRest(900, 'min', 1), 900);
  assert.equal(clampRest(-5), 0);
  assert.equal(cleanRest('x'), undefined);
  assert.equal(cleanRest(-1), undefined);
  assert.equal(cleanRest(90), 90);
});
test('a custom rest beats the default except after warm-ups', () => {
  const o = { compound: true, compoundRest: 120, isolationRest: 75 };
  assert.equal(restSeconds({ ...o, warmup: false }), 120);
  assert.equal(restSeconds({ ...o, warmup: false, override: 45 }), 45);
  assert.equal(restSeconds({ ...o, warmup: false, override: 0 }), 0);
  assert.equal(restSeconds({ ...o, warmup: true, override: 200 }), 45);
});

test('hard-2 scheme builds an upper/lower split with two hard sets per exercise', () => {
  const p = generateProgram({ goal: 'hypertrophy', daysPerWeek: 5, experience: 'intermediate', minutesPerSession: 75, equipment: ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight'], catalog: LIBRARY, repScheme: 'hard-2' });
  assert.deepEqual(p.days.map((d) => d.name.replace(/ [A-Z]$/, '')), ['Upper', 'Lower', 'Upper', 'Lower', 'Upper']);
  assert.equal(p.name, '5-Day Hard Sets');
  const items = p.days.flatMap((d) => d.items);
  assert.ok(items.every((it) => it.sets <= 2 && it.rir <= 1));
  assert.ok(items.some((it) => it.repMin === 6 && it.repMax === 10) && items.some((it) => it.repMin === 10 && it.repMax === 15));
});
