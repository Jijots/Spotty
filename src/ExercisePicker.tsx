import { useMemo, useState } from 'react';
import { FlatList, Modal, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { Exercise } from './data/exercises';
import { cap } from './lib/text';
import { Thumb } from './Thumb';
import { PILL, TARGET, colors, inputTheme, type, ui } from './theme';

const STRENGTH = ['strength', 'powerlifting', 'olympic weightlifting', 'strongman'];
const worked = (ex: Exercise) => [ex.muscle, ...ex.secondary.slice(0, 2)].map(cap).join(', ');

export function ExercisePicker({ visible, catalog, suggestions, title, onPick, onClose }: {
  visible: boolean;
  catalog: Exercise[];
  /** Shown first while the search box is empty (e.g. swap ideas). */
  suggestions?: Exercise[];
  title?: string;
  onPick: (e: Exercise) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const rows = useMemo(() => {
    if (!q && suggestions?.length) return suggestions;
    return catalog.filter((x) => (x.custom || STRENGTH.includes(x.category)) && (!q || x.name.toLowerCase().includes(q))).slice(0, 100);
  }, [catalog, q, suggestions]);

  const close = () => { setQuery(''); onClose(); };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close}>
      <View style={[ui.screen, { paddingTop: insets.top + 8 }]}>
        <View style={[ui.row, { paddingHorizontal: 16, paddingBottom: 8 }]}>
          <TextInput
            style={[ui.input, { flex: 1, minHeight: TARGET, borderRadius: PILL, paddingHorizontal: 18 }]} placeholder="Search all exercises" {...inputTheme}
            accessibilityLabel="Search all exercises" value={query} onChangeText={setQuery} autoCorrect={false} returnKeyType="search" />
          <TouchableOpacity onPress={close} accessibilityRole="button" style={{ minHeight: TARGET, paddingHorizontal: 8, justifyContent: 'center' }}>
            <Text style={[type.action, { color: colors.accentText }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
        {!q && suggestions?.length ? <Text style={[type.header, { paddingHorizontal: 16, letterSpacing: 0.6, textTransform: 'uppercase' }]}>{title ?? 'Suggested'}</Text> : null}
        <FlatList
          data={rows}
          keyExtractor={(x) => x.id}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={8} maxToRenderPerBatch={6} windowSize={5} removeClippedSubviews
          contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 16 + insets.bottom }}
          ListEmptyComponent={<Text style={ui.muted}>No matches. Try a shorter name.</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[ui.card, { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, minHeight: 72 }]} accessibilityRole="button"
              accessibilityLabel={`${item.name}, ${worked(item)}, ${cap(item.equipment)}`} onPress={() => { setQuery(''); onPick(item); }}>
              <Thumb exercise={item} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={ui.h2} numberOfLines={2}>{item.name}</Text>
                <Text style={type.meta} numberOfLines={1}>{worked(item)} · {cap(item.equipment)}</Text>
              </View>
              <Ionicons name="add-circle-outline" size={24} color={colors.accentText} />
            </TouchableOpacity>
          )}
        />
      </View>
    </Modal>
  );
}
