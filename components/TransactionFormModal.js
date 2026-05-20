import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  Avatar,
  Button,
  Chip,
  RadioButton,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { KeyboardAwareOverlayModal } from '@/components/KeyboardAwareOverlayModal';
import { font } from '@/constants/theme';
import { useLocale } from '@/contexts/LocaleContext';
import { useToast } from '@/contexts/ToastContext';
import {
  amountToInputString,
  formatPeso,
  parseAmountInput,
} from '@/utils/currency';
import {
  sanitizeAlphanumeric,
  sanitizeDecimal,
} from '@/utils/validators';

export function TransactionFormModal({
  visible,
  onDismiss,
  initialType = 'utang',
  onSubmit,
  submitting,
  inventoryItems = [],
  /** Remaining balance on the open credit sheet (payment mode only). */
  sheetDue = null,
}) {
  const { t } = useLocale();
  const { showToast } = useToast();
  const theme = useTheme();
  const [type, setType] = useState(initialType);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    if (visible) {
      setType(initialType);
      setAmount('');
      setNote('');
      setEntries([]);
    }
  }, [visible, initialType]);

  useEffect(() => {
    if (type !== 'utang') {
      setEntries([]);
    }
  }, [type]);

  const parsedAmount = useMemo(() => parseAmountInput(amount), [amount]);
  const amountOk = Number.isFinite(parsedAmount) && parsedAmount > 0;
  const dueNum =
    sheetDue != null && Number.isFinite(Number(sheetDue)) ? Number(sheetDue) : null;
  const showPaymentDue = type === 'payment' && dueNum != null && dueNum > 0;

  const suggestions = useMemo(() => {
    if (type !== 'utang' || !inventoryItems?.length) return [];
    const q = note.trim().toLowerCase();
    if (!q) return [];
    const matches = inventoryItems.filter((it) =>
      String(it.name || '').toLowerCase().includes(q)
    );
    matches.sort((a, b) => {
      const an = String(a.name).toLowerCase();
      const bn = String(b.name).toLowerCase();
      const ap = an.startsWith(q) ? 0 : 1;
      const bp = bn.startsWith(q) ? 0 : 1;
      if (ap !== bp) return ap - bp;
      return an.localeCompare(bn);
    });
    return matches.slice(0, 8);
  }, [type, inventoryItems, note]);

  const applyInventoryPick = (item) => {
    setNote(item.name || '');
    if (
      item.unitPrice != null &&
      Number.isFinite(Number(item.unitPrice)) &&
      Number(item.unitPrice) >= 0
    ) {
      setAmount(String(item.unitPrice));
    }
  };

  const handleAddMore = () => {
    if (!amountOk) {
      showToast({
        type: 'error',
        message: `${t('tm_amountErrTitle')}: ${t('tm_amountErrMsg')}`,
      });
      return;
    }
    setEntries((prev) => [
      ...prev,
      {
        amount: parsedAmount,
        description: (note && String(note).trim()) || t('common_item'),
      },
    ]);
    setAmount('');
    setNote('');
  };

  const handleSave = async () => {
    if (type === 'payment') {
      if (!amountOk) {
        showToast({
          type: 'error',
          message: `${t('tm_amountErrTitle')}: ${t('tm_amountErrMsg')}`,
        });
        return;
      }
      if (dueNum != null && parsedAmount > dueNum + 0.005) {
        showToast({
          type: 'error',
          message: t('tm_payExceedsDue', { amount: formatPeso(dueNum) }),
        });
        return;
      }
      await onSubmit({ type, amount: parsedAmount, note });
      return;
    }

    const queued = entries.slice();
    if (amountOk) {
      queued.push({
        amount: parsedAmount,
        description: (note && String(note).trim()) || t('common_item'),
      });
    }
    if (!queued.length) {
      showToast({
        type: 'error',
        message: `${t('tm_amountErrTitle')}: ${t('tm_amountErrMsg')}`,
      });
      return;
    }
    await onSubmit({ type, items: queued });
  };

  const fillFullDue = () => {
    if (dueNum == null || dueNum <= 0) return;
    setAmount(amountToInputString(dueNum));
  };

  return (
    <KeyboardAwareOverlayModal
      visible={visible}
      onDismiss={onDismiss}
      dismissable={!submitting}
      renderContent={({ sheetMaxHeight }) => (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={{ maxHeight: sheetMaxHeight }}
          contentContainerStyle={styles.sheetContent}
        >
          <Text variant="headlineSmall" style={styles.title}>
            {t('tm_title')}
          </Text>
          <Text variant="bodyMedium" style={styles.hint}>
            {t('tm_hint')}
          </Text>

          <View style={styles.radioRow}>
            <View style={styles.radioItem}>
              <RadioButton
                value="utang"
                status={type === 'utang' ? 'checked' : 'unchecked'}
                onPress={() => setType('utang')}
              />
              <Text variant="titleMedium">{t('common_item')}</Text>
            </View>
            <View style={styles.radioItem}>
              <RadioButton
                value="payment"
                status={type === 'payment' ? 'checked' : 'unchecked'}
                onPress={() => setType('payment')}
              />
              <Text variant="titleMedium">{t('common_payment')}</Text>
            </View>
          </View>

          {type === 'utang' ? (
            <>
              <TextInput
                mode="outlined"
                label={t('tm_product')}
                value={note}
                onChangeText={(v) => setNote(sanitizeAlphanumeric(v))}
                style={styles.input}
              />
              {suggestions.length > 0 ? (
                <View style={styles.suggestSection}>
                  <Text variant="labelLarge" style={styles.suggestLabel}>
                    {t('tm_suggestLabel')}
                  </Text>
                  <View style={styles.chipRow}>
                    {suggestions.map((s) => {
                      const thumbUri = s.imageUrl || s.imageLocalUri;
                      return (
                        <Chip
                          key={s.id}
                          style={styles.chip}
                          onPress={() => applyInventoryPick(s)}
                          avatar={
                            thumbUri ? (
                              <Avatar.Image
                                size={24}
                                source={{ uri: thumbUri }}
                              />
                            ) : null
                          }
                        >
                          {s.name}
                          {s.unitPrice != null &&
                          Number.isFinite(Number(s.unitPrice))
                            ? ` · ${formatPeso(s.unitPrice)}`
                            : ''}
                        </Chip>
                      );
                    })}
                  </View>
                </View>
              ) : null}
            </>
          ) : null}

          {showPaymentDue ? (
            <View
              style={[
                styles.dueBlock,
                { backgroundColor: theme.colors.primaryContainer },
              ]}
            >
              <Text
                variant="titleMedium"
                style={[
                  styles.dueAmount,
                  { color: theme.colors.onPrimaryContainer },
                ]}
              >
                {t('tm_paymentDueLabel', { amount: formatPeso(dueNum) })}
              </Text>
              <Text
                variant="bodySmall"
                style={[
                  styles.partialHint,
                  { color: theme.colors.onPrimaryContainer },
                ]}
              >
                {t('tm_partialPayHint')}
              </Text>
              <Chip icon="cash-fast" onPress={fillFullDue} style={styles.dueChip}>
                {t('tm_payFullDue')}
              </Chip>
            </View>
          ) : null}

          <TextInput
            mode="outlined"
            label={t('tm_amount')}
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={(v) => setAmount(sanitizeDecimal(v))}
            style={styles.input}
          />
          {type === 'payment' ? (
            <TextInput
              mode="outlined"
              label={t('tm_note')}
              value={note}
              onChangeText={(v) => setNote(sanitizeAlphanumeric(v))}
              style={styles.input}
            />
          ) : null}

          {type === 'utang' && entries.length > 0 ? (
            <View style={styles.previewWrap}>
              <Text variant="labelLarge" style={styles.previewLabel}>
                {entries.length > 1
                  ? `${entries.length} items ready to save`
                  : '1 item ready to save'}
              </Text>
              {entries.map((entry, index) => (
                <View key={index} style={styles.previewRow}>
                  <Text>{entry.description}</Text>
                  <Text style={styles.previewAmount}>{formatPeso(entry.amount)}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.actions}>
            <Button mode="text" onPress={onDismiss} disabled={submitting}>
              {t('common_cancel')}
            </Button>
            {type === 'utang' ? (
              <Button
                mode="outlined"
                onPress={handleAddMore}
                loading={submitting}
                disabled={submitting || !amountOk}
              >
                Add more
              </Button>
            ) : null}
            <Button
              mode="contained"
              onPress={handleSave}
              loading={submitting}
              disabled={
                submitting ||
                (type === 'payment'
                  ? !amountOk
                  : !(amountOk || entries.length > 0))
              }
            >
              {type === 'utang' && entries.length > 0
                ? 'Save all'
                : t('common_save')}
            </Button>
          </View>
        </ScrollView>
      )}
    />
  );
}

const styles = StyleSheet.create({
  sheetContent: {
    padding: 20,
  },
  title: { fontFamily: font.extraBold },
  hint: { marginTop: 8, marginBottom: 12, opacity: 0.75 },
  radioRow: { flexDirection: 'row', gap: 16, marginBottom: 8 },
  radioItem: { flexDirection: 'row', alignItems: 'center' },
  suggestSection: { marginBottom: 8 },
  suggestLabel: { marginBottom: 6, opacity: 0.85 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { marginBottom: 4 },
  dueBlock: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
  },
  dueAmount: { fontFamily: font.extraBold },
  partialHint: { marginTop: 6, marginBottom: 10, opacity: 0.88, lineHeight: 20 },
  dueChip: { alignSelf: 'flex-start' },
  input: { marginBottom: 12 },
  previewWrap: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  previewLabel: { marginBottom: 8, opacity: 0.8 },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  previewAmount: { fontFamily: font.bold },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
});
