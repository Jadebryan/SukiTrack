import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { font } from '@/constants/theme';

const PERIODS = [
  { key: 'day', labelKey: 'rep_today' },
  { key: 'week', labelKey: 'rep_week' },
  { key: 'month', labelKey: 'rep_month' },
  { key: 'all', labelKey: 'rep_allTime' },
];

export function ReportPeriodPills({ colors, t, activeKey, onChange }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {PERIODS.map((p) => {
        const active = activeKey === p.key;
        return (
          <Pressable
            key={p.key}
            onPress={() => onChange(p.key)}
            style={({ pressed }) => [
              styles.pill,
              {
                backgroundColor: active ? colors.green600 : colors.pillBg,
                borderColor: active ? colors.green600 : colors.border,
              },
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text
              style={[
                styles.pillText,
                { color: active ? '#FFFFFF' : colors.pillText },
              ]}
            >
              {t(p.labelKey)}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 99,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pillText: {
    fontFamily: font.semiBold,
    fontSize: 13,
  },
  pressed: { opacity: 0.88 },
});
