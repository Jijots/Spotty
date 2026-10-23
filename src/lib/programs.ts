// Rule-based program generator. No network, no account: it turns a handful of
// factors (goal, days, experience, time, equipment, weak points) into a split with
// per-muscle weekly volume, exercise selection, rep ranges and target RIR.

import type { Equipment, Exercise, Muscle } from '../data/exercises';

export type Goal = 'strength' | 'hypertrophy' | 'both';
export type Experience = 'beginner' | 'intermediate' | 'advanced';

export interface ProgramItem {
  exerciseId: string;
  sets: number;
  repMin: number;
  repMax: number;
  rir: number;
  /** Seconds of rest after each working set; null or absent uses the default for the lift. */
  rest?: number | null;
}
export interface ProgramDay { name: string; items: ProgramItem[] }
export interface ProgramDraft { name: string; goal: Goal | 'custom'; days: ProgramDay[] }

export interface ProgramOptions {
  goal: Goal;
  daysPerWeek: 2 | 3 | 4 | 5 | 6;
  experience: Experience;
  minutesPerSession: number;
  equipment: Equipment[];
  /** Muscles to emphasise (about +30% weekly sets). */
  priority?: Muscle[];
  catalog: Exercise[];
  /** Changes which exercise variants get picked; same inputs + same seed = same program. */
  seed?: number;
  name?: string;
  /** '5-9': every exercise gets 2 sets of 5-9 reps taken to failure (RIR 0); weight goes up once all sets reach 9. */
  repScheme?: RepScheme;
}

/** 'hard-2': an upper/lower split with two hard sets per exercise, heavier for compounds and taken to failure on isolation work. */
export type RepScheme = 'standard' | '5-9' | 'hard-2';

/** High-frequency upper/lower days: every muscle twice a week or more, with few sets each time. */
export function upperLowerSplit(days: number): ('Upper' | 'Lower')[] {
  const pattern: ('Upper' | 'Lower')[] = ['Upper', 'Lower', 'Upper', 'Lower', 'Upper', 'Lower'];
  return pattern.slice(0, Math.min(Math.max(days, 2), 6));
}
export const FIVE_NINE: [number, number] = [5, 9];

type DayKind = 'Full Body' | 'Upper' | 'Lower' | 'Push' | 'Pull' | 'Legs';

const DAY_MUSCLES: Record<DayKind, Muscle[]> = {
  'Full Body': ['chest', 'back', 'quads', 'hamstrings', 'shoulders', 'triceps', 'biceps', 'calves', 'core'],
  Upper: ['chest', 'back', 'shoulders', 'biceps', 'triceps'],
  Lower: ['quads', 'hamstrings', 'glutes', 'calves', 'core'],
  Push: ['chest', 'shoulders', 'triceps'],
  Pull: ['back', 'biceps'],
  Legs: ['quads', 'hamstrings', 'glutes', 'calves', 'core'],
};

export function splitFor(days: number, experience: Experience): DayKind[] {
  switch (days) {
    case 2: return ['Full Body', 'Full Body'];
    case 3: return experience === 'beginner' ? ['Full Body', 'Full Body', 'Full Body'] : ['Push', 'Pull', 'Legs'];
    case 4: return ['Upper', 'Lower', 'Upper', 'Lower'];
    case 5: return ['Upper', 'Lower', 'Push', 'Pull', 'Legs'];
    default: return ['Push', 'Pull', 'Legs', 'Push', 'Pull', 'Legs'];
  }
}

/** Baseline hard sets per week for an intermediate lifter. */
const WEEKLY_SETS: Record<Muscle, number> = {
  chest: 12, back: 14, shoulders: 12, quads: 12, hamstrings: 10, glutes: 8,
  biceps: 8, triceps: 8, calves: 6, core: 6, forearms: 0,
};
const BIG: Muscle[] = ['chest', 'back', 'quads', 'hamstrings', 'shoulders', 'glutes'];
const SMALL_FOR_STRENGTH: Muscle[] = ['biceps', 'triceps', 'calves', 'core', 'shoulders'];
const EXPERIENCE_FACTOR: Record<Experience, number> = { beginner: 0.7, intermediate: 1, advanced: 1.25 };
const SECONDS_PER_SET = 150; // work + rest

/** Libraries tag the deadlift as "back", but programmers file it under the hinge (lower) days. */
const HINGES = ['Barbell_Deadlift'];
const HINGE_DAYS: DayKind[] = ['Full Body', 'Lower', 'Legs'];

const REPS: Record<Goal, { compound: [number, number]; isolation: [number, number] }> = {
  strength: { compound: [3, 6], isolation: [8, 12] },
  hypertrophy: { compound: [6, 10], isolation: [10, 15] },
  both: { compound: [5, 8], isolation: [8, 12] },
};

export function weeklyTargets(o: Pick<ProgramOptions, 'goal' | 'experience' | 'priority'>): Record<Muscle, number> {
  const out = {} as Record<Muscle, number>;
  for (const m of Object.keys(WEEKLY_SETS) as Muscle[]) {
    let v = WEEKLY_SETS[m] * EXPERIENCE_FACTOR[o.experience];
    if (o.goal === 'strength' && SMALL_FOR_STRENGTH.includes(m)) v *= 0.7;
    if (o.priority?.includes(m)) v *= 1.3;
    out[m] = Math.round(v);
  }
  return out;
}

interface Slot { ex: Exercise; sets: number }

