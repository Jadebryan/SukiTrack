import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { font } from '@/constants/theme';
import { formatPeso } from '@/utils/currency';
import { formatDateTime } from '@/utils/date';

export function CustomerDetailBalanceCard({
  colors,
  t,
  balance,
  lastActivityAt,
  updatedAt,
}) {
  const owes = balance > 0;

  return (
    <View style={[styles.card, { backgroundColor: colors.green600 }]}>
      <Text style={styles.label}>{t('cd_balanceNow')}</Text>
      <Text style={styles.amount}>{formatPeso(balance)}</Text>
      <View style={styles.metaRow}>
        <Text style={styles.meta}>
          {t('cd_lastActivity')}{' '}
          {lastActivityAt ? formatDateTime(lastActivityAt) : t('cd_lastActivityNone')}
        </Text>
      </View>
      {updatedAt ? (
        <Text style={styles.metaMuted}>
          {t('cd_recordUpdated')}: {formatDateTime(updatedAt)}
        </Text>
      ) : null}
      <View style={[styles.statusPill, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
        <Text style={styles.statusText}>
          {owes ? t('card_owes') : t('card_paidUp')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 18,
    gap: 6,
  },
  label: {
    fontFamily: font.medium,
    fontSize: 13,
    color: '#9FE1CB',
  },
  amount: {
    fontFamily: font.extraBold,
    fontSize: 32,
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginTop: -2,
  },
  metaRow: { marginTop: 4 },
  meta: {
    fontFamily: font.medium,
    fontSize: 12,
    color: '#E1F5EE',
    lineHeight: 18,
  },
  metaMuted: {
    fontFamily: font.medium,
    fontSize: 11,
    color: '#9FE1CB',
    lineHeight: 16,
  },
  statusPill: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusText: {
    fontFamily: font.semiBold,
    fontSize: 12,
    color: '#FFFFFF',
  },
});
