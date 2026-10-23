import type { Equipment } from '../data/exercises';

export type Unit = 'kg' | 'lb';

export const LB_PER_KG = 2.20462;

const round = (n: number, step: number) => Math.round(n / step) * step;

/** kg (storage) -> number shown to the user. */
export const fromKg = (kg: number, unit: Unit) =>
  unit === 'kg' ? Math.round(kg * 100) / 100 : round(kg * LB_PER_KG, 0.5);

/** number typed by the user -> kg (storage). */
export const toKg = (v: number, unit: Unit) => (unit === 'kg' ? v : v / LB_PER_KG);

/** Smallest sensible plate jump, expressed in kg. */
export const weightStepKg = (unit: Unit) => (unit === 'kg' ? 2.5 : 5 / LB_PER_KG);

export const fmt = (kg: number, unit: Unit) => `${fromKg(kg, unit)} ${unit}`;

/** What the +/- weight buttons add, in the unit on screen, matching how that equipment is actually loaded. */
const STEP_BY_EQUIPMENT: Record<Unit, Partial<Record<Equipment, number>> & { default: number }> = {
  kg: { barbell: 2.5, dumbbell: 2, machine: 5, cable: 2.5, kettlebell: 4, default: 2.5 },
  lb: { barbell: 5, dumbbell: 5, machine: 10, cable: 5, kettlebell: 10, default: 5 },
};
export const stepFor = (equipment: Equipment, unit: Unit) => STEP_BY_EQUIPMENT[unit][equipment] ?? STEP_BY_EQUIPMENT[unit].default;

/** Height for people who think in feet and inches. */
export const cmToFtIn = (cm: number) => {
  const total = Math.round(cm / 2.54);
  return { ft: Math.floor(total / 12), inch: total % 12 };
};
export const ftInToCm = (ft: number, inch: number) => Math.round((ft * 12 + inch) * 2.54);
