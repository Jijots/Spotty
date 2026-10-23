import { Tabs, useRouter } from 'expo-router';
import { TouchableOpacity, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { TARGET, colors } from '../../src/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const tab = (title: string, icon: IconName) => ({
  title,
  tabBarIcon: ({ color }: { color: ColorValue }) => <Ionicons name={icon} size={24} color={color} />,
});

export default function TabLayout() {
  // Sit above the system navigation bar (three-button or gesture) instead of under it.
  const bottom = useSafeAreaInsets().bottom;
  const router = useRouter();
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700', fontSize: 18 },
        headerRight: () => (
          <TouchableOpacity
            onPress={() => router.push('/settings')} accessibilityRole="button" accessibilityLabel="Settings"
            style={{ minWidth: TARGET, minHeight: TARGET, alignItems: 'center', justifyContent: 'center', marginRight: 4 }}>
            <Ionicons name="settings-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        ),
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border, height: 64 + bottom, paddingTop: 6, paddingBottom: 8 + bottom },
        tabBarActiveTintColor: colors.accentText,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="index" options={tab('Today', 'today')} />
      <Tabs.Screen name="programs" options={tab('Programs', 'albums')} />
      <Tabs.Screen name="nutrition" options={tab('Nutrition', 'nutrition')} />
      <Tabs.Screen name="progress" options={tab('Progress', 'stats-chart')} />
      <Tabs.Screen name="library" options={tab('Library', 'library')} />
    </Tabs>
  );
}
