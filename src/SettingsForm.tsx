import { useEffect, useState } from 'react';
import { Platform, Switch, Text, TouchableOpacity, View } from 'react-native';
import { EQUIPMENT, type Equipment } from './data/exercises';
import { cmToFtIn, fromKg, ftInToCm, toKg, type Unit } from './lib/units';
import { formulaTdee, macroTarget } from './lib/nutrition';
import { sanitizeDecimal, sanitizeInt } from './lib/draft';
import { loadSettings, saveSettings, type Settings } from './settings';
import { Chip } from './Chip';
import { Field } from './Field';
import { colors, type, ui } from './theme';

/** Body details and the calorie goal only feed Nutrition, which is not live yet. Flip this when it ships. */
const NUTRITION_LIVE = false;

const GOAL_STEPS_KG = [-0.75, -0.5, -0.25, 0, 0.25, 0.5];
const ACTIVITY = [['Mostly seated', 1.375], ['Lightly active', 1.55], ['Very active', 1.725]] as const;
const wrap = { flexDirection: 'row', flexWrap: 'wrap', gap: 8 } as const;

/** Used by both the first-run onboarding screen and the Settings screen. */
export function SettingsForm({ submitLabel, onSaved, onDirty }: { submitLabel: string; onSaved?: () => void; onDirty?: (dirty: boolean) => void }) {
  const [s, setS] = useState<Settings | null>(null);
  const [weight, setWeight] = useState('');
  const [cm, setCm] = useState('');
  const [ft, setFt] = useState('');
  const [inch, setInch] = useState('');
  const [age, setAge] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadSettings().then((loaded) => {
      setS(loaded);
      setWeight(String(fromKg(loaded.profile.weightKg, loaded.unit)));
      setCm(String(loaded.profile.heightCm));
      const h = cmToFtIn(loaded.profile.heightCm);
      setFt(String(h.ft)); setInch(String(h.inch));
      setAge(String(loaded.profile.age));
    });
  }, []);

  if (!s) return null;

  const edit = (fn: () => void) => { fn(); setError(''); onDirty?.(true); };

  const heightCm = s.unit === 'kg' ? Number(cm) : ftInToCm(Number(ft) || 0, Number(inch) || 0);

  const setUnit = (unit: Unit) => {
    if (unit === s.unit) return;
    edit(() => {
      const kg = toKg(Number(weight) || fromKg(s.profile.weightKg, s.unit), s.unit);
      setWeight(String(fromKg(kg, unit)));
      if (unit === 'lb') {
        const h = cmToFtIn(Number(cm) || s.profile.heightCm);
        setFt(String(h.ft)); setInch(String(h.inch));
      } else {
        setCm(String(heightCm || s.profile.heightCm));
      }
      setS({ ...s, unit, profile: { ...s.profile, weightKg: kg } });
    });
  };

  const toggleEquipment = (e: Equipment) =>
    edit(() => setS({ ...s, equipment: s.equipment.includes(e) ? s.equipment.filter((x) => x !== e) : [...s.equipment, e] }));

  const preview = (() => {
    const w = toKg(Number(weight) || 0, s.unit);
    const p = { ...s.profile, weightKg: w, heightCm, age: Number(age) || 0 };
    if (!(w > 0 && p.heightCm > 0 && p.age > 0)) return null;
    return macroTarget(formulaTdee(p), s.goalKgPerWeek, w);
  })();

  const save = async () => {
    const w = toKg(Number(weight), s.unit), a = Number(age);
    if (NUTRITION_LIVE) {
      if (!(w >= 30 && w <= 300)) { setError(`Enter a weight between ${fromKg(30, s.unit)} and ${fromKg(300, s.unit)} ${s.unit}.`); return; }
      if (!(heightCm >= 100 && heightCm <= 250)) { setError(s.unit === 'kg' ? 'Enter a height between 100 and 250 cm.' : 'Enter a height between 3 ft 4 in and 8 ft 2 in.'); return; }
      if (!(a >= 13 && a <= 100)) { setError('Enter an age between 13 and 100.'); return; }
    }
    if (s.equipment.length === 0) { setError('Pick at least one type of equipment, so workouts only use what you have.'); return; }
    setError('');
    await saveSettings({ ...s, onboarded: true, profile: NUTRITION_LIVE ? { ...s.profile, weightKg: w, heightCm, age: a } : s.profile });
    onDirty?.(false);
    onSaved?.();
  };

  return (
    <View style={{ gap: 12 }}>
      <View style={[ui.card, { gap: 10 }]}>
        <Text style={ui.h2}>Units</Text>
        <View style={ui.row}>
          <Chip label={NUTRITION_LIVE ? 'kg · cm' : 'Kilograms'} active={s.unit === 'kg'} onPress={() => setUnit('kg')} />
          <Chip label={NUTRITION_LIVE ? 'lb · ft' : 'Pounds'} active={s.unit === 'lb'} onPress={() => setUnit('lb')} />
        </View>
      </View>

      {NUTRITION_LIVE && (
        <>
      <View style={[ui.card, { gap: 12 }]}>
        <Text style={ui.h2}>About you</Text>
        <Text style={type.meta}>Used only on this phone, to estimate how many calories you burn each day.</Text>
        <Text style={type.header}>Sex</Text>
        <View style={ui.row}>
          <Chip label="Male" active={s.profile.sex === 'male'} onPress={() => edit(() => setS({ ...s, profile: { ...s.profile, sex: 'male' } }))} />
          <Chip label="Female" active={s.profile.sex === 'female'} onPress={() => edit(() => setS({ ...s, profile: { ...s.profile, sex: 'female' } }))} />
        </View>
        <Text style={type.meta}>The calorie formula was built from data that differs by sex. Pick the closer fit.</Text>
        <View style={ui.row}>
          <Field label="Weight" value={weight} onChange={(t) => edit(() => setWeight(sanitizeDecimal(t)))} suffix={s.unit} />
          <Field label="Age" value={age} onChange={(t) => edit(() => setAge(sanitizeInt(t)))} keyboardType="number-pad" suffix="yrs" maxLength={3} />
        </View>
        {s.unit === 'kg' ? (
          <Field label="Height" value={cm} onChange={(t) => edit(() => setCm(sanitizeInt(t)))} keyboardType="number-pad" suffix="cm" maxLength={3} />
        ) : (
          <View style={ui.row}>
            <Field label="Height" value={ft} onChange={(t) => edit(() => setFt(sanitizeInt(t)))} keyboardType="number-pad" suffix="ft" maxLength={1} />
            <Field label="Inches" value={inch} onChange={(t) => edit(() => setInch(sanitizeInt(t)))} keyboardType="number-pad" suffix="in" maxLength={2} />
          </View>
        )}
        <Text style={type.header}>Activity level</Text>
        <View style={wrap}>
          {ACTIVITY.map(([label, v]) => (
            <Chip key={v} label={label} active={s.profile.activity === v} onPress={() => edit(() => setS({ ...s, profile: { ...s.profile, activity: v } }))} />
          ))}
        </View>
        <Text style={type.meta}>Outside the gym: mostly seated for a desk job, very active for a physical job.</Text>
      </View>

      <View style={[ui.card, { gap: 10 }]}>
        <Text style={ui.h2}>Goal</Text>
        <View style={wrap}>
          {GOAL_STEPS_KG.map((g) => {
            const shown = fromKg(Math.abs(g), s.unit);
            const label = g === 0 ? 'Maintain' : `${g < 0 ? 'Lose' : 'Gain'} ${shown} ${s.unit}/wk`;
            return <Chip key={g} label={label} active={s.goalKgPerWeek === g} onPress={() => edit(() => setS({ ...s, goalKgPerWeek: g }))} />;
          })}
        </View>
        {preview && (
          <Text style={type.meta}>
            Starting target: {preview.kcal} kcal a day, with {preview.protein} g protein, {preview.carbs} g carbs and {preview.fat} g fat. It adapts as you log.
          </Text>
        )}
      </View>
        </>
      )}

      <View style={[ui.card, { gap: 10 }]}>
        <Text style={ui.h2}>Equipment</Text>
        <Text style={type.meta}>Auto-built workouts only use what you pick here.</Text>
        <View style={wrap}>
          {EQUIPMENT.map((e) => <Chip key={e} label={e} active={s.equipment.includes(e)} onPress={() => toggleEquipment(e)} />)}
        </View>
      </View>

      <View style={[ui.card, { gap: 10 }]}>
        <Text style={ui.h2}>Rest timer</Text>
        <Text style={type.header}>After compound lifts</Text>
        <View style={wrap}>
          {[90, 120, 180, 240].map((sec) => (
            <Chip key={sec} label={`${sec / 60} min`} active={s.rest.compound === sec} onPress={() => edit(() => setS({ ...s, rest: { ...s.rest, compound: sec } }))} />
          ))}
        </View>
        <Text style={type.header}>After isolation lifts</Text>
        <View style={wrap}>
          {[45, 60, 90, 120].map((sec) => (
            <Chip key={sec} label={`${sec}s`} active={s.rest.isolation === sec} onPress={() => edit(() => setS({ ...s, rest: { ...s.rest, isolation: sec } }))} />
          ))}
        </View>
      </View>

      {Platform.OS === 'android' && (
        <View style={[ui.card, { gap: 6 }]}>
          <View style={[ui.row, { justifyContent: 'space-between', minHeight: 48 }]}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={ui.h2}>Hide navigation buttons</Text>
              <Text style={type.meta}>Hides the Home, Back and Recents buttons for more room. Swipe up from the bottom edge to bring them back.</Text>
            </View>
            <Switch
              value={s.immersive} onValueChange={(v) => edit(() => setS({ ...s, immersive: v }))} accessibilityLabel="Hide navigation buttons"
              trackColor={{ true: colors.accent, false: colors.border }} thumbColor={colors.card}
            />
          </View>
        </View>
      )}

      {error ? <Text style={{ color: colors.danger }} accessibilityLiveRegion="polite">{error}</Text> : null}
      <TouchableOpacity style={ui.button} onPress={save} accessibilityRole="button"><Text style={ui.buttonText}>{submitLabel}</Text></TouchableOpacity>
    </View>
  );
}
