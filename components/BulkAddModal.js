import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text, TextInput, useTheme } from 'react-native-paper';
import { KeyboardAwareOverlayModal } from '@/components/KeyboardAwareOverlayModal';
import { font } from '@/constants/theme';
import { useLocale } from '@/contexts/LocaleContext';
import { sanitizeDecimal } from '@/utils/validators';

/**
 * BulkAddModal expects the user to paste one entry per line. Each line should
 * include an amount (preferably at the end). The parser will try to find a
 * trailing number and use the rest as the description.
 */
export function BulkAddModal({ visible, onDismiss, onConfirm, busy }) {
  const { t } = useLocale();
  const theme = useTheme();
  const [text, setText] = useState('');

  const parsed = useMemo(() => {
    const lines = (text || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const items = [];
    const errors = [];
    const numRx = /(-?\d[\d,]*\.?\d*)\s*$/;
    lines.forEach((ln, idx) => {
      const m = ln.match(numRx);
      if (!m) {
        errors.push({ line: idx + 1, reason: 'no-amount' });
        return;
      }
      const rawNum = m[1].replace(/,/g, '');
      const amount = Number(rawNum);
      if (!Number.isFinite(amount) || amount <= 0) {
        errors.push({ line: idx + 1, reason: 'invalid-amount' });
        return;
      }
      const desc = ln.slice(0, m.index).trim();
      items.push({ amount, description: desc || t('common_item') });
    });
    return { items, errors };
  }, [text, t]);

  const handleConfirm = async () => {
    if (!onConfirm) return;
    if (!parsed.items.length) return;
    await onConfirm(parsed.items);
  };

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
          contentContainerStyle={styles.sheetContent}
        >
          <Text variant="headlineSmall" style={styles.title}>
            Bulk add
          </Text>
          <Text variant="bodyMedium" style={styles.hint}>
            Paste one entry per line. Append the amount at the end of each line.
            Example: "Sardinas 10pcs 120" (description then amount).
          </Text>

          <TextInput
            mode="outlined"
            label={t('common_items')}
            value={text}
            onChangeText={(v) => setText(v)}
            multiline
            numberOfLines={6}
            style={styles.input}
          />

          <View style={styles.previewWrap}>
            <Text variant="labelLarge" style={styles.previewLabel}>
              Preview
            </Text>
            {parsed.items.length === 0 && parsed.errors.length === 0 ? (
              <Text style={styles.muted}>No lines yet</Text>
            ) : null}
            {parsed.items.map((it, i) => (
              <View key={i} style={styles.previewRow}>
                <Text>{it.description}</Text>
                <Text style={{ color: theme.colors.primary }}>{it.amount}</Text>
              </View>
            ))}
            {parsed.errors.map((e) => (
              <Text key={e.line} style={styles.err}>
                {`Line ${e.line}: could not parse amount`}
              </Text>
            ))}
          </View>

          <View style={styles.actions}>
            <Button mode="text" onPress={onDismiss} disabled={busy}>
              {t('common_cancel')}
            </Button>
            <Button
              mode="contained"
              onPress={handleConfirm}
              loading={busy}
              disabled={busy || parsed.items.length === 0}
            >
              Add {parsed.items.length > 0 ? `(${parsed.items.length})` : ''}
            </Button>
          </View>
        </ScrollView>
      )}
    />
  );
}

const styles = StyleSheet.create({
  sheetContent: { padding: 20 },
  title: { fontFamily: font.extraBold },
  hint: { marginTop: 8, marginBottom: 12, opacity: 0.75 },
  input: { marginBottom: 12, minHeight: 120 },
  previewWrap: { marginBottom: 12 },
  previewLabel: { marginBottom: 6, opacity: 0.85 },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  err: { color: '#b91c1c', paddingVertical: 2 },
  muted: { opacity: 0.6 },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
});

export default BulkAddModal;
