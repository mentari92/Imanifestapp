import { Tabs } from 'expo-router';
import { View, TouchableOpacity, Platform, Text } from 'react-native';
import { LayoutDashboard, Heart, Sparkles, ListChecks } from 'lucide-react-native';
import { MeditationIcon } from '../../components/shared/MeditationIcon';

const TABS = [
  { name: 'index', icon: LayoutDashboard, label: 'Dashboard' },
  { name: 'qalb', icon: Heart, label: 'Qalb' },
  { name: 'imanifest', icon: Sparkles, label: 'Imanifest' },
  { name: 'dua-todo', icon: ListChecks, label: 'Dua-to-Do' },
  { name: 'tafakkur', icon: MeditationIcon, label: 'Tafakkur' },
] as const;

function GlassTabBar({ state, navigation }: any) {
  return (
    <View
      style={{
        position: 'absolute',
        bottom: 18,
        left: 12,
        right: 12,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 10,
        backgroundColor: 'rgba(255,255,255,0.82)',
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 14 },
        shadowOpacity: 0.08,
        shadowRadius: 32,
        elevation: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.35)',
        ...(Platform.OS === 'web'
          ? ({
              backdropFilter: 'blur(24px) saturate(125%)',
              WebkitBackdropFilter: 'blur(24px) saturate(125%)',
            } as any)
          : {}),
      }}
    >
      {state.routes
        .map((route: any, index: number) => {
          const isFocused = state.index === state.routes.findIndex((r: any) => r.key === route.key);
          const Icon = TABS[index]?.icon ?? Heart;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              activeOpacity={0.7}
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 8,
                borderRadius: 9999,
                backgroundColor: isFocused ? 'rgba(22,101,52,0.12)' : 'transparent',
              }}
            >
              <Icon
                size={18}
                color={isFocused ? '#166534' : '#64748b'}
                strokeWidth={isFocused ? 2.2 : 1.5}
              />
              <View style={{ height: 4 }} />
              <Text
                style={{
                  fontSize: 10,
                  fontFamily: 'Plus Jakarta Sans',
                  color: isFocused ? '#166534' : '#64748b',
                  fontWeight: isFocused ? '700' : '600',
                  letterSpacing: 0.2,
                }}
              >
                {TABS[index]?.label ?? 'Tab'}
              </Text>
            </TouchableOpacity>
          );
        })}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      initialRouteName='index'
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{ title: tab.label }}
        />
      ))}
    </Tabs>
  );
}
