import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ui } from './theme';

/** Scroll content that ends above the system navigation bar, so the last card is never under the Android buttons. */
export function useContentStyle(extra: { paddingTop?: number } = {}) {
  const bottom = useSafeAreaInsets().bottom;
  return [ui.content, extra, { paddingBottom: 16 + bottom }];
}
