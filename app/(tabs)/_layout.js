import { Tabs } from 'expo-router';
import React from 'react';
import { AppTabBar } from '@/components/AppTabBar';
import { getHeaderScreenOptions } from '@/constants/navigationHeader';
import { useAppTheme } from '@/contexts/AppThemeContext';
import { useLocale } from '@/contexts/LocaleContext';
import { useTheme } from 'react-native-paper';

export default function TabLayout() {
  const { isDark } = useAppTheme();
  const { t } = useLocale();
  const theme = useTheme();
  const headerOptions = getHeaderScreenOptions(theme, isDark);

  return (
    <Tabs
      tabBar={(props) => <AppTabBar {...props} />}
      screenOptions={{
        ...headerOptions,
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tab_customers'),
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: t('tab_inventory'),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: t('tab_reports'),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tab_settings'),
        }}
      />
    </Tabs>
  );
}
