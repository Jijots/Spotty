import { foodForDate, isoDate, recentDays } from './db';
import { estimateTdee, formulaTdee, macroTarget, type MacroTarget } from './lib/nutrition';
import { loadSettings } from './settings';

export interface NutritionToday { kcal: number; protein: number; entries: number; target: MacroTarget }

/** What has been eaten today against today's target, computed the same way as on the Nutrition tab. */
export async function nutritionToday(): Promise<NutritionToday> {
  const [entries, settings, days] = await Promise.all([foodForDate(isoDate()), loadSettings(), recentDays(42)]);
  const est = estimateTdee(days, formulaTdee(settings.profile));
  const target = macroTarget(est.tdee, settings.goalKgPerWeek, settings.profile.weightKg);
  return {
    kcal: Math.round(entries.reduce((s, e) => s + e.kcal, 0)),
    protein: Math.round(entries.reduce((s, e) => s + e.protein, 0)),
    entries: entries.length,
    target,
  };
}
