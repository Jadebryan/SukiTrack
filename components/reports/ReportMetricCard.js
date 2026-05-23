import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { font } from '@/constants/theme';

export function ReportMetricRow({ colors, label, value, tone, noDivider }) {
  const valueColor =
    tone === 'positive'
      ? colors.green600
      : tone === 'negative'
        ? colors.red800
        : tone === 'amber'
          ? colors.amber700 || '#854F0B'
          : colors.text;

  return (
    <View
      style={[
        styles.row,
        { borderBottomColor: colors.border },
        noDivider && styles.rowLast,
      ]}
    >
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.value, { color: valueColor }]}>{value}</Text>
    </View>
  );
}

export function ReportMetricCard({
  colors,
  title,
  icon,
  iconColor,
  children,
  footer,
}) {
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.cardBg, borderColor: colors.border },
      ]}
    >
      <View style={styles.titleRow}>
        <MaterialCommunityIcons
          name={icon}
          size={18}
          color={iconColor || colors.green600}
        />
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      </View>
      {children}
      {footer}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  title: {
    fontFamily: font.semiBold,
    fontSize: 15,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  label: {
    fontFamily: font.medium,
    fontSize: 13,
    flex: 1,
    paddingRight: 12,
  },
  value: {
    fontFamily: font.semiBold,
    fontSize: 15,
  },
});
