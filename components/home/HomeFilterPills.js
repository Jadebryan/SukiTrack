import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { font } from '@/constants/theme';

const FILTERS = [
  { key: 'all', labelKey: 'home_chipAll' },
  { key: 'unpaid', labelKey: 'home_filterUnpaid' },
  { key: 'paid', labelKey: 'home_chipPaidUp' },
  { key: 'recent', labelKey: 'home_chipRecent' },
];

export function HomeFilterPills({ colors, t, activeKey, onChange }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {FILTERS.map((f) => {
        const active = activeKey === f.key;
        return (
          <Pressable
            key={f.key}
            onPress={() => onChange(f.key)}
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
            {active ? (
              <MaterialCommunityIcons
                name="check"
                size={14}
                color="#FFFFFF"
                style={styles.check}
              />
            ) : null}
            <Text
              style={[
                styles.pillText,
                { color: active ? '#FFFFFF' : colors.pillText },
              ]}
            >
              {t(f.labelKey)}
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
    paddingRight: 4,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 99,
    borderWidth: StyleSheet.hairlineWidth,
  },
  check: { marginRight: 4 },
  pillText: {
    fontFamily: font.semiBold,
    fontSize: 13,
  },
  pressed: { opacity: 0.88 },
});
