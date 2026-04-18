import React from 'react';
import { Tabs } from 'expo-router';
import { colors } from '../../constants/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingBottom: 4,
          paddingTop: 4,
          height: 60,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: 'Inter-Regular',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <TabIcon icon="🏠" color={color} />,
        }}
      />
      <Tabs.Screen
        name="imanifest"
        options={{
          title: 'Imanifest',
          tabBarIcon: ({ color }) => <TabIcon icon="✨" color={color} />,
        }}
      />
      <Tabs.Screen
        name="qalb"
        options={{
          title: 'Qalb',
          tabBarIcon: ({ color }) => <TabIcon icon="💚" color={color} />,
        }}
      />
      <Tabs.Screen
        name="dua-todo"
        options={{
          title: 'Dua',
          tabBarIcon: ({ color }) => <TabIcon icon="🤲" color={color} />,
        }}
      />
      <Tabs.Screen
        name="tafakkur"
        options={{
          title: 'Tafakkur',
          tabBarIcon: ({ color }) => <TabIcon icon="🧠" color={color} />,
        }}
      />
    </Tabs>
  );
}

function TabIcon({ icon, color }: { icon: string; color: string }) {
  // Using text as icon since we don't have icon library
  return null; // The tab icon will use the emoji in the title
}