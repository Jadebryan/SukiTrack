import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { font } from '@/constants/theme';

export function HomeSectionHeader({ colors, title, countLabel }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.title, { color: colors.textFaint }]}>{title}</Text>
      {countLabel ? (
        <Text style={[styles.count, { color: colors.textFaint }]}>{countLabel}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  title: {
    fontFamily: font.semiBold,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  count: {
    fontFamily: font.medium,
    fontSize: 11,
  },
});
