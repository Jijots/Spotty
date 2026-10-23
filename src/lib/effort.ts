/** How hard a set was, from reps left in reserve. Level 0 (very easy) to 4 (nothing left). */
export interface Effort { level: 0 | 1 | 2 | 3 | 4; word: string }

export function effortFor(rir: string): Effort | null {
  if (rir === '' || !/^\d$/.test(rir)) return null;
  const n = Number(rir);
  if (n === 0) return { level: 4, word: 'all-out' };
  if (n === 1) return { level: 3, word: 'hard' };
  if (n === 2) return { level: 2, word: 'moderate' };
  if (n === 3) return { level: 1, word: 'easy' };
  return { level: 0, word: 'very easy' };
}

/** Black or white text, whichever reads better on a #RRGGBB fill. */
export function readableOn(hex: string, dark = '#0A2A52', light = '#FFFFFF'): string {
  const lin = (i: number) => {
    const c = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const lum = 0.2126 * lin(0) + 0.7152 * lin(1) + 0.0722 * lin(2);
  return lum > 0.35 ? dark : light;
}