export function generateProgram(o: ProgramOptions): ProgramDraft {
  const kinds: DayKind[] = o.repScheme === 'hard-2' ? upperLowerSplit(o.daysPerWeek) : splitFor(o.daysPerWeek, o.experience);
  const target = weeklyTargets(o);
  const seed = o.seed ?? 0;

  const freq: Partial<Record<Muscle, number>> = {};
  for (const k of kinds) for (const m of DAY_MUSCLES[k]) freq[m] = (freq[m] ?? 0) + 1;

  const pool = (m: Muscle, kind: DayKind) =>
    o.catalog.filter((x) => {
      if (!(x.staple || x.custom) || !o.equipment.includes(x.equipment)) return false;
      if (HINGES.includes(x.id)) return m === 'hamstrings' && HINGE_DAYS.includes(kind);
      return x.muscle === m;
    });

  const seen: Partial<Record<DayKind, number>> = {};
  const seenMuscle: Partial<Record<Muscle, number>> = {};
  const total: Partial<Record<DayKind, number>> = {};
  for (const k of kinds) total[k] = (total[k] ?? 0) + 1;

  const cap = Math.max(8, Math.floor((o.minutesPerSession * 60) / SECONDS_PER_SET));
  const reps = REPS[o.goal];

  const days: ProgramDay[] = kinds.map((kind) => {
    const n = (seen[kind] = (seen[kind] ?? 0) + 1);
    const used = new Set<string>();
    const slots: Slot[] = [];

    for (const m of DAY_MUSCLES[kind]) {
      const f = freq[m] ?? 1;
      const weekly = target[m];
      if (!weekly) continue;
      const k = (seenMuscle[m] = (seenMuscle[m] ?? 0) + 1) - 1; // 0-based occurrence this week
      const perDay = Math.min(Math.max(Math.round(weekly / f), 2), 8);
      const fiveNine = o.repScheme === '5-9' || o.repScheme === 'hard-2';
      // 5-9 style spreads a muscle's sets over more exercises, two sets each, instead of a few longer ones.
      const count = fiveNine ? Math.min(Math.ceil(perDay / 2), 4) : perDay <= 4 ? 1 : perDay <= 8 ? 2 : 3;
      const p = pool(m, kind);
      if (!p.length) continue;

      const base = fiveNine ? 2 : Math.floor(perDay / count);
      let rem = fiveNine ? 0 : perDay - base * count;
      for (let j = 0; j < count; j++) {
        // Back gets a row *and* a vertical pull, so its second slot is a compound too.
        const wantCompound = BIG.includes(m) && (j === 0 || (m === 'back' && j === 1));
        const fresh = p.filter((x) => !used.has(x.id));
        if (!fresh.length) break;
        let cands = fresh.filter((x) => x.compound === wantCompound);
        if (!cands.length) cands = fresh;
        const ex = cands[(k + seed + j) % cands.length];
        used.add(ex.id);
        slots.push({ ex, sets: base + (rem-- > 0 ? 1 : 0) });
      }
    }

    // Respect the time budget: trim isolation volume first, then drop thin isolation work,
    // and only then touch compounds.
    const sum = () => slots.reduce((s, x) => s + x.sets, 0);
    while (sum() > cap) {
      const iso = slots.filter((s) => !s.ex.compound);
      const trimIso = iso.filter((s) => s.sets > 2).sort((a, b) => b.sets - a.sets)[0];
      if (trimIso) { trimIso.sets--; continue; }
      const dropIso = iso.sort((a, b) => a.sets - b.sets)[0];
      if (dropIso) { slots.splice(slots.indexOf(dropIso), 1); continue; }
      const trimComp = slots.filter((s) => s.sets > 2).sort((a, b) => b.sets - a.sets)[0];
      if (!trimComp) break;
      trimComp.sets--;
    }

    slots.sort((a, b) => Number(b.ex.compound) - Number(a.ex.compound));

    const suffix = total[kind]! > 1 ? ` ${String.fromCharCode(64 + n)}` : '';
    return {
      name: `${kind}${suffix}`,
      items: slots.map(({ ex, sets }) => {
        if (o.repScheme === 'hard-2') return { exerciseId: ex.id, sets, repMin: ex.compound ? 6 : 10, repMax: ex.compound ? 10 : 15, rir: ex.compound ? 1 : 0 };
        if (o.repScheme === '5-9') return { exerciseId: ex.id, sets, repMin: FIVE_NINE[0], repMax: FIVE_NINE[1], rir: 0 };
        const [repMin, repMax] = ex.compound ? reps.compound : reps.isolation;
        const rir = o.experience === 'beginner' ? 3 : ex.compound ? 2 : 1;
        return { exerciseId: ex.id, sets, repMin, repMax, rir };
      }),
    };
  });

  const goalLabel = { strength: 'Strength', hypertrophy: 'Muscle', both: 'Strength + Muscle' }[o.goal];
  const label = o.repScheme === '5-9' ? '5–9 Reps' : o.repScheme === 'hard-2' ? 'Hard Sets' : goalLabel;
  return { name: o.name?.trim() || `${o.daysPerWeek}-Day ${label}`, goal: o.goal, days };
}

/** Hard sets per muscle per week, for showing a volume summary. */
export function weeklyVolume(draft: ProgramDraft, catalog: Exercise[]): Partial<Record<Muscle, number>> {
  const byId = new Map(catalog.map((x) => [x.id, x]));
  const out: Partial<Record<Muscle, number>> = {};
  for (const d of draft.days) {
    for (const it of d.items) {
      const m = byId.get(it.exerciseId)?.muscle;
      if (m) out[m] = (out[m] ?? 0) + it.sets;
    }
  }
  return out;
}
