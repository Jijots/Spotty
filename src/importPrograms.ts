import { addCustomExercise, customExercises, listPrograms, saveProgram } from './db';
import { draftsFrom, type PersonalData } from './lib/personal';
import personal from './data/personalPrograms.json';

const data = personal as unknown as PersonalData;

export const personalProgramCount = data.programs.length;

/**
 * Adds the saved programs to this phone. Exercises the library lacks become the user's own exercises,
 * and a program whose name already exists is left alone, so running it twice changes nothing.
 */
export async function importPersonalPrograms(): Promise<{ added: number; skipped: number; customs: number }> {
  const idFor: Record<string, string> = {};
  let customs = 0;
  let existing = new Map((await customExercises()).map((e) => [e.name.toLowerCase(), e.id]));
  for (const [key, e] of Object.entries(data.exercises)) {
    if (e.libraryId) { idFor[key] = e.libraryId; continue; }
    let id = existing.get(e.name.toLowerCase());
    if (!id) {
      await addCustomExercise({ name: e.name, muscle: e.muscle, equipment: e.equipment, compound: e.compound, notes: '' });
      existing = new Map((await customExercises()).map((x) => [x.name.toLowerCase(), x.id]));
      id = existing.get(e.name.toLowerCase());
      customs++;
    }
    if (!id) throw new Error(`Could not create ${e.name}`);
    idFor[key] = id;
  }
  const have = new Set((await listPrograms()).map((p) => p.name));
  let added = 0, skipped = 0;
  for (const draft of draftsFrom(data, idFor)) {
    if (have.has(draft.name)) { skipped++; continue; }
    await saveProgram(draft);
    added++;
  }
  return { added, skipped, customs };
}
