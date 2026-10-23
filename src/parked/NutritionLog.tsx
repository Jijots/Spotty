import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  addFood, deleteFood, foodForDate, getSetting, isoDate, recentDays, recentFoods, setSetting, type FoodEntry,
} from '../db';
import { loadSettings } from '../settings';
import { addDays, dayLabel } from '../lib/dates';
import { foodKey, quickList, validateFood, type FoodForm, type FoodItem } from '../lib/foods';
import { estimateTdee, formulaTdee, macroTarget, type MacroTarget } from '../lib/nutrition';
import { sanitizeDecimal } from '../lib/draft';
import { Chip } from '../Chip';
import { Field } from '../Field';
import { MacroBar } from '../MacroBar';
import { Toast } from '../Toast';
import { TARGET, colors, type, ui } from '../theme';

const EMPTY: FoodForm = { name: '', kcal: '', protein: '', carbs: '', fat: '' };
const sum = (xs: FoodEntry[], k: 'kcal' | 'protein' | 'carbs' | 'fat') => Math.round(xs.reduce((s, x) => s + x[k], 0));
const asItem = (e: FoodEntry): FoodItem => ({ name: e.name, kcal: e.kcal, protein: e.protein, carbs: e.carbs, fat: e.fat });

export default function NutritionScreen() {
  const todayIso = isoDate();
  const [date, setDate] = useState(todayIso);
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [target, setTarget] = useState<MacroTarget>({ kcal: 2500, protein: 160, fat: 70, carbs: 300 });
  const [note, setNote] = useState('');
  const [favorites, setFavorites] = useState<FoodItem[]>([]);
  const [recents, setRecents] = useState<FoodItem[]>([]);
  const [form, setForm] = useState<FoodForm>(EMPTY);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ message: string; undo?: () => Promise<void> } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const load = useCallback(async () => {
    const [list, settings, days, favs, recent] = await Promise.all([
      foodForDate(date), loadSettings(), recentDays(42), getSetting<FoodItem[]>('favoriteFoods', []), recentFoods(12),
    ]);
    const est = estimateTdee(days, formulaTdee(settings.profile));
    setEntries(list); setFavorites(favs); setRecents(recent);
    setTarget(macroTarget(est.tdee, settings.goalKgPerWeek, settings.profile.weightKg));
    setNote(est.confidence > 0
      ? `Your daily burn is estimated at about ${est.tdee} kcal, learned from your own food and weight logs (${Math.round(est.confidence * 100)}% sure).`
      : `Your daily burn is estimated at about ${est.tdee} kcal from a standard formula. Log food and your weight for a week and it starts learning from you.`);
  }, [date]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const showToast = (message: string, undo?: () => Promise<void>) => {
    clearTimeout(toastTimer.current);
    setToast({ message, undo });
    toastTimer.current = setTimeout(() => setToast(null), 6000);
  };

  const log = async (item: FoodItem) => {
    const id = await addFood({ date, ...item });
    await load();
    showToast(`Added ${item.name}.`, async () => { await deleteFood(id); await load(); });
  };

  const submit = async () => {
    const r = validateFood(form);
    if ('error' in r) { setError(r.error); return; }
    setError(''); setForm(EMPTY);
    await log(r.value);
  };

  const remove = async (e: FoodEntry) => {
    await deleteFood(e.id);
    await load();
    showToast(`Deleted ${e.name}.`, async () => { await addFood({ date: e.date, ...asItem(e) }); await load(); });
  };

  const toggleFavorite = async (e: FoodEntry) => {
    const item = asItem(e);
    const key = foodKey(item);
    const next = favorites.some((f) => foodKey(f) === key) ? favorites.filter((f) => foodKey(f) !== key) : [item, ...favorites];
    setFavorites(next);
    await setSetting('favoriteFoods', next);
  };

  const set = (k: keyof FoodForm, v: string) => { setForm({ ...form, [k]: v }); setError(''); };
  const quick = quickList(favorites, recents);
  const favKeys = new Set(favorites.map(foodKey));
  const isToday = date === todayIso;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={ui.screen} contentContainerStyle={[ui.content, toast && { paddingBottom: 96 }]} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <View style={[ui.row, { justifyContent: 'space-between' }]}>
          <TouchableOpacity
            onPress={() => setDate(addDays(date, -1))} accessibilityRole="button" accessibilityLabel="Previous day"
            style={{ width: TARGET, height: TARGET, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={ui.h1} accessibilityRole="header">{dayLabel(date, todayIso)}</Text>
          <TouchableOpacity
            onPress={() => setDate(addDays(date, 1))} disabled={isToday} accessibilityRole="button" accessibilityLabel="Next day"
            accessibilityState={{ disabled: isToday }} style={{ width: TARGET, height: TARGET, alignItems: 'center', justifyContent: 'center', opacity: isToday ? 0.3 : 1 }}>
            <Ionicons name="chevron-forward" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <View style={[ui.card, { gap: 12 }]}>
          <MacroBar label="Calories" value={sum(entries, 'kcal')} target={target.kcal} unit="kcal" />
          <MacroBar label="Protein" value={sum(entries, 'protein')} target={target.protein} unit="g" />
          <MacroBar label="Carbs" value={sum(entries, 'carbs')} target={target.carbs} unit="g" />
          <MacroBar label="Fat" value={sum(entries, 'fat')} target={target.fat} unit="g" />
          <Text style={type.meta}>{note}</Text>
        </View>

        {quick.length > 0 && (
          <View style={{ gap: 8 }}>
            <Text style={ui.h2}>Quick add</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {quick.map((q) => (
                <Chip
                  key={foodKey(q.item)} label={`${q.item.name} · ${q.item.kcal}`} active={q.favorite}
                  accessibilityLabel={`Add ${q.item.name}, ${q.item.kcal} calories${q.favorite ? ', favorite' : ''}`} onPress={() => log(q.item)}
                />
              ))}
            </View>
            <Text style={type.meta}>Filled chips are your favorites. Star a logged food to keep it here.</Text>
          </View>
        )}

        <View style={[ui.card, { gap: 12 }]}>
          <Text style={ui.h2}>Add food</Text>
          <Field label="Name" value={form.name} onChange={(t) => set('name', t)} placeholder="e.g. Oatmeal" keyboardType="default" maxLength={60} />
          <View style={ui.row}>
            <Field label="Calories" value={form.kcal} onChange={(t) => set('kcal', sanitizeDecimal(t))} suffix="kcal" />
            <Field label="Protein" value={form.protein} onChange={(t) => set('protein', sanitizeDecimal(t))} suffix="g" />
          </View>
          <View style={ui.row}>
            <Field label="Carbs" value={form.carbs} onChange={(t) => set('carbs', sanitizeDecimal(t))} suffix="g" />
            <Field label="Fat" value={form.fat} onChange={(t) => set('fat', sanitizeDecimal(t))} suffix="g" />
          </View>
          <Text style={type.meta}>Protein, carbs and fat are optional.</Text>
          {error ? <Text style={{ color: colors.danger }} accessibilityLiveRegion="polite">{error}</Text> : null}
          <TouchableOpacity style={ui.button} onPress={submit} accessibilityRole="button"><Text style={ui.buttonText}>Add to {dayLabel(date, todayIso).toLowerCase()}</Text></TouchableOpacity>
        </View>

        <View style={[ui.card, { gap: 4 }]}>
          <Text style={ui.h2}>Logged</Text>
          {entries.length === 0 && <Text style={ui.muted}>Nothing logged for {dayLabel(date, todayIso).toLowerCase()} yet.</Text>}
          {entries.map((e, i) => {
            const fav = favKeys.has(foodKey(asItem(e)));
            return (
              <View key={e.id} style={[ui.row, { gap: 4, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border, paddingTop: i ? 4 : 0 }]}>
                <View style={{ flex: 1, paddingVertical: 8 }}>
                  <Text style={ui.text} numberOfLines={2}>{e.name}</Text>
                  <Text style={type.meta}>{e.kcal} kcal · P {e.protein} · C {e.carbs} · F {e.fat}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => toggleFavorite(e)} accessibilityRole="button" accessibilityState={{ selected: fav }}
                  accessibilityLabel={fav ? `Remove ${e.name} from favorites` : `Save ${e.name} as a favorite`}
                  style={{ width: TARGET, height: TARGET, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={fav ? 'star' : 'star-outline'} size={22} color={fav ? colors.accentText : colors.muted} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => remove(e)} accessibilityRole="button" accessibilityLabel={`Delete ${e.name}`}
                  style={{ width: TARGET, height: TARGET, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="trash-outline" size={22} color={colors.muted} />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </ScrollView>
      {toast && <Toast message={toast.message} onUndo={toast.undo ? async () => { const u = toast.undo; setToast(null); await u?.(); } : undefined} />}
    </View>
  );
}
