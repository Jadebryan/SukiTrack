import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text, TextInput, useTheme } from 'react-native-paper';
import { KeyboardAwareOverlayModal } from '@/components/KeyboardAwareOverlayModal';
import { font } from '@/constants/theme';
import { useLocale } from '@/contexts/LocaleContext';
import { parseAmountInput } from '@/utils/currency';
import { sanitizeAlphanumeric, sanitizeDecimal } from '@/utils/validators';

/**
 * @param {object} props
 * @param {boolean} props.visible
 * @param {() => void} props.onDismiss
 * @param {'item'|'payment'} props.kind
 * @param {{ id: string, description?: string, note?: string, amount: number }} props.initial
 * @param {(payload: { amount: number, description?: string, note?: string }) => Promise<void>} props.onSave
 * @param {boolean} props.busy
 */
export function EditUtangEntryModal({
  visible,
  onDismiss,
  kind,
  initial,
  onSave,
  busy,
}) {
  const { t } = useLocale();
  const theme = useTheme();
  const [desc, setDesc] = useState('');
  const [note, setNote] = useState('');
  const [amt, setAmt] = useState('');

  useEffect(() => {
    if (!visible) return;
    setDesc(String(initial?.description || '').trim());
    setNote(String(initial?.note || '').trim());
    setAmt(String(initial?.amount != null ? initial.amount : '').trim());
  }, [visible, initial]);

  const parsed = useMemo(() => parseAmountInput(amt), [amt]);
  const amountOk = Number.isFinite(parsed) && parsed > 0;

  const title = kind === 'payment' ? t('common_payment') : t('common_item');

  return (
    <KeyboardAwareOverlayModal
      visible={visible}
      onDismiss={onDismiss}
      dismissable={!busy}
      renderContent={({ sheetMaxHeight }) => (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={{ maxHeight: sheetMaxHeight }}
          contentContainerStyle={styles.sheet}
        >
          <View style={styles.head}>
            <View
              style={[
                styles.icon,
                {
                  backgroundColor:
                    kind === 'payment'
                      ? '#e8f5ed'
                      : '#fef3c7',
                },
              ]}
            >
              <MaterialCommunityIcons
                name={kind === 'payment' ? 'cash-check' : 'cart-plus'}
                size={18}
                color={kind === 'payment' ? '#2d8a4e' : '#f59e0b'}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{title}</Text>
              <Text style={[styles.sub, { color: theme.colors.onSurfaceVariant }]}>
                {kind === 'payment' ? t('tm_partialPayHint') : t('tm_hint')}
              </Text>
            </View>
          </View>

          {kind === 'item' ? (
            <TextInput
              mode="outlined"
              label={t('tm_product')}
              value={desc}
              onChangeText={(v) => setDesc(sanitizeAlphanumeric(v))}
              style={styles.input}
            />
          ) : null}

          <TextInput
            mode="outlined"
            label={t('tm_note')}
            value={note}
            onChangeText={(v) => setNote(sanitizeAlphanumeric(v))}
            style={styles.input}
          />

          <TextInput
            mode="outlined"
            label={t('tm_amount')}
            keyboardType="decimal-pad"
            value={amt}
            onChangeText={(v) => setAmt(sanitizeDecimal(v))}
            style={styles.input}
          />

          <View style={styles.actions}>
            <Button mode="text" onPress={onDismiss} disabled={busy}>
              {t('common_cancel')}
            </Button>
            <Button
              mode="contained"
              onPress={() =>
                onSave({
                  amount: parsed,
                  description: kind === 'item' ? desc : undefined,
                  note,
                })
              }
              loading={busy}
              disabled={busy || !amountOk || (kind === 'item' && !desc.trim())}
            >
              {t('common_save')}
            </Button>
          </View>
        </ScrollView>
      )}
    />
  );
}

const styles = StyleSheet.create({
  sheet: { padding: 18, paddingBottom: 16 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  icon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: font.extraBold, fontSize: 16 },
  sub: { marginTop: 2, opacity: 0.9, fontSize: 12 },
  input: { marginTop: 10 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 14 },
});

