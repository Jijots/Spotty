// Turns a model's reply into a program the app can safely use. A language model can invent exercises, break the
// format or ask for 40 sets, so nothing it says is trusted: every exercise id must exist in the library, numbers
// are clamped, and a reply with too little usable content is rejected so the caller can fall back.

import type { Equipment, Exercise } from '../data/exercises';
import type { ProgramDraft, ProgramItem } from './programs';

export interface MenuItem { id: string; name: string; muscle: string; equipment: Equipment; compound: boolean }

/** The exercises the model may choose from: the curated staples (and the user's own) that fit their equipment. */
export function buildMenu(catalog: Exercise[], equipment: Equipment[]): MenuItem[] {
  return catalog
    .filter((x) => (x.staple || x.custom) && equipment.includes(x.equipment))
    .map((x) => ({ id: x.id, name: x.name, muscle: x.muscle, equipment: x.equipment, compound: x.compound }));
}

export const SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    days: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                exerciseId: { type: 'string' },
                sets: { type: 'integer' },
                repMin: { type: 'integer' },
                repMax: { type: 'integer' },
                rir: { type: 'integer' },
              },
              required: ['exerciseId', 'sets', 'repMin', 'repMax', 'rir'],
            },
          },
        },
        required: ['name', 'items'],
      },
    },
  },
  required: ['name', 'days'],
} as const;

export interface ChatMessage { role: 'system' | 'user'; content: string }

/** What to send to the model: rules, the exercise menu, and the person's own words. */
export function buildMessages(request: string, menu: MenuItem[]): ChatMessage[] {
  const list = menu.map((m) => `${m.id} | ${m.name} | ${m.muscle}${m.compound ? ' | compound' : ''}`).join('\n');
  const system = [
    'You design weightlifting programs. Reply with JSON only, matching the requested schema.',
    'Use ONLY exercises from the list below, and copy each exerciseId exactly.',
    'Rules: 1 to 7 training days, 4 to 9 exercises per day, 2 to 5 sets per exercise, reps between 3 and 30,',
    'rir (reps left in reserve) between 0 and 4. Start each day with its heaviest compound lifts.',
    'Do not repeat an exercise within a day. Give each day a short name such as "Upper A" or "Legs".',
    '',
    'Exercises (exerciseId | name | muscle):',
    list,
  ].join('\n');
  return [{ role: 'system', content: system }, { role: 'user', content: request.trim().slice(0, 1200) }];
}

export type ParsedProgram = { ok: true; draft: ProgramDraft; notes: string[] } | { ok: false; error: string };

/** Finds the JSON object in a reply that may be wrapped in a code fence or chatter. */
export function extractJson(raw: string): unknown | null {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(raw.slice(start, end + 1)); } catch { return null; }
}

const clamp = (n: unknown, lo: number, hi: number, fallback: number) => {
  const v = typeof n === 'number' && Number.isFinite(n) ? Math.round(n) : fallback;
  return Math.min(hi, Math.max(lo, v));
};
const clean = (s: unknown, fallback: string, max: number) => {
  const t = typeof s === 'string' ? s.replace(/\s+/g, ' ').trim().slice(0, max) : '';
  return t || fallback;
};

export const MIN_EXERCISES = 3;

/** Validates a model reply against the menu. Unknown exercises are dropped (and reported), numbers are clamped. */
export function parseAiProgram(raw: string, menu: MenuItem[]): ParsedProgram {
  const data = extractJson(raw);
  if (typeof data !== 'object' || data === null) return { ok: false, error: 'The model did not return a program. Try again, or try a different model.' };
  const o = data as { name?: unknown; days?: unknown };
  if (!Array.isArray(o.days) || o.days.length === 0) return { ok: false, error: 'The model returned no training days.' };

  const byId = new Map(menu.map((m) => [m.id, m]));
  const byName = new Map(menu.map((m) => [m.name.toLowerCase(), m]));
  const notes: string[] = [];
  const days: ProgramDraft['days'] = [];

  for (const [di, d] of o.days.slice(0, 7).entries()) {
    if (typeof d !== 'object' || d === null) continue;
    const day = d as { name?: unknown; items?: unknown };
    const seen = new Set<string>();
    const items: ProgramItem[] = [];
    for (const it of Array.isArray(day.items) ? day.items.slice(0, 12) : []) {
      if (typeof it !== 'object' || it === null) continue;
      const r = it as Record<string, unknown>;
      const id = typeof r.exerciseId === 'string' ? r.exerciseId : '';
      const ex = byId.get(id) ?? byName.get(id.toLowerCase());
      if (!ex) { notes.push(`Skipped "${id || 'an exercise'}" because it is not in the library.`); continue; }
      if (seen.has(ex.id)) continue;
      seen.add(ex.id);
      const a = clamp(r.repMin, 1, 30, 8);
      const b = clamp(r.repMax, 1, 30, 12);
      items.push({
        exerciseId: ex.id,
        sets: clamp(r.sets, 1, 6, 3),
        repMin: Math.min(a, b),
        repMax: Math.max(a, b),
        rir: clamp(r.rir, 0, 4, 2),
      });
    }
    if (items.length) days.push({ name: clean(day.name, `Day ${di + 1}`, 30), items });
  }

  const total = days.reduce((n, d) => n + d.items.length, 0);
  if (total < MIN_EXERCISES) return { ok: false, error: 'The model suggested too few exercises that exist in the library. Try again, or try a different model.' };
  return { ok: true, draft: { name: clean(o.name, 'AI program', 40), goal: 'custom', days }, notes: notes.slice(0, 5) };
}
