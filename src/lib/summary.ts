// The words and numbers behind the coach moments: what comes next, how far along you are,
// and what you just did. Pure so they can be tested without a screen.

import type { Block } from './draft';
import type { PRKind, PRResult } from './records';
import type { Unit } from './units';

const isWork = (r: { warmup: boolean }) => !r.warmup;

/** Working sets ticked / total, warm-ups excluded. */
export function sessionProgress(blocks: Block[]) {
  let done = 0;
  let total = 0;
  for (const b of blocks) for (const r of b.rows) if (isWork(r)) { total++; if (r.done) done++; }
  return { done, total };
}

/** "Bench Press · set 3 · 82.5 kg × 8" for the first set still open, or null when none is left. */
export function nextSetLabel(blocks: Block[], unit: Unit): string | null {
  for (const b of blocks) {
    let work = 0;
    for (const r of b.rows) {
      if (isWork(r)) work++;
      if (r.done) continue;
      const w = Number(r.weight);
      const reps = Number(r.reps);
      const detail = w > 0 ? `${r.weight} ${unit} × ${reps > 0 ? reps : '?'}` : reps > 0 ? `${reps} reps` : '';
      return [b.name, r.warmup ? 'warm-up' : `set ${work}`, detail].filter(Boolean).join(' · ');
    }
  }
  return null;
}

export interface Summary {
  title: string;
  sets: number;
  exercises: number;
  /** Total weight lifted, in `unit`. */
  volume: number;
  unit: Unit;
  minutes: number;
  prs: { name: string; kinds: PRKind[] }[];
  next: string | null;
}

export function buildSummary(o: {
  blocks: Block[]; unit: Unit; startedAt: number; now: number; prs: PRResult[]; title: string; next: string | null;
}): Summary {
  let sets = 0;
  let exercises = 0;
  let volume = 0;
  for (const b of o.blocks) {
    let any = false;
    for (const r of b.rows) {
      if (!isWork(r) || !r.done || !(Number(r.reps) > 0)) continue;
      any = true;
      sets++;
      volume += (Number(r.weight) || 0) * Number(r.reps);
    }
    if (any) exercises++;
  }
  const names = new Map(o.blocks.map((b) => [b.exerciseId, b.name]));
  return {
    title: o.title,
    sets,
    exercises,
    volume: Math.round(volume),
    unit: o.unit,
    minutes: Math.min(Math.max(Math.round((o.now - o.startedAt) / 60000), 0), 600),
    prs: o.prs.map((p) => ({ name: names.get(p.exerciseId) ?? 'Exercise', kinds: p.kinds })),
    next: o.next,
  };
}
