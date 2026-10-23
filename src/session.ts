import { Alert } from 'react-native';
import type { useRouter } from 'expo-router';
import { clearDraft, loadDraft, setActiveProgramId } from './db';

type AppRouter = ReturnType<typeof useRouter>;

export type SessionRequest = { mode: 'program'; programId: number; day: number } | { mode: 'auto' };

/**
 * Opens a workout session (a full-screen logger with a clock and rest timers). Only one session runs at a time:
 * if one is already open, the user chooses whether to resume it or discard it and start this one.
 */
export async function startSession(router: AppRouter, req: SessionRequest) {
  const go = async () => {
    if (req.mode === 'program') await setActiveProgramId(req.programId);
    router.push({
      pathname: '/session',
      params: req.mode === 'program' ? { mode: 'program', programId: String(req.programId), day: String(req.day) } : { mode: 'auto' },
    });
  };
  const open = await loadDraft().catch(() => null);
  if (!open) return go();
  Alert.alert('Workout in progress', 'Resume it, or discard it and start this one instead?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Resume', onPress: () => router.push('/session') },
    { text: 'Discard and start', style: 'destructive', onPress: async () => { await clearDraft().catch(() => {}); await go(); } },
  ]);
}
