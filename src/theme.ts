import { Appearance, StyleSheet } from 'react-native';

/** Minimum touch target in dp: Android's 48, which also clears iOS's 44 pt. */
export const TARGET = 48;

/** Padding inside a card; the card's edge-to-edge footer strips use the same value as a negative margin. */
export const CARD_PAD = 14;

/** A full pill: buttons and chips are fully rounded whatever their height. */
export const PILL = 999;

/** Exercise photos are white-ground illustrations, so their tile is white in both themes. */
export const PHOTO_TILE = '#FFFFFF';

export type Scheme = 'dark' | 'light';

export interface Palette {
  bg: string;
  card: string;
  border: string;
  text: string;
  muted: string;
  /** The action color: fills and outlines for the main action, the current set, a finished set, a selected chip. */
  accent: string;
  /** The accent as text (links, labels), tuned per theme so it always reads. */
  accentText: string;
  /** Text and marks drawn on top of an accent fill. */
  onAccent: string;
  /** A second, lighter blue for focus rings, charts and secondary emphasis. */
  highlight: string;
  /** Personal records only. The one warm color in the app, so a PR is the one moment that glows. */
  record: string;
  onRecord: string;
  danger: string;
  /** Five blues for data (muscle volume, recovery), ordered from least to most; steps differ in lightness, not only hue. */
  ramp: string[];
}

// Material Blue, from the product owner's palette: 50 #E3F2FD, 200 #90CAF9, 500 #2196F3, 900 #0D47A1.
// Light: blue-50 ground, white cards, blue-200 borders, blue-900 as the action color.
// Dark: a near-black ground with clearly lighter cards (1.36:1, so every card separates at a glance), blue-50 ink,
// blue-500 as the action fill, blue-200 for links.
// Added roles: amber for personal records only, red for danger, and a five-step blue ramp for data views.
// Every derived value is contrast-checked: text pairs >= 4.5:1, fills and outlines >= 3:1 (lowest text pair 4.9:1).
const palettes: Record<Scheme, Palette> = {
  dark: {
    bg: '#0A0C10', card: '#232A36', border: '#3A4658', text: '#EAF1F8', muted: '#9AA8BA',
    accent: '#2196F3', accentText: '#90CAF9', onAccent: '#06122A', highlight: '#64B5F6',
    record: '#FFC107', onRecord: '#1A1200', danger: '#FF8A94',
    ramp: ['#12335F', '#1E5AA8', '#2196F3', '#64B5F6', '#BBDEFB'],
  },
  light: {
    bg: '#E3F2FD', card: '#FFFFFF', border: '#90CAF9', text: '#0A2A52', muted: '#44608A',
    accent: '#0D47A1', accentText: '#0D47A1', onAccent: '#FFFFFF', highlight: '#2196F3',
    record: '#FFB300', onRecord: '#1A1200', danger: '#C62828',
    ramp: ['#E3F2FD', '#90CAF9', '#42A5F5', '#1976D2', '#0D47A1'],
  },
};

// Manrope (open license) for headings only. Numbers stay on the system face so columns line up.
const HEADING_FONT = 'Manrope_700Bold';
const DISPLAY_FONT = 'Manrope_800ExtraBold';

let scheme: Scheme = Appearance.getColorScheme() === 'light' ? 'light' : 'dark';
let fontsLoaded = false;
const cache = new Map<string, Built>();

/** Called by the root layout from the system setting, before any screen renders. */
export const setScheme = (s: Scheme) => { scheme = s; };
export const getScheme = () => scheme;
export const setFontsLoaded = (ok: boolean) => { if (ok !== fontsLoaded) { fontsLoaded = ok; cache.clear(); } };

function build(s: Scheme, headingFonts: boolean) {
  const c = palettes[s];

  const type = StyleSheet.create({
    /** The numbers you read and edit mid-set: weight, reps, RIR. */
    data: { color: c.text, fontSize: 20, fontWeight: '600', fontVariant: ['tabular-nums'] },
    /** Secondary facts under a title: targets, last session. */
    meta: { color: c.muted, fontSize: 13, fontVariant: ['tabular-nums'] },
    /** Column headers and set numbers. */
    header: { color: c.muted, fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'] },
    /** Button and action labels inside the app chrome. */
    action: { color: c.text, fontSize: 15, fontWeight: '600', fontVariant: ['tabular-nums'] },
    /** The rest-timer countdown, readable at arm's length. */
    countdown: { color: c.text, fontSize: 26, fontWeight: '700', fontVariant: ['tabular-nums'] },
  });

  // A custom family carries its own weight; adding fontWeight on top would fake-bold it.
  const h1 = headingFonts
    ? { color: c.text, fontFamily: DISPLAY_FONT, fontSize: 26, letterSpacing: -0.6 }
    : { color: c.text, fontSize: 24, fontWeight: '700' as const };
  const h2 = headingFonts
    ? { color: c.text, fontFamily: HEADING_FONT, fontSize: 17, letterSpacing: -0.2 }
    : { color: c.text, fontSize: 17, fontWeight: '600' as const };

  const ui = StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    content: { padding: 16, gap: 12 },
    card: { backgroundColor: c.card, borderRadius: 14, padding: CARD_PAD, borderWidth: 1, borderColor: c.border },
    h1,
    h2,
    text: { color: c.text, fontSize: 15 },
    muted: { color: c.muted, fontSize: 13 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    input: {
      backgroundColor: c.bg, color: c.text, borderRadius: 10, borderWidth: 1,
      borderColor: c.border, paddingHorizontal: 10, paddingVertical: 8, fontSize: 15, minWidth: 56,
    },
    button: { backgroundColor: c.accent, borderRadius: PILL, paddingVertical: 12, minHeight: 52, alignItems: 'center', justifyContent: 'center' },
    buttonText: { color: c.onAccent, fontWeight: '700', fontSize: 16 },
    ghost: { borderRadius: PILL, paddingVertical: 10, minHeight: TARGET, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.border },
    ghostText: { color: c.text, fontWeight: '600' },
  });

  /** Keeps text fields on the current theme: matching iOS keyboard, accent caret and selection. */
  const inputTheme = {
    keyboardAppearance: s,
    selectionColor: c.accent,
    cursorColor: c.accent,
    placeholderTextColor: c.muted,
  } as const;

  return { colors: c, type, ui, inputTheme };
}

type Built = ReturnType<typeof build>;

function current(): Built {
  const key = `${scheme}:${fontsLoaded}`;
  let b = cache.get(key);
  if (!b) { b = build(scheme, fontsLoaded); cache.set(key, b); }
  return b;
}

/**
 * `colors`, `type`, `ui` and `inputTheme` read the current theme every time they are accessed, so screens
 * import them as plain values. The root layout remounts the tree when the system theme changes, which is
 * what makes them re-read. Never copy a style into a module-level constant: it would freeze the first theme.
 */
function live<K extends keyof Built>(part: K): Built[K] {
  return new Proxy({} as Built[K], {
    get: (_, prop) => (current()[part] as Record<PropertyKey, unknown>)[prop],
    ownKeys: () => Reflect.ownKeys(current()[part] as object),
    getOwnPropertyDescriptor: (_, prop) => ({ enumerable: true, configurable: true, value: (current()[part] as Record<PropertyKey, unknown>)[prop] }),
    has: (_, prop) => prop in (current()[part] as object),
  });
}

export const colors = live('colors');
export const type = live('type');
export const ui = live('ui');
export const inputTheme = live('inputTheme');
