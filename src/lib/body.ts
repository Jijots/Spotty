import type { Muscle } from '../data/exercises';
import type { Slug } from 'react-native-body-highlighter';

export type Side = 'front' | 'back';

/** Which side of the body shows a muscle best. Shoulders and forearms are drawn on both sides. */
export const SIDE: Record<Muscle, Side> = {
  chest: 'front', core: 'front', biceps: 'front', quads: 'front', shoulders: 'front', forearms: 'front',
  back: 'back', triceps: 'back', glutes: 'back', hamstrings: 'back', calves: 'back',
};

/** A square window onto the 100x200 figure, so a thumbnail zooms to the area being trained. */
export const FOCUS: Record<Muscle, { y: number; size: number }> = {
  shoulders: { y: 18, size: 90 }, chest: { y: 22, size: 90 }, back: { y: 22, size: 90 },
  biceps: { y: 30, size: 90 }, triceps: { y: 30, size: 90 }, forearms: { y: 50, size: 90 },
  core: { y: 42, size: 80 }, glutes: { y: 78, size: 80 },
  quads: { y: 92, size: 100 }, hamstrings: { y: 92, size: 100 }, calves: { y: 108, size: 90 },
};

/** Share of full color for a value between 0 and 1. Anything above zero stays visible. */
export const levelOpacity = (v: number | undefined) => (v == null || v <= 0 ? 0 : 0.28 + 0.72 * Math.min(v, 1));

/** Each muscle's sets this week as a 0..1 share of the busiest muscle. */
export function volumeLevels(sets: Partial<Record<Muscle, number>>): Partial<Record<Muscle, number>> {
  const max = Math.max(0, ...Object.values(sets).map((n) => n ?? 0));
  const out: Partial<Record<Muscle, number>> = {};
  if (max === 0) return out;
  for (const [m, n] of Object.entries(sets)) if (n) out[m as Muscle] = n / max;
  return out;
}

/** Sets per muscle since a time: a set counts fully for its primary muscle and half for each secondary. */
export function weeklyMuscleSets(
  history: { exerciseId: string; at: number }[], since: number,
  catalog: { id: string; muscle: Muscle; secondary?: Muscle[] }[],
): Partial<Record<Muscle, number>> {
  const byId = new Map(catalog.map((x) => [x.id, x]));
  const out: Partial<Record<Muscle, number>> = {};
  for (const s of history) {
    if (s.at < since) continue;
    const ex = byId.get(s.exerciseId);
    if (!ex) continue;
    out[ex.muscle] = (out[ex.muscle] ?? 0) + 1;
    for (const m of ex.secondary ?? []) if (m !== ex.muscle) out[m] = (out[m] ?? 0) + 0.5;
  }
  return out;
}

/** The library's names for the regions each of our muscle groups covers. */
export const SLUGS: Record<Muscle, Slug[]> = {
  chest: ['chest'], shoulders: ['deltoids'], biceps: ['biceps'], triceps: ['triceps'], forearms: ['forearm'],
  core: ['abs', 'obliques'], quads: ['quadriceps'], hamstrings: ['hamstring'], glutes: ['gluteal'], calves: ['calves'],
  back: ['trapezius', 'upper-back', 'lower-back'],
};

export const STEPS = 4;

/** 1..STEPS shade for a level, or 0 when the muscle should stay neutral. */
export const levelStep = (v: number | undefined) => (v == null || v <= 0 ? 0 : Math.min(STEPS, Math.max(1, Math.ceil(v * STEPS))));

/** Per-region shade entries for the body component. */
export function bodyData(levels: Partial<Record<Muscle, number>>): { slug: Slug; intensity: number }[] {
  const out: { slug: Slug; intensity: number }[] = [];
  for (const m of Object.keys(SLUGS) as Muscle[]) {
    const step = levelStep(levels[m]);
    if (step > 0) for (const slug of SLUGS[m]) out.push({ slug, intensity: step });
  }
  return out;
}

/** Blend two #RRGGBB colors; t=0 gives a, t=1 gives b. */
export function mixHex(a: string, b: string, t: number): string {
  const p = (h: string, i: number) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
  const c = (i: number) => Math.round(p(a, i) + (p(b, i) - p(a, i)) * t).toString(16).padStart(2, '0');
  return `#${c(0)}${c(1)}${c(2)}`.toUpperCase();
}
