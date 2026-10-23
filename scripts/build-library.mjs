// Converts free-exercise-db (Unlicense / public domain, github.com/yuhonas/free-exercise-db)
// into src/data/library.json using this app's muscle/equipment taxonomy.
// Usage: node scripts/build-library.mjs path/to/exercises.json
import { readFileSync, writeFileSync } from 'node:fs';

const src = process.argv[2];
if (!src) throw new Error('usage: node scripts/build-library.mjs <exercises.json>');
const raw = JSON.parse(readFileSync(src, 'utf8'));

const MUSCLE = {
  abdominals: 'core', hamstrings: 'hamstrings', adductors: 'glutes', abductors: 'glutes',
  quadriceps: 'quads', biceps: 'biceps', shoulders: 'shoulders', chest: 'chest',
  'middle back': 'back', 'lower back': 'back', lats: 'back', traps: 'back', neck: 'shoulders',
  calves: 'calves', glutes: 'glutes', triceps: 'triceps', forearms: 'forearms',
};
const EQUIP = {
  'body only': 'bodyweight', machine: 'machine', cable: 'cable', barbell: 'barbell', 'e-z curl bar': 'barbell',
  dumbbell: 'dumbbell', kettlebells: 'kettlebell', bands: 'bands',
};

// Staples drive the workout generator so it doesn't pick obscure moves.
const STAPLES = `Barbell_Bench_Press_-_Medium_Grip Incline_Dumbbell_Press Dumbbell_Bench_Press Machine_Bench_Press Pushups
Dumbbell_Flyes Flat_Bench_Cable_Flyes Butterfly Barbell_Incline_Bench_Press_-_Medium_Grip Dips_-_Chest_Version
Barbell_Deadlift Bent_Over_Barbell_Row Pullups Chin-Up Wide-Grip_Lat_Pulldown Seated_Cable_Rows One-Arm_Dumbbell_Row
Straight-Arm_Pulldown Lying_T-Bar_Row V-Bar_Pulldown Inverted_Row
Barbell_Shoulder_Press Dumbbell_Shoulder_Press Leverage_Shoulder_Press Side_Lateral_Raise Cable_Seated_Lateral_Raise
Face_Pull Reverse_Flyes Reverse_Machine_Flyes Standing_Military_Press
Barbell_Curl Dumbbell_Bicep_Curl Hammer_Curls Preacher_Curl Machine_Preacher_Curls EZ-Bar_Curl Incline_Dumbbell_Curl High_Cable_Curls
Close-Grip_Barbell_Bench_Press Dips_-_Triceps_Version Triceps_Pushdown Cable_Rope_Overhead_Triceps_Extension
EZ-Bar_Skullcrusher Machine_Triceps_Extension
Barbell_Full_Squat Leg_Press Goblet_Squat Leg_Extensions Dumbbell_Lunges Hack_Squat Split_Squat_with_Dumbbells
Romanian_Deadlift Seated_Leg_Curl Lying_Leg_Curls Stiff-Legged_Dumbbell_Deadlift
Barbell_Hip_Thrust Barbell_Glute_Bridge Single_Leg_Glute_Bridge
Standing_Calf_Raises Seated_Calf_Raise
Plank Cable_Crunch Crunches Hanging_Leg_Raise Ab_Crunch_Machine`.split(/\s+/);
const stapleSet = new Set(STAPLES);

const out = [];
for (const x of raw) {
  const muscle = MUSCLE[x.primaryMuscles?.[0]];
  if (!muscle) continue;
  const secondary = [...new Set((x.secondaryMuscles ?? []).map((m) => MUSCLE[m]).filter((m) => m && m !== muscle))];
  out.push({
    id: x.id,
    name: x.name,
    muscle,
    secondary,
    equipment: x.equipment ? (EQUIP[x.equipment] ?? 'other') : 'bodyweight',
    compound: x.mechanic === 'compound',
    level: x.level,
    category: x.category,
    instructions: x.instructions,
    images: x.images,
    staple: stapleSet.has(x.id) && ['strength', 'powerlifting'].includes(x.category),
  });
}
const found = new Set(out.filter((o) => o.staple).map((o) => o.id));
const missing = STAPLES.filter((s) => !found.has(s));
if (missing.length) console.warn('Unmatched staples:', missing.join(', '));
writeFileSync(new URL('../src/data/library.json', import.meta.url), JSON.stringify(out));
console.log(`wrote ${out.length} exercises, ${found.size} staples`);
