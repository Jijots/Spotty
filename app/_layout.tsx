import { useEffect, useState } from 'react';
import { AppState, Platform, useColorScheme } from 'react-native';
import { NavigationBar } from 'expo-navigation-bar';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Manrope_700Bold, Manrope_800ExtraBold, useFonts } from '@expo-google-fonts/manrope';
import Ionicons from '@expo/vector-icons/Ionicons';
import { loadSettings, subscribeImmersive, subscribeOnboarded } from '../src/settings';
import { colors, setFontsLoaded, setScheme, type Scheme } from '../src/theme';

export default function RootLayout() {
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const [immersive, setImmersive] = useState(true);
  const [fontsReady, fontError] = useFonts({ Manrope_700Bold, Manrope_800ExtraBold, ...Ionicons.font });

  // Follow the phone's light/dark setting. The theme module is set here, before any screen renders.
  const scheme: Scheme = useColorScheme() === 'light' ? 'light' : 'dark';
  setScheme(scheme);
  setFontsLoaded(fontsReady && !fontError);

  useEffect(() => {
    loadSettings().then((s) => { setOnboarded(s.onboarded); setImmersive(s.immersive); });
    const offOnboarded = subscribeOnboarded(setOnboarded);
    const offImmersive = subscribeImmersive(setImmersive);
    return () => { offOnboarded(); offImmersive(); };
  }, []);

  // Android: hide the three system buttons. A swipe up from the bottom brings them back for a moment.
  // They can reappear after the app was in the background, so the setting is applied again on return.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const apply = () => { try { NavigationBar.setHidden(immersive); } catch { /* an unsupported device keeps its buttons */ } };
    apply();
    const sub = AppState.addEventListener('change', (st) => { if (st === 'active') apply(); });
    return () => sub.remove();
  }, [immersive]);

  // Wait for the headings font (or its failure, which falls back to the system face) so text never swaps mid-screen.
  if (onboarded === null || !(fontsReady || fontError)) return null;

  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: { ...base.colors, primary: colors.accentText, background: colors.bg, card: colors.card, text: colors.text, border: colors.border, notification: colors.danger },
  };

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style="auto" />
      {/* Keyed by scheme: switching the phone's theme remounts the tree so every style re-reads the new palette. */}
      <Stack key={scheme} screenOptions={{ headerShown: false }}>
        {/* Onboarding is listed first: until it is done it is the only screen the router may open, so a fresh install lands here. */}
        <Stack.Protected guard={!onboarded}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        <Stack.Protected guard={onboarded}>
          <Stack.Screen name="(tabs)" />
          {/* The workout session is its own full-screen layer over the tabs; the back swipe is off so it cannot be left by accident. */}
          <Stack.Screen name="session" options={{ animation: 'slide_from_bottom', gestureEnabled: false }} />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
