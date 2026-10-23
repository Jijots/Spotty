export interface WarmupSet { weight: number; reps: number }

const RAMP: [pct: number, reps: number][] = [[0.4, 8], [0.6, 5], [0.8, 3]];
export const BAR_KG = 20;

/**
 * Ramp up to the first working weight. Values are kg, rounded to `stepKg`.
 * Light loads (< 30 kg) get none; heavy barbell lifts start with the empty bar.
 */
export function warmupSets(workingKg: number, stepKg: number, barbell: boolean): WarmupSet[] {
  if (!(workingKg >= 30) || !(stepKg > 0)) return [];
  const out: WarmupSet[] = [];
  if (barbell && workingKg >= 60) out.push({ weight: BAR_KG, reps: 10 });
  for (const [pct, reps] of RAMP) {
    const w = Math.round((workingKg * pct) / stepKg) * stepKg;
    const prev = out[out.length - 1]?.weight ?? 0;
    if (w > prev && w < workingKg && (!barbell || w >= BAR_KG)) out.push({ weight: Math.round(w * 100) / 100, reps });
  }
  return out;
}

/** Rest in seconds after a set. */
export function restSeconds(opts: { compound: boolean; warmup: boolean; compoundRest: number; isolationRest: number; override?: number | null }) {
  if (opts.warmup) return 45;
  if (opts.override != null) return opts.override;
  return opts.compound ? opts.compoundRest : opts.isolationRest;
}
