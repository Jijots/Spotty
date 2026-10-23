import { useEffect } from 'react';
import { AccessibilityInfo, Text, TouchableOpacity, View } from 'react-native';
import { PR_LABEL } from './lib/records';
import type { Summary } from './lib/summary';
import { colors, type, ui } from './theme';

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View style={[ui.row, { justifyContent: 'space-between', minHeight: 32 }]}>
      <Text style={type.meta}>{label}</Text>
      <Text style={type.action}>{value}</Text>
    </View>
  );
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/**
 * The payoff after Finish: what you did, any records, what is next. Plain facts in a short list,
 * with the accent used only for the records, which is the one thing worth lighting up.
 */
export function SummaryView({ summary, onDone, onReopen, reopening }: {
  summary: Summary; onDone: () => void;
  /** Undo a mistaken Finish. Omitted when the workout can no longer be reopened. */
  onReopen?: () => void; reopening?: boolean;
}) {
  const s = summary;
  const headline = s.prs.length ? `${plural(s.prs.length, 'new personal record')}.` : 'Saved to your history.';
  // The screen swaps in under the user's finger; tell screen-reader users the workout is finished.
  useEffect(() => { AccessibilityInfo.announceForAccessibility(`${s.title}. ${headline}`); }, [s.title, headline]);
  return (
    <View style={{ gap: 12 }}>
      <Text style={ui.h1} accessibilityRole="header">{s.title}</Text>
      <Text style={ui.muted}>{headline}</Text>

      <View style={[ui.card, { gap: 4 }]}>
        <Line label="Sets" value={`${s.sets} across ${plural(s.exercises, 'exercise')}`} />
        <Line label="Volume" value={`${s.volume.toLocaleString()} ${s.unit}`} />
        <Line label="Time" value={s.minutes < 1 ? 'under a minute' : `${s.minutes} min`} />
      </View>

      {s.prs.length > 0 && (
        <View style={[ui.card, { gap: 10 }]}>
          {s.prs.map((p) => (
            <View key={p.name} style={[ui.row, { gap: 10, alignItems: 'flex-start' }]}>
              <View style={{ backgroundColor: colors.record, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, marginTop: 1 }}>
                <Text style={[type.header, { color: colors.onRecord, fontWeight: '700' }]}>PR</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={ui.h2}>{p.name}</Text>
                <Text style={type.meta}>{p.kinds.map((k) => PR_LABEL[k]).join(' + ')}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {s.next && <Text style={ui.muted}>Up next: {s.next}</Text>}

      <TouchableOpacity style={ui.button} onPress={onDone} disabled={reopening} accessibilityRole="button">
        <Text style={ui.buttonText}>Done</Text>
      </TouchableOpacity>

      {onReopen && (
        <View style={{ gap: 6 }}>
          <TouchableOpacity
            style={[ui.ghost, reopening && { opacity: 0.6 }]} onPress={onReopen} disabled={reopening} accessibilityRole="button"
            accessibilityHint="Removes this workout from your history and brings your sets back so you can change them">
            <Text style={ui.ghostText}>{reopening ? 'Reopening…' : 'Reopen workout'}</Text>
          </TouchableOpacity>
          <Text style={[type.meta, { textAlign: 'center' }]}>Finished by mistake? Reopening takes it out of your history until you finish again.</Text>
        </View>
      )}
    </View>
  );
}
