import { fromKg, type Unit } from './units';

export interface LastSet { exerciseId: string; weight: number; reps: number; at: number; id?: number }

/** One pass over the history: each wanted exercise's sets from its most recent session, in set order. */
export function lastSessions(history: LastSet[], wanted: Set<string>): Map<string, LastSet[]> {
  const out = new Map<string, LastSet[]>();
  for (const s of history) {
    if (!wanted.has(s.exerciseId)) continue;
    const cur = out.get(s.exerciseId);
    if (!cur || s.at > cur[0].at) out.set(s.exerciseId, [s]);
    else if (s.at === cur[0].at) cur.push(s);
  }
  for (const sets of out.values()) sets.sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
  return out;
}

/**
 * "Last: 82.5 × 8, 8 · 80 × 7 kg". Consecutive sets at the same weight share one weight; bodyweight
 * shows as "bodyweight". Weights are compared after converting to the display unit, so lb rounding can't split a group.
 */
export function formatLast(sets: { weight: number; reps: number }[] | undefined, unit: Unit): string {
  if (!sets?.length) return '';
  const groups: { w: number; reps: number[] }[] = [];
  for (const s of sets) {
    const w = fromKg(s.weight, unit);
    const g = groups[groups.length - 1];
    if (g && g.w === w) g.reps.push(s.reps);
    else groups.push({ w, reps: [s.reps] });
  }
  const body = groups.map((g) => `${g.w === 0 ? 'bodyweight' : g.w} × ${g.reps.join(', ')}`).join(' · ');
  return `Last: ${body}${groups.some((g) => g.w !== 0) ? ` ${unit}` : ''}`;
}
