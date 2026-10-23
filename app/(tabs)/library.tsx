import { useCallback, useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, type ViewStyle } from 'react-native';
import { Link, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { fullCatalog, pastSets } from '../../src/db';
import { EQUIPMENT, LIBRARY, MUSCLES, type Equipment, type Exercise, type Muscle } from '../../src/data/exercises';
import { Chip } from '../../src/Chip';
import { Thumb } from '../../src/Thumb';
import { TARGET, colors, inputTheme, type, ui } from '../../src/theme';
import { cap } from '../../src/lib/text';

const MAX_ROWS = 200;
const RECENT_COUNT = 5;
const STRENGTH = ['strength', 'powerlifting', 'olympic weightlifting', 'strongman'];

/** "Chest, Triceps": the muscle worked plus up to two helpers, the way the exercise is described in the gym. */
const worked = (ex: Exercise) => [ex.muscle, ...ex.secondary.slice(0, 2)].map(cap).join(', ');

type Item = { key: string; header: string } | { key: string; ex: Exercise };

export default function LibraryScreen() {
  // expo-router's <Link asChild> needs a single style object on its child, not an array. Built per render so it follows the theme.
  const newButton = StyleSheet.flatten<ViewStyle>([ui.button, { flexDirection: 'row', gap: 4, paddingHorizontal: 16, paddingVertical: 9, minHeight: TARGET }]);
  const exerciseRow = StyleSheet.flatten<ViewStyle>([ui.card, { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, minHeight: 76 }]);

  const [catalog, setCatalog] = useState<Exercise[]>(LIBRARY);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState<Muscle | null>(null);
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [strengthOnly, setStrengthOnly] = useState(true);

  useFocusEffect(useCallback(() => {
    fullCatalog().then(setCatalog);
    pastSets().then((history) => {
      const lastUsed = new Map<string, number>();
      for (const s of history) lastUsed.set(s.exerciseId, Math.max(lastUsed.get(s.exerciseId) ?? 0, s.at));
      setRecentIds([...lastUsed.entries()].sort((a, b) => b[1] - a[1]).slice(0, RECENT_COUNT).map(([id]) => id));
    }).catch(() => {});
  }, []));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog.filter((x) =>
      (!q || x.name.toLowerCase().includes(q)) &&
      (!muscle || x.muscle === muscle) &&
      (!equipment || x.equipment === equipment) &&
      (!strengthOnly || x.custom || STRENGTH.includes(x.category)),
    );
  }, [catalog, query, muscle, equipment, strengthOnly]);

  const showRecent = !query.trim() && !muscle && !equipment && recentIds.length > 0;
  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    if (showRecent) {
      const byId = new Map(catalog.map((x) => [x.id, x]));
      out.push({ key: 'h-recent', header: 'Recent' });
      for (const id of recentIds) { const ex = byId.get(id); if (ex) out.push({ key: `r-${id}`, ex }); }
      out.push({ key: 'h-all', header: 'All exercises' });
    }
    for (const ex of filtered.slice(0, MAX_ROWS)) out.push({ key: ex.id, ex });
    return out;
  }, [showRecent, recentIds, catalog, filtered]);

  return (
    <View style={ui.screen}>
      <View style={{ padding: 16, gap: 10 }}>
        <View style={ui.row}>
          <TextInput style={[ui.input, { flex: 1, minHeight: TARGET }]} placeholder={`Search ${catalog.length} exercises`} {...inputTheme}
            value={query} onChangeText={setQuery} autoCorrect={false} accessibilityLabel="Search exercises" />
          <Link href="/exercise/new" asChild>
            <TouchableOpacity style={newButton} accessibilityLabel="Add your own exercise">
              <Ionicons name="add" size={20} color={colors.onAccent} />
              <Text style={ui.buttonText}>New</Text>
            </TouchableOpacity>
          </Link>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <Chip label="All muscles" active={!muscle} onPress={() => setMuscle(null)} />
          {MUSCLES.map((m) => <Chip key={m} label={m} active={muscle === m} onPress={() => setMuscle(muscle === m ? null : m)} />)}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <Chip label="Any equipment" active={!equipment} onPress={() => setEquipment(null)} />
          {EQUIPMENT.map((e) => <Chip key={e} label={e} active={equipment === e} onPress={() => setEquipment(equipment === e ? null : e)} />)}
        </ScrollView>
        <View style={[ui.row, { justifyContent: 'space-between' }]}>
          <Text style={ui.muted}>{filtered.length} match{filtered.length === 1 ? '' : 'es'}{filtered.length > MAX_ROWS ? ` (showing ${MAX_ROWS})` : ''}</Text>
          <Chip label="Strength only" active={strengthOnly} onPress={() => setStrengthOnly(!strengthOnly)} />
        </View>
      </View>
      <FlatList
        data={items}
        keyExtractor={(i) => i.key}
        keyboardShouldPersistTaps="handled" initialNumToRender={8} maxToRenderPerBatch={6} windowSize={5} removeClippedSubviews
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 8 }}
        renderItem={({ item }) =>
          'header' in item ? (
            <Text style={[type.header, { marginTop: 8, letterSpacing: 0.6, textTransform: 'uppercase' }]}>{item.header}</Text>
          ) : (
            <Link href={{ pathname: '/exercise/[id]', params: { id: item.ex.id } }} asChild>
              <TouchableOpacity style={exerciseRow} accessibilityRole="button">
                <Thumb exercise={item.ex} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={ui.h2} numberOfLines={2}>{item.ex.name}</Text>
                  <Text style={type.meta} numberOfLines={1}>{worked(item.ex)} · {cap(item.ex.equipment)}</Text>
                </View>
                {item.ex.custom && <Text style={[type.header, { color: colors.accentText }]}>Custom</Text>}
                <Ionicons name="chevron-forward" size={20} color={colors.muted} />
              </TouchableOpacity>
            </Link>
          )
        }
        ListEmptyComponent={<Text style={ui.muted}>Nothing matches. Try fewer filters, or add your own with New.</Text>}
      />
    </View>
  );
}
