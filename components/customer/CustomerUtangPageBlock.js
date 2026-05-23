import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import CustomerUtangLineRow from '@/components/customer/CustomerUtangLineRow';
import { font } from '@/constants/theme';
import { formatPeso } from '@/utils/currency';
import { formatDateTime } from '@/utils/date';

const NESTED_THRESHOLD = 8;
const NESTED_MAX_HEIGHT = 300;

export function CustomerUtangPageBlock({
  page,
  colors,
  t,
  inventory = [],
  onEditItem,
  onDeleteItem,
  onEditPayment,
  onDeletePayment,
  readOnly = false,
}) {
  const imageByDesc = useMemo(() => {
    const m = new Map();
    for (const row of inventory || []) {
      const key = String(row.name || '')
        .toLowerCase()
        .trim();
      if (!key) continue;
      const uri = row.imageUrl || row.imageLocalUri;
      if (uri) m.set(key, uri);
    }
    return m;
  }, [inventory]);

  const items = page.items || [];
  const payments = page.payments || [];
  const itemsLong = items.length > NESTED_THRESHOLD;
  const paysLong = payments.length > NESTED_THRESHOLD;
  const showLongHint = itemsLong || paysLong;

  const itemNodes = items.map((it) => {
    const descKey = String(it.description || '')
      .toLowerCase()
      .trim();
    const thumbUri = descKey ? imageByDesc.get(descKey) : null;
    const sub = `${formatDateTime(it.createdAt)}${it.note ? ` · ${it.note}` : ''}`;
    return (
      <CustomerUtangLineRow
        key={it.id}
        colors={colors}
        title={it.description || t('common_item')}
        subtitle={sub}
        amount={it.amount}
        thumbUri={thumbUri}
        onEdit={() => onEditItem?.(it)}
        onDelete={() => onDeleteItem?.(it)}
        editA11y={t('cd_a11yEditLine')}
        deleteA11y={t('cd_a11yDeleteLine')}
        readOnly={readOnly}
      />
    );
  });

  const paymentNodes = payments.map((p) => (
    <CustomerUtangLineRow
      key={p.id}
      colors={colors}
      title={p.note ? t('cd_payWithNote', { note: p.note }) : t('cd_payLine')}
      subtitle={formatDateTime(p.createdAt)}
      amount={p.amount}
      fallbackIcon="cash-check"
      onEdit={() => onEditPayment?.(p)}
      onDelete={() => onDeletePayment?.(p)}
      editA11y={t('cd_a11yEditLine')}
      deleteA11y={t('cd_a11yDeleteLine')}
      readOnly={readOnly}
    />
  ));

  return (
    <>
      {showLongHint ? (
        <Text style={[styles.hint, { color: colors.textFaint }]}>
          {t('cd_longSheetScrollHint')}
        </Text>
      ) : null}

      <Text style={[styles.blockLabel, { color: colors.textSecondary }]}>{t('cd_items')}</Text>
      {items.length === 0 ? (
        <Text style={[styles.empty, { color: colors.textFaint }]}>{t('cd_noItemsYet')}</Text>
      ) : itemsLong ? (
        <ScrollView
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          style={{ maxHeight: NESTED_MAX_HEIGHT }}
        >
          {itemNodes}
        </ScrollView>
      ) : (
        itemNodes
      )}

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <Text style={[styles.blockLabel, { color: colors.textSecondary }]}>{t('cd_payments')}</Text>
      {payments.length === 0 ? (
        <Text style={[styles.empty, { color: colors.textFaint }]}>{t('cd_noPaymentsYet')}</Text>
      ) : paysLong ? (
        <ScrollView
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          style={{ maxHeight: NESTED_MAX_HEIGHT }}
        >
          {paymentNodes}
        </ScrollView>
      ) : (
        paymentNodes
      )}

      <View style={[styles.totals, { backgroundColor: colors.chipBg, borderColor: colors.border }]}>
        <View style={styles.totRow}>
          <Text style={[styles.totLbl, { color: colors.textSecondary }]}>{t('cd_subtotalItems')}</Text>
          <Text style={[styles.totVal, { color: colors.text }]}>{formatPeso(page.itemsTotal)}</Text>
        </View>
        <View style={styles.totRow}>
          <Text style={[styles.totLbl, { color: colors.textSecondary }]}>{t('cd_paidSoFar')}</Text>
          <Text style={[styles.totVal, { color: colors.text }]}>{formatPeso(page.paidTotal)}</Text>
        </View>
        <View style={[styles.totRow, styles.dueRow]}>
          <Text style={[styles.dueLbl, { color: colors.text }]}>{t('cd_due')}</Text>
          <Text style={[styles.dueVal, { color: colors.green600 }]}>{formatPeso(page.due)}</Text>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  hint: {
    fontFamily: font.medium,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 6,
  },
  blockLabel: {
    fontFamily: font.semiBold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: 8,
    marginBottom: 8,
  },
  empty: {
    fontFamily: font.medium,
    fontSize: 13,
    marginBottom: 8,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 12,
  },
  totals: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  totRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totLbl: {
    fontFamily: font.medium,
    fontSize: 14,
  },
  totVal: {
    fontFamily: font.semiBold,
    fontSize: 15,
  },
  dueRow: { marginTop: 6, paddingTop: 8 },
  dueLbl: {
    fontFamily: font.semiBold,
    fontSize: 15,
  },
  dueVal: {
    fontFamily: font.extraBold,
    fontSize: 20,
  },
});
