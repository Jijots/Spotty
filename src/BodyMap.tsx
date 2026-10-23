import { Text, View } from 'react-native';
import Body from 'react-native-body-highlighter';
import type { Muscle } from './data/exercises';
import { FOCUS, SIDE, bodyData, mixHex } from './lib/body';
import { colors, type } from './theme';

type Levels = Partial<Record<Muscle, number>>;

const neutral = (ground: string) => mixHex(ground, colors.border, 0.75);

/** Four shades from faint to full highlight, blended against the card so they read in both themes. */
export const shadeRamp = (ground: string) => [0.35, 0.55, 0.78, 1].map((t) => mixHex(neutral(ground), colors.highlight, t));

/** Head, hair, hands and feet stay in the neutral tone instead of the library's own light skin color. */
const NEUTRAL_PARTS = ['head', 'hair', 'hands', 'feet', 'neck', 'ankles', 'knees'] as const;
const withNeutralParts = (data: ReturnType<typeof bodyData>, fill: string) => [
  ...NEUTRAL_PARTS.map((slug) => ({ slug, color: fill })), ...data,
];

/** Front and back figure with muscles shaded by level (0..1). Decoration only: describe the data in text beside it. */
export function BodyMap({ levels, scale = 0.6, ground = colors.card }: { levels: Levels; scale?: number; ground?: string }) {
  const data = withNeutralParts(bodyData(levels), neutral(ground));
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }} accessible={false} importantForAccessibility="no-hide-descendants">
      {(['front', 'back'] as const).map((side) => (
        <Body key={side} side={side} scale={scale} data={data} colors={shadeRamp(ground)} border="none" defaultFill={neutral(ground)} />
      ))}
    </View>
  );
}

/** A strip from strong to faint color, with the two end labels. */
export function LevelLegend({ high, low }: { high: string; low: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }} accessible={false} importantForAccessibility="no-hide-descendants">
      <Text style={type.meta}>{high}</Text>
      <View style={{ flexDirection: 'row', borderRadius: 4, overflow: 'hidden' }}>
        {shadeRamp(colors.card).slice().reverse().map((c) => <View key={c} style={{ width: 22, height: 8, backgroundColor: c }} />)}
      </View>
      <Text style={type.meta}>{low}</Text>
    </View>
  );
}

/** Square exercise tile: one body view framed on the area worked, primary muscle solid and secondary lighter. */
export function MuscleTile({ muscle, secondary = [], size }: { muscle: Muscle; secondary?: Muscle[]; size: number }) {
  const ground = colors.bg;
  const levels: Levels = {};
  for (const m of secondary) levels[m] = 0.4;
  levels[muscle] = 1;
  // The figure is drawn about 1.7 tiles tall, then slid so the worked area sits mid-tile.
  const h = size * 1.7;
  const { y, size: win } = FOCUS[muscle];
  const top = Math.min(0, Math.max(size - h, size / 2 - ((y + win / 2) / 200) * h));
  return (
    <View style={{ width: size, height: size, overflow: 'hidden', alignItems: 'center' }} accessible={false}>
      <View style={{ position: 'absolute', top }}>
        <Body side={SIDE[muscle]} scale={h / 400} data={withNeutralParts(bodyData(levels), mixHex(ground, colors.border, 1))} colors={shadeRamp(ground)} border="none" defaultFill={mixHex(ground, colors.border, 1)} />
      </View>
    </View>
  );
}
