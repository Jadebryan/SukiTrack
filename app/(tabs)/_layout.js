import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import React from 'react';
import { useTheme } from 'react-native-paper';
import { getHeaderScreenOptions } from '@/constants/navigationHeader';
import { font } from '@/constants/theme';
import { useAppTheme } from '@/contexts/AppThemeContext';
import { useLocale } from '@/contexts/LocaleContext';

function TabBarIcon({ name, color }) {
  return <FontAwesome size={26} style={{ marginBottom: -2 }} name={name} color={color} />;
}

export default function TabLayout() {
  const { isDark } = useAppTheme();
  const { t } = useLocale();
  const theme = useTheme();
  const headerOptions = getHeaderScreenOptions(theme, isDark);
  const active = isDark ? '#81C784' : '#2E7D32';
  const inactive = isDark ? '#888' : '#666';
  const tabBarBg = isDark ? theme.colors.surfaceVariant : theme.colors.surface;
  const tabBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(46, 125, 50, 0.1)';

  return (
    <Tabs
      screenOptions={{
        ...headerOptions,
        tabBarActiveTintColor: active,
        tabBarInactiveTintColor: inactive,
        tabBarLabelStyle: { fontFamily: font.semiBold, fontSize: 12 },
        tabBarStyle: {
          paddingTop: 6,
          paddingBottom: 6,
          height: 62,
          backgroundColor: tabBarBg,
          borderTopWidth: 1,
          borderTopColor: tabBorder,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tab_customers'),
          headerShown: false,
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: t('tab_inventory'),
          /** Inner `inventory/_layout` Stack owns the header (avoid double “Inventory”). */
          headerShown: false,
          tabBarIcon: ({ color }) => <TabBarIcon name="cubes" color={color} />,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: t('tab_reports'),
          headerShown: false,
          tabBarIcon: ({ color }) => <TabBarIcon name="bar-chart" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tab_settings'),
          headerShown: false,
          tabBarIcon: ({ color }) => <TabBarIcon name="cog" color={color} />,
        }}
      />
    </Tabs>
  );
}
