import library from './library.json';

export type Muscle =
  | 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps' | 'forearms'
  | 'quads' | 'hamstrings' | 'glutes' | 'calves' | 'core';

export type Equipment = 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight' | 'kettlebell' | 'bands' | 'other';

export interface Exercise {
  id: string;
  name: string;
  muscle: Muscle;
  secondary: Muscle[];
  equipment: Equipment;
  compound: boolean;
  level: 'beginner' | 'intermediate' | 'expert';
  category: string;
  instructions: string[];
  images: string[];
  /** Well-known lifts the generator is allowed to pick. Custom exercises always qualify. */
  staple: boolean;
  custom?: boolean;
}

export const MUSCLES: Muscle[] = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms',
  'quads', 'hamstrings', 'glutes', 'calves', 'core',
];

export const EQUIPMENT: Equipment[] = ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'kettlebell', 'bands', 'other'];

/** 876 exercises from free-exercise-db (public domain), see scripts/build-library.mjs. */
export const LIBRARY = library as unknown as Exercise[];

/** Photos are hosted by the dataset's repo and need a connection the first time they load. */
export const imageUrl = (path: string) =>
  `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${path}`;

const byId = new Map(LIBRARY.map((x) => [x.id, x]));
export const exerciseById = (id: string) => byId.get(id);
