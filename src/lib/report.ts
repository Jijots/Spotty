// The numbers behind the Progress report. Pure, so they can be tested without a screen.

import { e1rm } from './records';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** Local midnight of the first day of the week containing `ts` (Monday by default). */
export function startOfWeek(ts: number, weekStartsOn: 0 | 1 = 1): Date {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() - weekStartsOn + 7) % 7));
  return d;
}

export interface WeekBin { start: number; count: number; current: boolean }

/** Workouts per week for the last `weeks` weeks, oldest first, ending with the current week. */
export function weeklyCounts(workouts: { started_at: number }[], weeks = 8, now = Date.now()): WeekBin[] {
  const thisWeek = startOfWeek(now);
  const bins: WeekBin[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(thisWeek);
    d.setDate(d.getDate() - i * 7);
    bins.push({ start: d.getTime(), count: 0, current: i === 0 });
  }
  for (const w of workouts) {
    const wk = startOfWeek(w.started_at).getTime();
    const bin = bins.find((b) => b.start === wk);
    if (bin) bin.count++;
  }
  return bins;
}

/** "30 AUG" as two short lines for a chart axis. */
export const axisLabel = (ts: number) => ({ day: String(new Date(ts).getDate()), month: MONTHS[new Date(ts).getMonth()] });

export interface Totals { workouts: number; minutes: number; volumeKg: number }

/** A session left open for hours would swamp the totals, so each workout's length is capped. */
export function totals(workouts: { started_at: number; finished_at: number; volume: number }[], capMinutes = 300): Totals {
  let minutes = 0;
  let volumeKg = 0;
  for (const w of workouts) {
    minutes += Math.min(Math.max((w.finished_at - w.started_at) / 60000, 0), capMinutes);
    volumeKg += w.volume;
  }
  return { workouts: workouts.length, minutes: Math.round(minutes), volumeKg };
}

export interface StripDay { time: number; letter: string; date: number; done: boolean; today: boolean }

/** The seven days of the current week, with which ones had a workout. */
export function weekStrip(workouts: { started_at: number }[], now = Date.now()): StripDay[] {
  const start = startOfWeek(now);
  const todayKey = new Date(now).toDateString();
  const doneDays = new Set(workouts.map((w) => new Date(w.started_at).toDateString()));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return { time: d.getTime(), letter: WEEKDAYS[d.getDay()], date: d.getDate(), done: doneDays.has(d.toDateString()), today: d.toDateString() === todayKey };
  });
}

/** 950 -> "950", 12400 -> "12.4k", 1940000 -> "1.94M". */
export function compact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}M`;
  if (abs >= 10_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  if (abs >= 1000) return `${(n / 1000).toFixed(2).replace(/\.?0+$/, '')}k`;
  return String(Math.round(n));
}

/** 42 -> "42 min", 125 -> "2h 5m". */
export function duration(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m ? `${h}h ${m}m` : `${h}h`;
}

export interface PersonalBest { exerciseId: string; weight: number; reps: number; e1rm: number; at: number }

/**
 * The best set per exercise (by estimated one-rep max; bodyweight moves by reps), newest record first.
 * Warm-ups must already be filtered out.
 */
export function personalBests(sets: { exerciseId: string; weight: number; reps: number; at: number }[]): PersonalBest[] {
  const best = new Map<string, PersonalBest>();
  for (const s of sets) {
    if (!(s.reps > 0)) continue;
    const score = s.weight > 0 ? e1rm(s.weight, s.reps) : s.reps;
    const cur = best.get(s.exerciseId);
    const curScore = cur ? (cur.weight > 0 ? cur.e1rm : cur.reps) : -1;
    // Ties go to the earlier set: a record is first set, not matched.
    if (!cur || score > curScore) best.set(s.exerciseId, { exerciseId: s.exerciseId, weight: s.weight, reps: s.reps, e1rm: s.weight > 0 ? score : 0, at: s.at });
  }
  return [...best.values()].sort((a, b) => b.at - a.at);
}

/** "Mon, Oct 21" without relying on the device's locale support. */
export function shortDate(ts: number): string {
  const d = new Date(ts);
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return `${names[d.getDay()]}, ${MONTHS[d.getMonth()].charAt(0)}${MONTHS[d.getMonth()].slice(1).toLowerCase()} ${d.getDate()}`;
}

/** The session clock: 754000 -> "12:34", 3725000 -> "1:02:05". Never negative. */
export function formatElapsed(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const pad = (n: number) => String(n).padStart(2, '0');
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}:${pad(m)}:${pad(s % 60)}` : `${pad(m)}:${pad(s % 60)}`;
}
