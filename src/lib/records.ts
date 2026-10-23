// Personal-record detection. Warm-up sets must be filtered out before calling these.

export interface SetLike { weight: number; reps: number }
export interface HistorySet extends SetLike { exerciseId: string }

export type PRKind = 'e1rm' | 'weight' | 'reps';

export interface Best { count: number; e1rm: number; weight: number; reps: number }

/** Epley estimated one-rep max. */
export const e1rm = (weight: number, reps: number) => (reps <= 1 ? weight : weight * (1 + reps / 30));

export function bestOf(sets: SetLike[]): Best {
  const b: Best = { count: sets.length, e1rm: 0, weight: 0, reps: 0 };
  for (const s of sets) {
    b.e1rm = Math.max(b.e1rm, e1rm(s.weight, s.reps));
    b.weight = Math.max(b.weight, s.weight);
    b.reps = Math.max(b.reps, s.reps);
  }
  return b;
}

const EPS = 0.01;

/** What `current` beats compared to `prev`. A first-ever session sets a baseline, not a record. */
export function prKinds(prev: Best, current: Best): PRKind[] {
  if (prev.count === 0 || current.count === 0) return [];
  const kinds: PRKind[] = [];
  if (current.weight > 0) {
    if (current.e1rm > prev.e1rm + EPS) kinds.push('e1rm');
    if (current.weight > prev.weight + EPS) kinds.push('weight');
  } else if (prev.weight === 0 && current.reps > prev.reps) {
    kinds.push('reps'); // bodyweight movement
  }
  return kinds;
}

export interface PRResult { exerciseId: string; kinds: PRKind[]; best: Best }

/** Compare this session's sets against everything logged before. */
export function detectPRs(history: HistorySet[], session: HistorySet[]): PRResult[] {
  const ids = [...new Set(session.map((s) => s.exerciseId))];
  const out: PRResult[] = [];
  for (const id of ids) {
    const best = bestOf(session.filter((s) => s.exerciseId === id));
    const kinds = prKinds(bestOf(history.filter((s) => s.exerciseId === id)), best);
    if (kinds.length) out.push({ exerciseId: id, kinds, best });
  }
  return out;
}

export const PR_LABEL: Record<PRKind, string> = { e1rm: 'est. one-rep max', weight: 'heaviest weight', reps: 'most reps' };
