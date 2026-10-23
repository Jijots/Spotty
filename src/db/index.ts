import * as SQLite from 'expo-sqlite';
import type { PastSet } from '../lib/generator';
import type { Goal, ProgramDraft } from '../lib/programs';
import { DRAFT_KEY, parseDraft, type WorkoutDraft } from '../lib/draft';
import type { DayData, Profile } from '../lib/nutrition';
import { LIBRARY, type Equipment, type Exercise, type Muscle } from '../data/exercises';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb() {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('gym.db');
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS workouts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          started_at INTEGER NOT NULL,
          finished_at INTEGER
        );
        CREATE TABLE IF NOT EXISTS sets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          workout_id INTEGER NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
          exercise_id TEXT NOT NULL,
          weight REAL NOT NULL,
          reps INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS food_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date TEXT NOT NULL,
          name TEXT NOT NULL,
          kcal REAL NOT NULL,
          protein REAL NOT NULL DEFAULT 0,
          carbs REAL NOT NULL DEFAULT 0,
          fat REAL NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS weigh_ins (date TEXT PRIMARY KEY, kg REAL NOT NULL);
        CREATE TABLE IF NOT EXISTS custom_exercises (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          muscle TEXT NOT NULL,
          equipment TEXT NOT NULL,
          compound INTEGER NOT NULL DEFAULT 0,
          notes TEXT NOT NULL DEFAULT ''
        );
        CREATE TABLE IF NOT EXISTS programs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          goal TEXT NOT NULL,
          created_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS program_days (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          program_id INTEGER NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
          position INTEGER NOT NULL,
          name TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS program_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          day_id INTEGER NOT NULL REFERENCES program_days(id) ON DELETE CASCADE,
          position INTEGER NOT NULL,
          exercise_id TEXT NOT NULL,
          sets INTEGER NOT NULL,
          rep_min INTEGER NOT NULL,
          rep_max INTEGER NOT NULL,
          rir INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
        CREATE INDEX IF NOT EXISTS idx_sets_ex ON sets(exercise_id);
        CREATE INDEX IF NOT EXISTS idx_food_date ON food_log(date);
      `);
      // Columns added after the first release; ignore "duplicate column" on later launches.
      for (const [table, col] of [
        ['workouts', 'program_id INTEGER'], ['workouts', 'day_position INTEGER'],
        ['sets', 'rir INTEGER'], ['sets', 'warmup INTEGER NOT NULL DEFAULT 0'], ['program_items', 'rest INTEGER'],
      ]) {
        try { await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${col}`); } catch { /* already there */ }
      }
      await db.execAsync('PRAGMA foreign_keys = ON');
      return db;
    })();
  }
  return dbPromise;
}

export const isoDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// ---- settings ---------------------------------------------------------------

export const DEFAULT_PROFILE: Profile = { sex: 'male', age: 30, heightCm: 178, weightKg: 80, activity: 1.55 };
export const DEFAULT_EQUIPMENT: Equipment[] = ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight'];

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', key);
  return row ? (JSON.parse(row.value) as T) : fallback;
}

export async function setSetting(key: string, value: unknown) {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key, JSON.stringify(value),
  );
}

// ---- workouts ---------------------------------------------------------------

export async function pastSets(): Promise<PastSet[]> {
  const db = await getDb();
  return db.getAllAsync<PastSet>(
    `SELECT s.id, s.exercise_id AS exerciseId, s.weight, s.reps, s.rir, w.started_at AS at
       FROM sets s JOIN workouts w ON w.id = s.workout_id
      WHERE w.finished_at IS NOT NULL AND s.warmup = 0
      ORDER BY w.started_at, s.id`,
  );
}

export interface LoggedSet { exerciseId: string; weight: number; reps: number; rir?: number | null; warmup?: boolean }

