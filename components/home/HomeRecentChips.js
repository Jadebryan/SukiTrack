import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { font } from '@/constants/theme';

export function HomeRecentChips({ colors, customers, onPress }) {
  if (!customers?.length) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {customers.map((c) => (
        <Pressable
          key={c.id}
          onPress={() => onPress(c.id)}
          style={({ pressed }) => [
            styles.chip,
            {
              backgroundColor: colors.chipBg,
              borderColor: colors.border,
            },
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
        >
          <Text style={[styles.chipText, { color: colors.chipText }]} numberOfLines={1}>
            {c.name}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 99,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: 160,
  },
  chipText: {
    fontFamily: font.medium,
    fontSize: 13,
  },
  pressed: { opacity: 0.88 },
});
