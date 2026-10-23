import { Text, View } from 'react-native';
import { axisLabel, type StripDay, type WeekBin } from './lib/report';
import { colors, type } from './theme';

const PLOT = 132; // height of the drawing area, in dp
const FULL_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Workouts per week as rounded bars. Every bar with a workout carries its number, the axis has real
 * ticks and dashed gridlines, and the current week is the accent color, so nothing relies on guessing a scale.
 */
export function WeekBars({ bins }: { bins: WeekBin[] }) {
  const max = Math.max(0, ...bins.map((b) => b.count));
  const top = Math.max(4, Math.ceil(max / 2) * 2); // an even top, so the middle gridline is a whole number
  const usable = PLOT - 18; // leave room for the number above the tallest bar
  const summary = bins.map((b) => `week of ${axisLabel(b.start).month} ${axisLabel(b.start).day}: ${b.count}`).join('; ');

  return (
    <View accessible accessibilityLabel={`Workouts per week, last ${bins.length} weeks. ${summary}.`}>
      <View style={{ flexDirection: 'row' }}>
        <View style={{ width: 24, height: PLOT }}>
          {[top, top / 2, 0].map((v, i) => (
            <Text key={v} style={[type.meta, { position: 'absolute', top: (i * PLOT) / 2 - 8, fontSize: 11 }]}>{v}</Text>
          ))}
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ height: PLOT }}>
            {[0, 0.5, 1].map((f) => (
              <View key={f} style={{ position: 'absolute', left: 0, right: 0, top: f * PLOT, borderTopWidth: 1, borderStyle: 'dashed', borderColor: colors.border }} />
            ))}
            <View style={{ flexDirection: 'row', height: PLOT, alignItems: 'flex-end' }}>
              {bins.map((b) => (
                <View key={b.start} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
                  {b.count > 0 && <Text style={[type.meta, { fontSize: 11, marginBottom: 2 }]}>{b.count}</Text>}
                  <View style={{
                    width: 16, borderRadius: 8,
                    height: b.count > 0 ? Math.max((b.count / top) * usable, 10) : 5,
                    backgroundColor: b.count === 0 ? colors.border : b.current ? colors.accent : colors.highlight,
                  }} />
                </View>
              ))}
            </View>
          </View>
          <View style={{ flexDirection: 'row', marginTop: 6 }}>
            {bins.map((b) => {
              const l = axisLabel(b.start);
              return (
                <View key={b.start} style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={[type.header, { fontSize: 11 }]}>{l.day}</Text>
                  <Text style={[type.header, { fontSize: 10 }]}>{l.month}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}

/** Seven day circles for the current week: filled where you trained, outlined for today. */
export function WeekStrip({ days }: { days: StripDay[] }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      {days.map((d) => (
        <View
          key={d.time} style={{ alignItems: 'center', gap: 6 }} accessible
          accessibilityLabel={`${FULL_DAYS[new Date(d.time).getDay()]} the ${d.date}${d.done ? ', workout done' : ''}${d.today ? ', today' : ''}`}>
          <Text style={type.header}>{d.letter}</Text>
          <View style={{
            width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
            backgroundColor: d.done ? colors.accent : colors.bg, borderWidth: d.today ? 2 : 0, borderColor: colors.accentText,
          }}>
            <Text style={[type.action, { color: d.done ? colors.onAccent : colors.text }]}>{d.date}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

/**
 * A compact trend: thin bars scaled between the lowest and highest value, with those two values and the date
 * range printed beside them, so the scale is never a guess.
 */
export function TrendBars({ values, unit, startLabel, endLabel }: { values: number[]; unit: string; startLabel: string; endLabel: string }) {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const H = 72;
  const label = (v: number) => `${v.toFixed(1)} ${unit}`;
  return (
    <View accessible accessibilityLabel={`Weight trend from ${startLabel} to ${endLabel}: lowest ${label(lo)}, highest ${label(hi)}.`}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ justifyContent: 'space-between', height: H }}>
          <Text style={[type.meta, { fontSize: 11 }]}>{label(hi)}</Text>
          <Text style={[type.meta, { fontSize: 11 }]}>{label(lo)}</Text>
        </View>
        <View style={{ flex: 1, height: H, flexDirection: 'row', alignItems: 'flex-end', gap: 2 }}>
          {values.map((v, i) => (
            <View key={i} style={{
              flex: 1, borderRadius: 2, backgroundColor: i === values.length - 1 ? colors.accent : colors.highlight,
              height: hi === lo ? H / 2 : 8 + ((v - lo) / (hi - lo)) * (H - 8),
            }} />
          ))}
        </View>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        <Text style={[type.header, { fontSize: 11 }]}>{startLabel}</Text>
        <Text style={[type.header, { fontSize: 11 }]}>{endLabel}</Text>
      </View>
    </View>
  );
}