/** Returns the new workout's id, which the summary keeps so a mistaken Finish can be undone. */
export async function saveWorkout(startedAt: number, sets: LoggedSet[], programId: number | null = null, dayPosition: number | null = null) {
  const db = await getDb();
  let workoutId = 0;
  await db.withTransactionAsync(async () => {
    const res = await db.runAsync(
      'INSERT INTO workouts (started_at, finished_at, program_id, day_position) VALUES (?, ?, ?, ?)',
      startedAt, Date.now(), programId, dayPosition,
    );
    workoutId = res.lastInsertRowId;
    for (const s of sets) {
      await db.runAsync(
        'INSERT INTO sets (workout_id, exercise_id, weight, reps, rir, warmup) VALUES (?, ?, ?, ?, ?, ?)',
        res.lastInsertRowId, s.exerciseId, s.weight, s.reps, s.rir ?? null, s.warmup ? 1 : 0,
      );
    }
  });
  return workoutId;
}

/**
 * Undo a Finish: remove the saved workout and put its sets back as the in-progress draft. One transaction,
 * because the draft lives in the same database: a crash can lose neither the workout nor leave it saved twice.
 */
export async function reopenWorkout(id: number, draft: WorkoutDraft) {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM sets WHERE workout_id = ?', id);
    await db.runAsync('DELETE FROM workouts WHERE id = ?', id);
    await db.runAsync(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      DRAFT_KEY, JSON.stringify(draft),
    );
  });
}

export async function workoutHistory(limit = 30) {
  const db = await getDb();
  return db.getAllAsync<{ id: number; started_at: number; finished_at: number; volume: number; sets: number; day_name: string | null }>(
    `SELECT w.id, w.started_at, w.finished_at, d.name AS day_name,
            COALESCE(SUM(s.weight * s.reps), 0) AS volume, COUNT(s.id) AS sets
       FROM workouts w
       LEFT JOIN sets s ON s.workout_id = w.id AND s.warmup = 0
       LEFT JOIN program_days d ON d.program_id = w.program_id AND d.position = w.day_position
      WHERE w.finished_at IS NOT NULL
      GROUP BY w.id ORDER BY w.started_at DESC LIMIT ?`, limit,
  );
}

// ---- nutrition --------------------------------------------------------------

export interface FoodEntry { id: number; date: string; name: string; kcal: number; protein: number; carbs: number; fat: number }

export async function foodForDate(date: string) {
  const db = await getDb();
  return db.getAllAsync<FoodEntry>('SELECT * FROM food_log WHERE date = ? ORDER BY id', date);
}

/** Returns the new entry's id so an "Undo" can remove it again. */
export async function addFood(e: Omit<FoodEntry, 'id'>): Promise<number> {
  const db = await getDb();
  const res = await db.runAsync(
    'INSERT INTO food_log (date, name, kcal, protein, carbs, fat) VALUES (?, ?, ?, ?, ?, ?)',
    e.date, e.name, e.kcal, e.protein, e.carbs, e.fat,
  );
  return res.lastInsertRowId;
}

export async function deleteFood(id: number) {
  const db = await getDb();
  await db.runAsync('DELETE FROM food_log WHERE id = ?', id);
}

export async function logWeight(date: string, kg: number) {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO weigh_ins (date, kg) VALUES (?, ?) ON CONFLICT(date) DO UPDATE SET kg = excluded.kg', date, kg,
  );
}

/** Consecutive days (oldest first) ending today, joining intake and weigh-ins. */
export async function recentDays(n = 42): Promise<DayData[]> {
  const db = await getDb();
  const start = new Date();
  start.setDate(start.getDate() - (n - 1));
  const from = isoDate(start);
  const kcal = await db.getAllAsync<{ date: string; kcal: number }>(
    'SELECT date, SUM(kcal) AS kcal FROM food_log WHERE date >= ? GROUP BY date', from);
  const weights = await db.getAllAsync<{ date: string; kg: number }>('SELECT date, kg FROM weigh_ins WHERE date >= ?', from);
  const k = new Map(kcal.map((r) => [r.date, r.kcal]));
  const w = new Map(weights.map((r) => [r.date, r.kg]));
  const days: DayData[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const date = isoDate(d);
    days.push({ date, kcal: k.get(date) ?? null, weightKg: w.get(date) ?? null });
  }
  return days;
}

// ---- custom exercises -------------------------------------------------------

interface CustomRow { id: number; name: string; muscle: Muscle; equipment: Equipment; compound: number; notes: string }

