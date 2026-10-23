import type { Equipment, Exercise } from '../data/exercises';

/**
 * Replacement ideas for an exercise: same main muscle, usable with your equipment,
 * and similar in kind (compound/isolation, then equipment) so the session still works.
 */
export function swapCandidates(
  current: Exercise,
  catalog: Exercise[],
  equipment: Equipment[],
  excludeIds: string[] = [],
  limit = 8,
): Exercise[] {
  const skip = new Set([current.id, ...excludeIds]);
  const score = (x: Exercise) =>
    (x.compound === current.compound ? 4 : 0) + (x.equipment === current.equipment ? 2 : 0) + (x.staple || x.custom ? 1 : 0);
  return catalog
    .filter((x) => !skip.has(x.id) && x.muscle === current.muscle && equipment.includes(x.equipment) && (x.staple || x.custom))
    .sort((a, b) => score(b) - score(a))
    .slice(0, limit);
}
