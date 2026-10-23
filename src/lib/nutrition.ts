// Adaptive expenditure: estimates TDEE from what you actually ate and how your
// smoothed weight trend moved, the same idea MacroFactor popularised.

export const KCAL_PER_KG = 7700;

export interface DayData {
  date: string; // YYYY-MM-DD
  kcal: number | null; // null = not logged
  weightKg: number | null; // null = no weigh-in
}

export interface Profile {
  sex: 'male' | 'female';
  age: number;
  heightCm: number;
  weightKg: number;
  activity: number; // 1.2 sedentary .. 1.9 very active
}

/** Mifflin-St Jeor, used until there is enough data to learn from. */
export function formulaTdee(p: Profile): number {
  const bmr = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + (p.sex === 'male' ? 5 : -161);
  return Math.round(bmr * p.activity);
}

/** Exponentially smoothed weight, interpolating days without a weigh-in. */
export function trendWeights(days: DayData[], alpha = 0.1): (number | null)[] {
  const out: (number | null)[] = [];
  let trend: number | null = null;
  for (const d of days) {
    if (d.weightKg != null) trend = trend == null ? d.weightKg : trend + alpha * (d.weightKg - trend);
    out.push(trend);
  }
  return out;
}

export interface TdeeEstimate {
  tdee: number;
  confidence: number; // 0..1, how much the number is driven by data vs. the formula
  trendKgPerWeek: number | null;
}

/**
 * days must be consecutive, oldest first. Uses the most recent `window` days.
 * TDEE = avg intake - (weight slope in kcal per day).
 */
export function estimateTdee(days: DayData[], fallback: number, window = 28): TdeeEstimate {
  const recent = days.slice(-window);
  const logged = recent.filter((d) => d.kcal != null);
  const weighed = recent.map((d, i) => ({ x: i, y: d.weightKg })).filter((p): p is { x: number; y: number } => p.y != null);

  if (logged.length < 7 || weighed.length < 3) {
    return { tdee: fallback, confidence: 0, trendKgPerWeek: null };
  }

  // Least-squares slope of raw weigh-ins: unlike the smoothed trend it has no warm-up lag.
  const n = weighed.length;
  const mx = weighed.reduce((s, p) => s + p.x, 0) / n;
  const my = weighed.reduce((s, p) => s + p.y, 0) / n;
  const sxx = weighed.reduce((s, p) => s + (p.x - mx) ** 2, 0);
  if (sxx === 0) return { tdee: fallback, confidence: 0, trendKgPerWeek: null };
  const kgPerDay = weighed.reduce((s, p) => s + (p.x - mx) * (p.y - my), 0) / sxx;
  const spanDays = weighed[n - 1].x - weighed[0].x;

  const avgIntake = logged.reduce((s, d) => s + (d.kcal as number), 0) / logged.length;
  const learned = avgIntake - kgPerDay * KCAL_PER_KG;

  const confidence = Math.min(logged.length / 21, 1) * Math.min(spanDays / 14, 1);
  // Never trust a learned value that is physiologically absurd.
  const bounded = Math.min(Math.max(learned, fallback * 0.6), fallback * 1.6);
  return {
    tdee: Math.round(confidence * bounded + (1 - confidence) * fallback),
    confidence,
    trendKgPerWeek: kgPerDay * 7,
  };
}

export interface MacroTarget {
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
}

/** goalKgPerWeek: negative to cut, positive to bulk. */
export function macroTarget(tdee: number, goalKgPerWeek: number, weightKg: number): MacroTarget {
  const kcal = Math.round(tdee + (goalKgPerWeek * KCAL_PER_KG) / 7);
  const protein = Math.round(weightKg * 2.0);
  const fat = Math.round((kcal * 0.25) / 9);
  const carbs = Math.max(Math.round((kcal - protein * 4 - fat * 9) / 4), 0);
  return { kcal, protein, fat, carbs };
}
