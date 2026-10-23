import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { getSetting, setSetting } from './db';
import { checkLicense, type LicenseCheck } from './lib/license';

const KEY = 'licenseKey';

/** What the stored key says right now: valid, expired, or none. Re-checked each time so an expiry takes effect. */
export async function loadLicense(): Promise<LicenseCheck> {
  const stored = await getSetting<string>(KEY, '');
  return checkLicense(stored);
}

/** Saves a key only if it is valid, and says why not if it is not. */
export async function activateLicense(raw: string): Promise<LicenseCheck> {
  const result = checkLicense(raw);
  if (result.ok) await setSetting(KEY, raw.replace(/\s+/g, ''));
  return result;
}

export const removeLicense = () => setSetting(KEY, '');

/** Pro status for a screen, refreshed whenever it gains focus (so activating in Settings shows up elsewhere). */
export function useProStatus() {
  const [license, setLicense] = useState<LicenseCheck | null>(null);
  useFocusEffect(useCallback(() => { loadLicense().then(setLicense).catch(() => setLicense(null)); }, []));
  return { license, loaded: license !== null, isPro: license?.ok === true };
}
