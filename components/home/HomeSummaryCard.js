import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { font } from '@/constants/theme';
import { formatPeso } from '@/utils/currency';

function StatBox({ value, label }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statVal}>{value}</Text>
      <Text style={styles.statLbl}>{label}</Text>
    </View>
  );
}

export function HomeSummaryCard({ colors, t, totals }) {
  return (
    <View style={[styles.card, { backgroundColor: colors.green600 }]}>
      <Text style={styles.label}>{t('home_totalUnpaid')}</Text>
      <Text style={styles.amount}>{formatPeso(totals.unpaid)}</Text>
      <View style={styles.statsRow}>
        <StatBox value={String(totals.count)} label={t('home_statWithBalance')} />
        <StatBox value={String(totals.totalCustomers)} label={t('home_totalCustomers')} />
        <StatBox value={formatPeso(totals.allPaid)} label={t('home_allTimePaid')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 18,
    gap: 10,
  },
  label: {
    fontFamily: font.medium,
    fontSize: 13,
    color: '#9FE1CB',
  },
  amount: {
    fontFamily: font.extraBold,
    fontSize: 30,
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginTop: -4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    padding: 10,
    gap: 3,
  },
  statVal: {
    fontFamily: font.semiBold,
    fontSize: 15,
    color: '#FFFFFF',
  },
  statLbl: {
    fontFamily: font.medium,
    fontSize: 11,
    color: '#9FE1CB',
    lineHeight: 14,
  },
});
