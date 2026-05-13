import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';
import { KeyboardAwareOverlayModal } from '@/components/KeyboardAwareOverlayModal';
import { font } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { useToast } from '@/contexts/ToastContext';
import { useShopData } from '@/contexts/ShopDataContext';
import { createCustomer } from '@/services/customersService';
import { toastSavedOnDeviceAware } from '@/services/offlineUi';
import {
  sanitizeAlphanumeric,
  sanitizeDigits,
  sanitizeLetters,
} from '@/utils/validators';

export function AddCustomerModal({ visible, onDismiss }) {
  const router = useRouter();
  const { t } = useLocale();
  const { showToast } = useToast();
  const { user } = useAuth();
  const { refresh } = useShopData();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) {
      setName('');
      setPhone('');
      setAddress('');
    }
  }, [visible]);

  const close = () => {
    if (!busy) onDismiss();
  };

  const save = async () => {
    const n = name.trim();
    if (!n) return;
    setBusy(true);
    try {
      const id = await createCustomer(user.ownerId, {
        name: n,
        phone,
        address,
      });
      await refresh();
      await toastSavedOnDeviceAware(showToast, t, 'toast_customerAdded');
      onDismiss();
      router.push(`/customer/${id}`);
    } catch (e) {
      showToast({
        type: 'error',
        message: e?.message || t('ac_errSave'),
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
            {t('nav_newCustomer')}
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
              {t('ac_save')}
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
