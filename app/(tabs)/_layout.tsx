import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarLabelPosition: 'beside-icon',
        tabBarIconStyle: { display: 'none' },
        tabBarItemStyle: {
          justifyContent: 'center',
          alignItems: 'center',
        },
        tabBarLabelStyle: {
          fontSize: Platform.OS === 'android' ? 12 : 15,
          fontWeight: '600',
          marginBottom: 0, // Reset any margins pushing it down
          position: 'relative', // Ensure it respects flexbox
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Normal',
          tabBarIcon: () => null
        }}
      />
      <Tabs.Screen
        name="hard"
        options={{
          title: 'Hard',
          tabBarIcon: () => null
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: 'Leaderboard',
          tabBarIcon: () => null
        }}
      />
      <Tabs.Screen
        name="about"
        options={{
          title: 'About',
          tabBarIcon: () => null
        }}
      />
    </Tabs>
  );
}
