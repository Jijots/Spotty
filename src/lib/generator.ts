// Fitbod-style workout generator: choose muscles that have recovered, pick
// exercises for the equipment you have, and prescribe loads via double progression.

import { LIBRARY, type Equipment, type Exercise, type Muscle, MUSCLES } from '../data/exercises';

const HOUR = 3600 * 1000;
/** Hours a muscle needs before it counts as fully recovered. */
export const RECOVERY_HOURS = 60;
export const REP_RANGE: [number, number] = [8, 12];

export interface PastSet {
  id?: number; // row order within a session
  exerciseId: string;
  weight: number;
  reps: number;
  rir?: number | null;
  at: number; // epoch ms of the workout
}

export interface PlannedExercise {
  exercise: Exercise;
  sets: number;
  repRange: [number, number];
  suggestedWeight: number;
}

export interface GeneratorOptions {
  equipment: Equipment[];
  history: PastSet[];
  now?: number;
  exerciseCount?: number; // default 6
  /** 0 = the usual pick; each higher number rotates to the next-best exercise, so "suggest another" really differs. */
  variant?: number;
  weightStep?: number; // kg, default 2.5
  /** Every known exercise incl. custom ones. Defaults to the bundled library. */
  catalog?: Exercise[];
}

/** 0 = just trained, 1 = fully recovered. */
export function recovery(history: PastSet[], now: number, catalog: Exercise[] = LIBRARY): Record<Muscle, number> {
  const byEx = new Map(catalog.map((x) => [x.id, x]));
  const last: Partial<Record<Muscle, number>> = {};
  for (const s of history) {
    const m = byEx.get(s.exerciseId)?.muscle;
    if (m && (last[m] == null || s.at > (last[m] as number))) last[m] = s.at;
  }
  const out = {} as Record<Muscle, number>;
  for (const m of MUSCLES) {
    out[m] = last[m] == null ? 1 : Math.min((now - (last[m] as number)) / (RECOVERY_HOURS * HOUR), 1);
  }
  return out;
}

/** Double progression: hit the top of the rep range on every set, then add weight. */
export function suggestWeight(exerciseId: string, history: PastSet[], step = 2.5, topReps = REP_RANGE[1]): number {
  const mine = history.filter((s) => s.exerciseId === exerciseId);
  if (!mine.length) return 0;
  const lastAt = Math.max(...mine.map((s) => s.at));
  const lastSets = mine.filter((s) => s.at === lastAt);
  const weight = Math.max(...lastSets.map((s) => s.weight));
  const working = lastSets.filter((s) => s.weight === weight);
  const allTop = working.every((s) => s.reps >= topReps);
  return allTop ? weight + step : weight;
}

export function generateWorkout(opts: GeneratorOptions): PlannedExercise[] {
  const now = opts.now ?? Date.now();
  const count = opts.exerciseCount ?? 6;
  const catalog = opts.catalog ?? LIBRARY;
  const rec = recovery(opts.history, now, catalog);
  const usable = catalog.filter((x) => (x.staple || x.custom) && opts.equipment.includes(x.equipment));

  // Train the most recovered muscles that we actually have equipment for.
  const muscles = MUSCLES.filter((m) => usable.some((x) => x.muscle === m))
    .sort((a, b) => rec[b] - rec[a])
    .filter((m) => rec[m] >= 0.5);
  const focus = muscles.slice(0, Math.max(2, Math.ceil(count / 2)));
  if (!focus.length) return [];

  const used = new Set<string>();
  const plan: PlannedExercise[] = [];
  const add = (x: Exercise, sets: number) => {
    used.add(x.id);
    plan.push({
      exercise: x,
      sets,
      repRange: REP_RANGE,
      suggestedWeight: suggestWeight(x.id, opts.history, opts.weightStep ?? 2.5),
    });
  };

  // Rotate exercises: prefer ones not done recently so sessions don't repeat.
  const lastDone = (id: string) =>
    Math.max(0, ...opts.history.filter((s) => s.exerciseId === id).map((s) => s.at));

  // Pass 1: one compound per focus muscle, pass 2+: fill with isolation, then more compounds.
  const pick = (muscle: Muscle, compound: boolean) => {
    const options = usable
      .filter((x) => x.muscle === muscle && x.compound === compound && !used.has(x.id))
      .sort((a, b) => lastDone(a.id) - lastDone(b.id));
    return options[(opts.variant ?? 0) % Math.max(options.length, 1)];
  };

  for (const m of focus) {
    if (plan.length >= count) break;
    const x = pick(m, true) ?? pick(m, false);
    if (x) add(x, x.compound ? 4 : 3);
  }
  for (let round = 0; plan.length < count && round < 4; round++) {
    let added = false;
    for (const m of focus) {
      if (plan.length >= count) break;
      const x = pick(m, false) ?? pick(m, true);
      if (x) { add(x, 3); added = true; }
    }
    if (!added) break;
  }
  return plan;
}

export { e1rm } from './records';
