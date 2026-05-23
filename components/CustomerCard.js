import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { font } from '@/constants/theme';
import { homeAvatarColor } from '@/constants/homePalette';
import { useLocale } from '@/contexts/LocaleContext';
import { formatPeso } from '@/utils/currency';
import { formatShortDate } from '@/utils/date';

/**
 * @param {object} props
 * @param {object} props.customer
 * @param {() => void} props.onPress
 * @param {ReturnType<import('@/constants/homePalette').getHomePalette>} [props.colors]
 */
export function CustomerCard({ customer, onPress, colors }) {
  const { t } = useLocale();
  const balance = Number(customer.balance) || 0;
  const isPaidUp = balance <= 0;
  const av = homeAvatarColor(customer.name);
  const initial = String(customer.name || '?').trim().charAt(0).toUpperCase() || '?';
  const hasActivity = Boolean(customer.lastTransactionAt);

  const cardBg = colors?.cardBg ?? '#FFFFFF';
  const borderColor = colors?.border ?? 'rgba(0,0,0,0.10)';
  const nameColor = colors?.text ?? '#1D1D1D';
  const metaColor = colors?.textFaint ?? '#888780';
  const owesColor = colors?.red800 ?? '#A32D2D';
  const paidColor = colors?.green700 ?? '#0F6E56';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.press, pressed && styles.pressed]}
    >
      <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
        <View style={[styles.avatar, { backgroundColor: av.bg }]}>
          <Text style={[styles.avatarText, { color: av.text }]}>{initial}</Text>
        </View>

        <View style={styles.info}>
          <Text style={[styles.name, { color: nameColor }]} numberOfLines={1}>
            {customer.name}
          </Text>
          <Text style={[styles.meta, { color: metaColor }]} numberOfLines={1}>
            {hasActivity
              ? `${t('card_lastTx')} ${formatShortDate(customer.lastTransactionAt)}`
              : t('card_noActivityYet')}
          </Text>
        </View>

        <View style={styles.right}>
          <Text
            style={[
              styles.amount,
              { color: isPaidUp ? paidColor : owesColor },
            ]}
            numberOfLines={1}
          >
            {formatPeso(Math.abs(balance))}
          </Text>
          <Text style={[styles.tag, { color: metaColor }]}>
            {isPaidUp ? t('card_paidUp') : t('card_owes')}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  press: {
    marginHorizontal: 16,
    marginBottom: 10,
  },
  pressed: { opacity: 0.9 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: font.semiBold,
    fontSize: 16,
  },
  info: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  name: {
    fontFamily: font.semiBold,
    fontSize: 15,
  },
  meta: {
    fontFamily: font.medium,
    fontSize: 12,
  },
  right: {
    alignItems: 'flex-end',
    gap: 2,
  },
  amount: {
    fontFamily: font.semiBold,
    fontSize: 15,
  },
  tag: {
    fontFamily: font.medium,
    fontSize: 11,
  },
});
