/** Rest between sets, in seconds. A block or program item may carry its own; otherwise the default for its kind applies. */
export const REST_MAX = 15 * 60;

export const clampRest = (s: number) => Math.min(REST_MAX, Math.max(0, Math.round(s)));

/** 150 -> "2:30". */
export const formatRest = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/** Minutes move by 1, seconds by 5, and the result stays between 0:00 and 15:00. */
export const stepRest = (s: number, part: 'min' | 'sec', dir: 1 | -1) => clampRest(s + dir * (part === 'min' ? 60 : 5));

/** What a stored value means: only a sane non-negative number counts as a custom rest. */
export const cleanRest = (x: unknown): number | undefined =>
  typeof x === 'number' && Number.isFinite(x) && x >= 0 ? clampRest(x) : undefined;
