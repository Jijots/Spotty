import type { Equipment, Muscle } from '../data/exercises';
import type { ProgramDraft } from './programs';

/** Programs the user typed or imported for themselves: exercises are keyed so a program can reuse them. */
export interface PersonalData {
  source: string;
  exercises: Record<string, { name: string; libraryId: string | null; muscle: Muscle; equipment: Equipment; compound: boolean }>;
  programs: { name: string; note: string; goal: 'hypertrophy' | 'strength' | 'both'; days: { name: string; items: { ex: string; sets: number; repMin: number; repMax: number; rir: number; rest?: number }[] }[] }[];
}

/** Everything wrong with the data, so a bad file fails loudly in tests instead of silently on a phone. */
export function problemsIn(d: PersonalData, libraryIds: Set<string>): string[] {
  const out: string[] = [];
  for (const [k, e] of Object.entries(d.exercises)) {
    if (e.libraryId && !libraryIds.has(e.libraryId)) out.push(`exercise ${k}: unknown library id ${e.libraryId}`);
  }
  const names = new Set<string>();
  for (const p of d.programs) {
    if (names.has(p.name)) out.push(`duplicate program ${p.name}`);
    names.add(p.name);
    if (!p.days.length) out.push(`${p.name}: no days`);
    for (const day of p.days) {
      if (!day.items.length) out.push(`${p.name}/${day.name}: no exercises`);
      for (const it of day.items) {
        if (!d.exercises[it.ex]) out.push(`${p.name}/${day.name}: unknown exercise ${it.ex}`);
        if (!(it.sets >= 1 && it.sets <= 8)) out.push(`${p.name}/${day.name}/${it.ex}: sets ${it.sets}`);
        if (!(it.repMin >= 1 && it.repMin <= it.repMax && it.repMax <= 40)) out.push(`${p.name}/${day.name}/${it.ex}: reps ${it.repMin}-${it.repMax}`);
        if (!(it.rir >= 0 && it.rir <= 4)) out.push(`${p.name}/${day.name}/${it.ex}: rir ${it.rir}`);
      }
    }
  }
  return out;
}

/** Turns the keyed data into program drafts once every exercise key has a real exercise id. */
export function draftsFrom(d: PersonalData, idFor: Record<string, string>): ProgramDraft[] {
  return d.programs.map((p) => ({
    name: p.name,
    goal: p.goal,
    days: p.days.map((day) => ({
      name: day.name,
      items: day.items.map((it) => ({ exerciseId: idFor[it.ex], sets: it.sets, repMin: it.repMin, repMax: it.repMax, rir: it.rir, rest: it.rest ?? null })),
    })),
  }));
}
