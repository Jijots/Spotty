import { useEffect, useState } from 'react';
import { Modal, Switch, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { formatRest, stepRest } from './lib/rest';
import { PILL, TARGET, colors, type, ui } from './theme';

/** One digit box with a step button above and below, so a time is set with thumb taps instead of a keyboard. */
function Unit({ label, value, onUp, onDown }: { label: string; value: string; onUp: () => void; onDown: () => void }) {
  const arrow = { width: 72, height: TARGET, alignItems: 'center', justifyContent: 'center' } as const;
  return (
    <View style={{ alignItems: 'center' }}>
      <TouchableOpacity onPress={onUp} accessibilityRole="button" accessibilityLabel={`More ${label}`} style={arrow}>
        <Ionicons name="chevron-up" size={26} color={colors.accentText} />
      </TouchableOpacity>
      <View style={{ minWidth: 84, paddingVertical: 10, borderRadius: 16, backgroundColor: colors.bg, alignItems: 'center' }} accessible accessibilityLabel={`${value} ${label}`}>
        <Text style={[type.countdown, { fontSize: 40 }]}>{value}</Text>
      </View>
      <TouchableOpacity onPress={onDown} accessibilityRole="button" accessibilityLabel={`Less ${label}`} style={arrow}>
        <Ionicons name="chevron-down" size={26} color={colors.accentText} />
      </TouchableOpacity>
    </View>
  );
}

/**
 * Sets how long to rest after each working set of one exercise. With the switch off the exercise uses
 * the default for its kind (set in Settings); with it on, the time below is its own.
 */
export function RestDialog({ visible, title, value, defaultSec, onSave, onClose }: {
  visible: boolean; title: string;
  /** The exercise's own rest in seconds, or null to use the default. */
  value: number | null;
  /** What the exercise rests when it has no time of its own. */
  defaultSec: number;
  onSave: (value: number | null) => void; onClose: () => void;
}) {
  const [custom, setCustom] = useState(false);
  const [sec, setSec] = useState(defaultSec);
  useEffect(() => {
    if (!visible) return;
    // Opening the modal starts a fresh editing draft from the saved setting.
    /* eslint-disable react-hooks/set-state-in-effect */
    setCustom(value != null);
    setSec(value ?? defaultSec);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [visible, value, defaultSec]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 }}>
        <View style={{ backgroundColor: colors.card, borderRadius: 28, padding: 20, gap: 14 }}>
          <View style={{ gap: 2 }}>
            <Text style={type.header}>REST TIMER</Text>
            <Text style={ui.h2} numberOfLines={2}>{title}</Text>
          </View>

          <View style={[ui.row, { justifyContent: 'space-between', minHeight: TARGET }]}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={ui.text}>Custom rest for this exercise</Text>
              <Text style={type.meta}>{custom ? 'Used after every working set.' : `Off: uses your default, ${formatRest(defaultSec)}.`}</Text>
            </View>
            <Switch
              value={custom} onValueChange={setCustom} accessibilityLabel="Custom rest for this exercise"
              trackColor={{ true: colors.accent, false: colors.border }} thumbColor={colors.card}
            />
          </View>

          {custom && (
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 }}>
              <Unit label="minutes" value={String(Math.floor(sec / 60)).padStart(2, '0')} onUp={() => setSec(stepRest(sec, 'min', 1))} onDown={() => setSec(stepRest(sec, 'min', -1))} />
              <Text style={[type.countdown, { fontSize: 40 }]}>:</Text>
              <Unit label="seconds" value={String(sec % 60).padStart(2, '0')} onUp={() => setSec(stepRest(sec, 'sec', 1))} onDown={() => setSec(stepRest(sec, 'sec', -1))} />
            </View>
          )}

          <View style={[ui.row, { gap: 12 }]}>
            <TouchableOpacity onPress={onClose} accessibilityRole="button" style={[ui.ghost, { flex: 1 }]}>
              <Text style={ui.ghostText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onSave(custom ? sec : null)} accessibilityRole="button"
              style={{ flex: 1, minHeight: 52, borderRadius: PILL, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={ui.buttonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
