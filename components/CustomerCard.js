import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { font } from '@/constants/theme';
import { useLocale } from '@/contexts/LocaleContext';
import { formatPeso } from '@/utils/currency';
import { formatShortDate } from '@/utils/date';
import { getBalanceColor } from '@/utils/balanceIndicator';

function initialForName(name) {
  const s = String(name || '').trim();
  return (s.charAt(0).toUpperCase() || '?').slice(0, 1);
}

function colorFromName(name) {
  const s = String(name || '');
  let hash = 0;
  for (let i = 0; i < s.length; i += 1) {
    hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  }
  const palette = ['#6366f1', '#10b981', '#3b82f6', '#8b5cf6', '#14b8a6'];
  return palette[hash % palette.length];
}

export function CustomerCard({ customer, onPress }) {
  const { t } = useLocale();
  const balance = Number(customer.balance) || 0;
  const accent = getBalanceColor(balance);
  const initial = initialForName(customer.name);
  const hasActivity = Boolean(customer.lastTransactionAt);
  const avatarBg = balance > 0 ? '#f59e0b' : colorFromName(customer.name);

  return (
    <Pressable onPress={onPress} style={styles.press}>
      <Card mode="outlined" style={styles.card}>
        <Card.Content style={styles.row}>
          <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
            <Text style={styles.avatarLetter}>{initial}</Text>
          </View>

          <View style={styles.main}>
            <Text variant="titleMedium" style={styles.name} numberOfLines={1}>
              {customer.name}
            </Text>
            <Text variant="bodySmall" style={styles.meta} numberOfLines={1}>
              {hasActivity
                ? `${t('card_lastTx')} ${formatShortDate(customer.lastTransactionAt)}`
                : t('card_noActivityYet')}
            </Text>
          </View>

          <View style={styles.right}>
            <Text style={[styles.amt, { color: accent }]} numberOfLines={1}>
              {formatPeso(balance)}
            </Text>
            {balance > 0 ? (
              <Text style={styles.owes} numberOfLines={1}>
                {t('card_owes')}
              </Text>
            ) : null}
          </View>
        </Card.Content>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  press: { marginHorizontal: 16, marginBottom: 12 },
  card: { borderRadius: 16, backgroundColor: '#fff', borderColor: '#dde8df' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 20,
    paddingHorizontal: 18,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarLetter: {
    fontFamily: font.extraBold,
    fontSize: 16,
    color: '#fff',
    letterSpacing: -0.2,
  },
  main: { flex: 1, minWidth: 0, paddingRight: 4 },
  name: { fontFamily: font.extraBold, letterSpacing: -0.2, color: '#1a2e1f' },
  meta: { marginTop: 4, color: '#9ab09e', fontFamily: font.medium },
  right: { alignItems: 'flex-end', flexShrink: 0, paddingLeft: 8 },
  amt: { fontFamily: font.extraBold, fontSize: 16, letterSpacing: -0.2 },
  owes: { marginTop: 4, fontFamily: font.medium, fontSize: 10, color: '#9ab09e' },
});
