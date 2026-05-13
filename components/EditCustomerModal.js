import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';
import { KeyboardAwareOverlayModal } from '@/components/KeyboardAwareOverlayModal';
import { font } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { useToast } from '@/contexts/ToastContext';
import { useShopData } from '@/contexts/ShopDataContext';
import { updateCustomer } from '@/services/customersService';
import { toastSavedOnDeviceAware } from '@/services/offlineUi';
import {
  sanitizeAlphanumeric,
  sanitizeDigits,
  sanitizeLetters,
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
  const { user } = useAuth();
  const { refresh } = useShopData();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible && customer) {
      setName(customer.name || '');
      setPhone(customer.phone || '');
      setAddress(customer.address || '');
    }
  }, [visible, customer]);

  const close = () => {
    if (!busy) onDismiss();
  };

  const save = async () => {
    const n = name.trim();
    if (!n || !customer?.id || !user?.ownerId) return;
    setBusy(true);
    try {
      await updateCustomer(user.ownerId, customer.id, {
        name: n,
        phone,
        address,
      });
      await refresh();
      await toastSavedOnDeviceAware(showToast, t, 'toast_customerUpdated');
      onDismiss();
    } catch (e) {
      showToast({
        type: 'error',
        message: e?.message || t('cd_updateErr'),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
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
            onChangeText={(v) => setName(sanitizeLetters(v))}
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
            onChangeText={(v) => setAddress(sanitizeAlphanumeric(v))}
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
