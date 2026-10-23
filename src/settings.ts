import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { DEFAULT_EQUIPMENT, DEFAULT_PROFILE, getSetting, setSetting } from './db';
import type { Equipment } from './data/exercises';
import type { Profile } from './lib/nutrition';
import type { Unit } from './lib/units';

export interface Settings {
  profile: Profile;
  goalKgPerWeek: number;
  equipment: Equipment[];
  unit: Unit;
  onboarded: boolean;
  /** Seconds of rest after a working set. */
  rest: { compound: number; isolation: number };
  /** Android: hide the system navigation buttons; swiping up from the bottom shows them again. */
  immersive: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  profile: DEFAULT_PROFILE,
  goalKgPerWeek: 0,
  equipment: DEFAULT_EQUIPMENT,
  unit: 'kg',
  onboarded: false,
  rest: { compound: 120, isolation: 75 },
  immersive: true,
};

export async function loadSettings(): Promise<Settings> {
  const [profile, goalKgPerWeek, equipment, unit, onboarded, rest, immersive] = await Promise.all([
    getSetting('profile', DEFAULT_SETTINGS.profile),
    getSetting('goalKgPerWeek', DEFAULT_SETTINGS.goalKgPerWeek),
    getSetting('equipment', DEFAULT_SETTINGS.equipment),
    getSetting<Unit>('unit', DEFAULT_SETTINGS.unit),
    getSetting('onboarded', DEFAULT_SETTINGS.onboarded),
    getSetting('rest', DEFAULT_SETTINGS.rest),
    getSetting('immersive', DEFAULT_SETTINGS.immersive),
  ]);
  return { profile, goalKgPerWeek, equipment, unit, onboarded, rest, immersive };
}

const listeners = new Set<(onboarded: boolean) => void>();
export const subscribeOnboarded = (fn: (onboarded: boolean) => void) => {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
};

const immersiveListeners = new Set<(on: boolean) => void>();
export const subscribeImmersive = (fn: (on: boolean) => void) => {
  immersiveListeners.add(fn);
  return () => { immersiveListeners.delete(fn); };
};

export async function saveSettings(s: Settings) {
  await Promise.all([
    setSetting('profile', s.profile),
    setSetting('goalKgPerWeek', s.goalKgPerWeek),
    setSetting('equipment', s.equipment),
    setSetting('unit', s.unit),
    setSetting('onboarded', s.onboarded),
    setSetting('rest', s.rest),
    setSetting('immersive', s.immersive),
  ]);
  listeners.forEach((fn) => fn(s.onboarded));
  immersiveListeners.forEach((fn) => fn(s.immersive));
}

/** Reloads every time the screen gains focus, so a change in Settings shows up elsewhere. */
export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  useFocusEffect(
    useCallback(() => {
      loadSettings().then((s) => { setSettings(s); setLoaded(true); });
    }, []),
  );
  return { settings, loaded };
}
