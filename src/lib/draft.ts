// Everything that protects a workout in progress: the persisted draft, input
// sanitising and pre-save validation. Pure so it can be tested without a device.

import { cleanRest } from './rest';
import { toKg, type Unit } from './units';

export interface Row { weight: string; reps: string; rir: string; done: boolean; warmup: boolean }
export interface Block {
  exerciseId: string; name: string; muscle: string; compound: boolean; barbell: boolean;
  /** False for bodyweight/bands/unknown gear, where an empty weight is legitimate. */
  weighted: boolean;
  repMin: number; repMax: number; target: string; rows: Row[];
  /** What the +/- weight buttons add, in the draft's unit. Absent in drafts saved before this existed. */
  step?: number;
  /** Rest after each working set of this exercise, in seconds. Absent means the default for compound or isolation lifts. */
  rest?: number;
}
export type Mode = 'program' | 'auto';

export interface WorkoutDraft {
  v: 1;
  mode: Mode;
  programId: number | null;
  dayPos: number;
  startedAt: number;
  savedAt: number;
  /** Weights in `blocks` are strings in this unit, whatever the unit setting says later. */
  unit: Unit;
  blocks: Block[];
}

export const DRAFT_KEY = 'workoutDraft';
/** Past this age the user is asked before a draft is resumed. */
export const STALE_HOURS = 8;

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const str = (x: unknown, fallback = '') => (typeof x === 'string' ? x : fallback);
const num = (x: unknown, fallback = 0) => (typeof x === 'number' && Number.isFinite(x) ? x : fallback);

function parseRow(x: unknown): Row | null {
  if (!isObj(x)) return null;
  return { weight: str(x.weight), reps: str(x.reps), rir: str(x.rir), done: x.done === true, warmup: x.warmup === true };
}

function parseBlock(x: unknown): Block | null {
  if (!isObj(x) || typeof x.exerciseId !== 'string' || !Array.isArray(x.rows)) return null;
  const rows = x.rows.map(parseRow).filter((r): r is Row => r !== null);
  if (!rows.length) return null;
  return {
    exerciseId: x.exerciseId, name: str(x.name, x.exerciseId), muscle: str(x.muscle), compound: x.compound === true,
    barbell: x.barbell === true, weighted: x.weighted !== false, repMin: num(x.repMin, 8), repMax: num(x.repMax, 12),
    target: str(x.target), rows,
    step: typeof x.step === 'number' && x.step > 0 ? x.step : undefined,
    rest: cleanRest(x.rest),
  };
}

/** Reads whatever was stored; anything malformed or from an unknown version is dropped, never thrown. */
export function parseDraft(raw: unknown): WorkoutDraft | null {
  if (!isObj(raw) || raw.v !== 1 || !Array.isArray(raw.blocks)) return null;
  const blocks = raw.blocks.map(parseBlock).filter((b): b is Block => b !== null);
  if (!blocks.length) return null;
  return {
    v: 1,
    mode: raw.mode === 'program' ? 'program' : 'auto',
    programId: typeof raw.programId === 'number' ? raw.programId : null,
    dayPos: Math.max(0, Math.floor(num(raw.dayPos))),
    startedAt: num(raw.startedAt, Date.now()),
    savedAt: num(raw.savedAt, Date.now()),
    unit: raw.unit === 'lb' ? 'lb' : 'kg',
    blocks,
  };
}

export const isStale = (d: WorkoutDraft, now = Date.now()) => now - d.savedAt > STALE_HOURS * 3600_000;

/** True once the user has typed or ticked anything, i.e. there is something to lose. */
export const hasProgress = (blocks: Block[], dirty: boolean) => dirty || blocks.some((b) => b.rows.some((r) => r.done));

export const untickedWorkingSets = (blocks: Block[]) =>
  blocks.reduce((n, b) => n + b.rows.filter((r) => !r.warmup && !r.done).length, 0);

// ---- input sanitising -------------------------------------------------------

/** "82,5" (comma keyboards), "1.2.3" and letters become a clean decimal with at most 2 places. */
export function sanitizeDecimal(t: string): string {
  const cleaned = t.replace(',', '.').replace(/[^0-9.]/g, '');
  const dot = cleaned.indexOf('.');
  const out = dot === -1 ? cleaned : cleaned.slice(0, dot + 1) + cleaned.slice(dot + 1).replace(/\./g, '').slice(0, 2);
  return out.slice(0, 7);
}

/** Nudges a typed number by `delta` (never below `min`), without float noise like 82.50000001. */
export function stepValue(value: string, delta: number, min = 0, decimals = 2): string {
  const n = Number(value);
  const base = Number.isFinite(n) ? n : 0;
  const f = 10 ** decimals;
  return String(Math.max(min, Math.round((base + delta) * f) / f));
}

export const sanitizeInt = (t: string, maxLen = 3) => t.replace(/\D/g, '').slice(0, maxLen);

// ---- validation before saving -----------------------------------------------

export interface Problem { block: number; row: number; message: string; severity: 'error' | 'warn' }

const MAX_PLAUSIBLE_KG = 700;
const MAX_PLAUSIBLE_REPS = 100;

/** Checks ticked sets only. Errors must be fixed; warnings can be overridden. */
export function validateSets(blocks: Block[], unit: Unit): Problem[] {
  const out: Problem[] = [];
  blocks.forEach((b, bi) => {
    let n = 0;
    b.rows.forEach((r, ri) => {
      if (!r.warmup) n++;
      if (!r.done) return;
      const label = `${b.name}, ${r.warmup ? 'warm-up' : `set ${n}`}`;
      const w = Number(r.weight);
      const reps = Number(r.reps);
      if (!(reps > 0)) out.push({ block: bi, row: ri, severity: 'error', message: `${label}: enter the reps, or untick it.` });
      if (b.weighted && !r.warmup && !(w > 0)) out.push({ block: bi, row: ri, severity: 'error', message: `${label}: enter a weight, or untick it.` });
      if (toKg(w || 0, unit) > MAX_PLAUSIBLE_KG) out.push({ block: bi, row: ri, severity: 'warn', message: `${label}: ${r.weight} ${unit} looks too heavy. Typo?` });
      if (reps > MAX_PLAUSIBLE_REPS) out.push({ block: bi, row: ri, severity: 'warn', message: `${label}: ${r.reps} reps looks like a typo.` });
    });
  });
  return out;
}

/**
 * Typing a weight on one set carries it down to the sets that follow, so you enter it once instead of once per set.
 * Only later working sets that are still open and either empty or still holding the old value are changed: a
 * weight you set on purpose for a later set (a back-off set) is left alone, and warm-ups never take part.
 */
export function propagateWeight(rows: Row[], index: number, newWeight: string): Row[] {
  const source = rows[index];
  if (!source || source.warmup) return rows;
  const old = source.weight;
  return rows.map((r, i) => {
    if (i === index) return { ...r, weight: newWeight };
    if (i < index || r.warmup || r.done) return r;
    return r.weight === '' || r.weight === old ? { ...r, weight: newWeight } : r;
  });
}
