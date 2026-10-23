export interface FoodItem { name: string; kcal: number; protein: number; carbs: number; fat: number }

export const foodKey = (f: FoodItem) => [f.name.trim().toLowerCase(), f.kcal, f.protein, f.carbs, f.fat].join('|');

export interface QuickFood { item: FoodItem; favorite: boolean }

/** Favorites first, then recent foods that are not already favorites, without repeats. */
export function quickList(favorites: FoodItem[], recents: FoodItem[], limit = 12): QuickFood[] {
  const seen = new Set<string>();
  const out: QuickFood[] = [];
  for (const [list, favorite] of [[favorites, true], [recents, false]] as const) {
    for (const item of list) {
      const key = foodKey(item);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ item, favorite });
    }
  }
  return out.slice(0, limit);
}

export interface FoodForm { name: string; kcal: string; protein: string; carbs: string; fat: string }

const num = (t: string) => (t.trim() === '' ? null : Number(t));

/** Says what is wrong in plain words, one problem at a time, so nothing fails silently. */
export function validateFood(f: FoodForm): { error: string } | { value: FoodItem } {
  const name = f.name.trim();
  if (!name) return { error: 'Name the food first.' };
  const kcal = num(f.kcal);
  if (kcal === null) return { error: 'Enter the calories, even a rough number.' };
  if (!Number.isFinite(kcal) || kcal < 0) return { error: 'Calories must be a number, 0 or more.' };
  if (kcal > 5000) return { error: 'That is over 5,000 calories for one item. Check the number.' };
  const macros: Record<'protein' | 'carbs' | 'fat', number> = { protein: 0, carbs: 0, fat: 0 };
  for (const k of ['protein', 'carbs', 'fat'] as const) {
    const v = num(f[k]);
    if (v === null) continue; // macros are optional
    if (!Number.isFinite(v) || v < 0) return { error: `${k.charAt(0).toUpperCase()}${k.slice(1)} must be a number, 0 or more.` };
    if (v > 500) return { error: `${k.charAt(0).toUpperCase()}${k.slice(1)} looks too high. Check the number.` };
    macros[k] = v;
  }
  return { value: { name, kcal, ...macros } };
}