const fromRow = (r: CustomRow): Exercise => ({
  id: `custom-${r.id}`, name: r.name, muscle: r.muscle, secondary: [], equipment: r.equipment,
  compound: !!r.compound, level: 'beginner', category: 'strength',
  instructions: r.notes ? [r.notes] : [], images: [], staple: false, custom: true,
});

export async function customExercises(): Promise<Exercise[]> {
  const db = await getDb();
  return (await db.getAllAsync<CustomRow>('SELECT * FROM custom_exercises ORDER BY name')).map(fromRow);
}

export async function addCustomExercise(e: { name: string; muscle: Muscle; equipment: Equipment; compound: boolean; notes: string }) {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO custom_exercises (name, muscle, equipment, compound, notes) VALUES (?, ?, ?, ?, ?)',
    e.name, e.muscle, e.equipment, e.compound ? 1 : 0, e.notes,
  );
}

export async function deleteCustomExercise(id: string) {
  const db = await getDb();
  await db.runAsync('DELETE FROM custom_exercises WHERE id = ?', Number(id.replace('custom-', '')));
}

/** Bundled library plus the user's own exercises. */
export async function fullCatalog(): Promise<Exercise[]> {
  return [...(await customExercises()), ...LIBRARY];
}

// ---- programs ---------------------------------------------------------------

export interface StoredProgram extends ProgramDraft { id: number }

export async function saveProgram(draft: ProgramDraft, id?: number): Promise<number> {
  const db = await getDb();
  let programId = id ?? 0;
  await db.withTransactionAsync(async () => {
    if (id) {
      await db.runAsync('UPDATE programs SET name = ?, goal = ? WHERE id = ?', draft.name, draft.goal, id);
      await db.runAsync('DELETE FROM program_days WHERE program_id = ?', id); // cascades to items
    } else {
      programId = (await db.runAsync('INSERT INTO programs (name, goal, created_at) VALUES (?, ?, ?)', draft.name, draft.goal, Date.now())).lastInsertRowId;
    }
    for (const [di, day] of draft.days.entries()) {
      const d = await db.runAsync('INSERT INTO program_days (program_id, position, name) VALUES (?, ?, ?)', programId, di, day.name);
      for (const [ii, it] of day.items.entries()) {
        await db.runAsync(
          'INSERT INTO program_items (day_id, position, exercise_id, sets, rep_min, rep_max, rir, rest) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          d.lastInsertRowId, ii, it.exerciseId, it.sets, it.repMin, it.repMax, it.rir, it.rest ?? null,
        );
      }
    }
  });
  return programId;
}

export async function getProgram(id: number): Promise<StoredProgram | null> {
  const db = await getDb();
  const p = await db.getFirstAsync<{ id: number; name: string; goal: Goal | 'custom' }>('SELECT id, name, goal FROM programs WHERE id = ?', id);
  if (!p) return null;
  const days = await db.getAllAsync<{ id: number; name: string }>('SELECT id, name FROM program_days WHERE program_id = ? ORDER BY position', id);
  const out: StoredProgram = { ...p, days: [] };
  for (const d of days) {
    const items = await db.getAllAsync<{ exerciseId: string; sets: number; repMin: number; repMax: number; rir: number; rest: number | null }>(
      'SELECT exercise_id AS exerciseId, sets, rep_min AS repMin, rep_max AS repMax, rir, rest FROM program_items WHERE day_id = ? ORDER BY position', d.id);
    out.days.push({ name: d.name, items });
  }
  return out;
}

export async function listPrograms() {
  const db = await getDb();
  return db.getAllAsync<{ id: number; name: string; goal: string; days: number }>(
    `SELECT p.id, p.name, p.goal, COUNT(d.id) AS days FROM programs p
       LEFT JOIN program_days d ON d.program_id = p.id GROUP BY p.id ORDER BY p.created_at DESC`);
}

/** Remembers a rest time on the program, so the same exercise rests the same way next session. */
export async function setProgramItemRest(programId: number, dayPos: number, exerciseId: string, rest: number | null) {
  const db = await getDb();
  await db.runAsync(
    `UPDATE program_items SET rest = ? WHERE exercise_id = ? AND day_id = (SELECT id FROM program_days WHERE program_id = ? AND position = ?)`,
    rest, exerciseId, programId, dayPos,
  );
}

