import { Stack } from 'expo-router';
import React from 'react';
import { useTheme } from 'react-native-paper';
import {
  getHeaderScreenOptions,
  getStackContentStyle,
} from '@/constants/navigationHeader';
import { useAppTheme } from '@/contexts/AppThemeContext';
import { useLocale } from '@/contexts/LocaleContext';

export default function InventoryLayout() {
  const { isDark } = useAppTheme();
  const { t } = useLocale();
  const theme = useTheme();
  const headerOptions = getHeaderScreenOptions(theme, isDark);

  return (
    <Stack
      screenOptions={{
        ...headerOptions,
        contentStyle: getStackContentStyle(theme, isDark),
        headerBackTitle: t('nav_back'),
      }}
    >
      <Stack.Screen
        name="index"
        options={{ headerShown: false, title: t('tab_inventory') }}
      />
      <Stack.Screen
        name="[slug]"
        options={{
          title: t('tab_inventory'),
          headerShown: false,
        }}
      />
    </Stack>
  );
}
