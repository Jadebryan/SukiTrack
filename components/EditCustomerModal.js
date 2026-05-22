import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';
import { KeyboardAwareOverlayModal } from '@/components/KeyboardAwareOverlayModal';
import { AppConfirmDialog } from '@/components/AppConfirmDialog';
import { font } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { useOperationQueue } from '@/contexts/OperationQueueContext';
import { useToast } from '@/contexts/ToastContext';
import { useShopData } from '@/contexts/ShopDataContext';
import { updateCustomer } from '@/services/customersService';
import { toastSavedOnDeviceAware } from '@/services/offlineUi';
import {
  sanitizeDigits,
  sanitizeLetters,
  sanitizeText,
} from '@/utils/validators';

/**
 * @param {object} props
 * @param {boolean} props.visible
 * @param {() => void} props.onDismiss
 * @param {{ id: string, name?: string, phone?: string, address?: string } | null} props.customer
 */
export function EditCustomerModal({ visible, onDismiss, customer }) {
  const { t } = useLocale();
  const { showToast } = useToast();
  const { runOperation } = useOperationQueue();
  const { user } = useAuth();
  const { refresh, customers } = useShopData();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [busy, setBusy] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);

  useEffect(() => {
    if (visible && customer) {
      setName(customer.name || '');
      setPhone(customer.phone || '');
      setAddress(customer.address || '');
    }
  }, [visible, customer]);

  const normalize = (value) => String(value || '').toLowerCase().trim();

  const close = () => {
    if (busy) return;
    const dirty =
      String(name || '') !== String(customer?.name || '') ||
      String(phone || '') !== String(customer?.phone || '') ||
      String(address || '') !== String(customer?.address || '');
    if (!dirty) return onDismiss();
    setDiscardOpen(true);
  };

  const save = async () => {
    const n = name.trim();
    if (!n || !customer?.id || !user?.ownerId) return;
    const duplicate = customers?.some(
      (c) => c.id !== customer.id && normalize(c.name) === normalize(n)
    );
    if (duplicate) {
      showToast({ type: 'error', message: t('ac_dupName') });
      return;
    }
    setBusy(true);
    onDismiss();
    void runOperation({
      label: t('common_customer'),
      task: async () => {
        await updateCustomer(user.ownerId, customer.id, {
          name: n,
          phone,
          address,
        });
        await refresh();
        await toastSavedOnDeviceAware(showToast, t, 'toast_customerUpdated');
      },
      toastErrorMessage: t('cd_updateErr'),
      retryLabel: t('common_retry'),
    });
  };

  return (
    <>
      <KeyboardAwareOverlayModal
        visible={visible}
        onDismiss={close}
        dismissable={!busy}
        renderContent={({ sheetMaxHeight }) => (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            bounces={false}
            showsVerticalScrollIndicator
            style={{ maxHeight: sheetMaxHeight }}
            contentContainerStyle={styles.scrollContent}
          >
            <Text variant="titleLarge" style={styles.title}>
              {t('cd_editTitle')}
            </Text>
            <TextInput
              mode="outlined"
              label={t('ac_name')}
              value={name}
              onChangeText={(v) => setName(sanitizeText(v))}
              style={styles.input}
            />
            <TextInput
              mode="outlined"
              label={t('ac_contact')}
              value={phone}
              onChangeText={(v) => setPhone(sanitizeDigits(v))}
              keyboardType="phone-pad"
              style={styles.input}
            />
            <TextInput
              mode="outlined"
              label={t('ac_address')}
              value={address}
              onChangeText={(v) => setAddress(sanitizeText(v))}
              style={styles.input}
            />
            <View style={styles.actions}>
              <Button mode="text" onPress={close} disabled={busy}>
                {t('common_cancel')}
              </Button>
              <Button
                mode="contained"
                onPress={save}
                loading={busy}
                disabled={busy || !name.trim()}
              >
                {t('common_save')}
              </Button>
            </View>
          </ScrollView>
        )}
      />

      <AppConfirmDialog
        visible={discardOpen}
        title={t('tm_discardTitle')}
        message={t('tm_discardMsg')}
        confirmText={t('common_discard')}
        cancelText={t('common_cancel')}
        useNativeModal
        onConfirm={() => {
          setDiscardOpen(false);
          onDismiss();
        }}
        onCancel={() => setDiscardOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 20,
  },
  title: { fontFamily: font.extraBold, marginBottom: 16 },
  input: { marginBottom: 12 },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
});