export async function deleteProgram(id: number) {
  const db = await getDb();
  await db.runAsync('DELETE FROM programs WHERE id = ?', id);
  if ((await getSetting<number | null>('activeProgram', null)) === id) await setSetting('activeProgram', null);
}

export const getActiveProgramId = () => getSetting<number | null>('activeProgram', null);
export const setActiveProgramId = (id: number | null) => setSetting('activeProgram', id);

/** Which day is up next: one past the most recent workout logged against this program. */
export async function nextDayPosition(programId: number, dayCount: number): Promise<number> {
  if (dayCount <= 0) return 0;
  const db = await getDb();
  const row = await db.getFirstAsync<{ day_position: number | null }>(
    'SELECT day_position FROM workouts WHERE program_id = ? AND finished_at IS NOT NULL ORDER BY started_at DESC LIMIT 1', programId);
  return row?.day_position == null ? 0 : (row.day_position + 1) % dayCount;
}

// ---- workout draft (survives the app being killed mid-session) --------------

export async function loadDraft(): Promise<WorkoutDraft | null> {
  try {
    return parseDraft(await getSetting<unknown>(DRAFT_KEY, null));
  } catch {
    return null; // a corrupt draft must never block the screen
  }
}

export const saveDraft = (d: WorkoutDraft) => setSetting(DRAFT_KEY, d);
export const clearDraft = () => setSetting(DRAFT_KEY, null);

// ---- progress report -----------------------------------------------------------

export async function recentWeighIns(limit = 5) {
  const db = await getDb();
  return db.getAllAsync<{ date: string; kg: number }>('SELECT date, kg FROM weigh_ins ORDER BY date DESC LIMIT ?', limit);
}

export async function deleteWeighIn(date: string) {
  const db = await getDb();
  await db.runAsync('DELETE FROM weigh_ins WHERE date = ?', date);
}

export interface WorkoutDetail {
  id: number; started_at: number; finished_at: number; program_id: number | null; day_name: string | null;
  sets: { id: number; exercise_id: string; weight: number; reps: number; rir: number | null; warmup: number }[];
}

export async function workoutDetail(id: number): Promise<WorkoutDetail | null> {
  const db = await getDb();
  const w = await db.getFirstAsync<Omit<WorkoutDetail, 'sets'>>(
    `SELECT w.id, w.started_at, COALESCE(w.finished_at, w.started_at) AS finished_at, w.program_id, d.name AS day_name
       FROM workouts w LEFT JOIN program_days d ON d.program_id = w.program_id AND d.position = w.day_position
      WHERE w.id = ?`, id);
  if (!w) return null;
  const sets = await db.getAllAsync<WorkoutDetail['sets'][number]>(
    'SELECT id, exercise_id, weight, reps, rir, warmup FROM sets WHERE workout_id = ? ORDER BY id', id);
  return { ...w, sets };
}

/** Removes a finished workout and its sets; history, records and "Last" lines all follow. */
export async function deleteWorkout(id: number) {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM sets WHERE workout_id = ?', id);
    await db.runAsync('DELETE FROM workouts WHERE id = ?', id);
  });
}

/** How many workouts were logged against a program, and the weight lifted in them (working sets, kg). */
export async function programStats(programId: number) {
  const db = await getDb();
  const row = await db.getFirstAsync<{ finished: number; volume: number }>(
    `SELECT COUNT(DISTINCT w.id) AS finished, COALESCE(SUM(CASE WHEN s.warmup = 0 THEN s.weight * s.reps END), 0) AS volume
       FROM workouts w LEFT JOIN sets s ON s.workout_id = w.id
      WHERE w.program_id = ? AND w.finished_at IS NOT NULL`, programId);
  return row ?? { finished: 0, volume: 0 };
}

/** Foods eaten before, most recent first, one per distinct name and macros. */
export async function recentFoods(limit = 12) {
  const db = await getDb();
  return db.getAllAsync<{ name: string; kcal: number; protein: number; carbs: number; fat: number }>(
    `SELECT name, kcal, protein, carbs, fat FROM food_log
      GROUP BY name, kcal, protein, carbs, fat ORDER BY MAX(id) DESC LIMIT ?`, limit);
}
