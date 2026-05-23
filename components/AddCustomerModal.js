import { useRouter } from 'expo-router';
import React, { useEffect, useState, useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Avatar, Button, Chip, Text, TextInput } from 'react-native-paper';
import { KeyboardAwareOverlayModal } from '@/components/KeyboardAwareOverlayModal';
import { AppConfirmDialog } from '@/components/AppConfirmDialog';
import { font } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { useSaveOperation } from '@/hooks/useSaveOperation';
import { useToast } from '@/contexts/ToastContext';
import { useShopData } from '@/contexts/ShopDataContext';
import { createCustomer } from '@/services/customersService';
import { addPageItem } from '@/services/pagesService';
import { toastSavedOnDeviceAware } from '@/services/offlineUi';
import {
  sanitizeDigits,
  sanitizeLetters,
  sanitizeText,
  sanitizeDecimal,
  sanitizeAlphanumeric,
} from '@/utils/validators';
import { amountToInputString, formatPeso, parseAmountInput } from '@/utils/currency';

export function AddCustomerModal({ visible, onDismiss }) {
  const router = useRouter();
  const { t } = useLocale();
  const { showToast } = useToast();
  const { save: runSave } = useSaveOperation();
  const { user } = useAuth();
  const { refresh, customers, inventory } = useShopData();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [txProduct, setTxProduct] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [entries, setEntries] = useState([]);
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);

  useEffect(() => {
    if (visible) {
      setName('');
      setPhone('');
      setAddress('');
      setTxProduct('');
      setTxAmount('');
      setEntries([]);
      setShowProductSuggestions(false);
    }
  }, [visible]);

  const normalize = (value) => String(value || '').toLowerCase().trim();

  // Filter inventory products based on input
  const productSuggestions = useMemo(() => {
    if (!txProduct.trim() || !inventory) return [];
    const search = normalize(txProduct);
    const matches = inventory.filter((item) =>
      normalize(item.name || '').includes(search)
    );
    matches.sort((a, b) => {
      const an = normalize(a.name);
      const bn = normalize(b.name);
      const ap = an.startsWith(search) ? 0 : 1;
      const bp = bn.startsWith(search) ? 0 : 1;
      if (ap !== bp) return ap - bp;
      return an.localeCompare(bn);
    });
    return matches.slice(0, 8);
  }, [txProduct, inventory]);

  const close = () => {
    const isDirty =
      String(name || '').trim() ||
      String(phone || '').trim() ||
      String(address || '').trim() ||
      String(txProduct || '').trim() ||
      String(txAmount || '').trim() ||
      entries.length > 0;
    if (!isDirty) return onDismiss();
    setDiscardOpen(true);
  };

  const [discardOpen, setDiscardOpen] = useState(false);

  const save = async () => {
    const n = name.trim();
    if (!n) return;
    const duplicate = customers?.some(
      (c) => normalize(c.name) === normalize(n)
    );
    if (duplicate) {
      showToast({ type: 'error', message: t('ac_dupName') });
      return;
    }
    onDismiss();
    void runSave({
      label: t('nav_newCustomer'),
      task: async () => {
        const id = await createCustomer(user.ownerId, {
          name: n,
          phone,
          address,
        });
        // create initial utang items if any
        if (entries && entries.length) {
          for (const it of entries) {
            await addPageItem(user.ownerId, id, {
              amount: it.amount,
              description: it.description || t('common_item'),
              note: '',
            });
          }
        }
        await refresh();
        await toastSavedOnDeviceAware(showToast, t, 'toast_customerAdded');
        return id;
      },
      onSuccess: async (id) => {
        router.push(`/customer/${id}`);
      },
      toastErrorMessage: t('ac_errSave'),
      retryLabel: t('common_retry'),
    });
  };

  const parsedTxAmount = parseAmountInput(txAmount);
  const txAmountOk = Number.isFinite(parsedTxAmount) && parsedTxAmount > 0;

  const handleAddEntry = () => {
    if (!txAmountOk) return;
    setEntries((s) => [
      ...s,
      { description: txProduct.trim() || t('common_item'), amount: parsedTxAmount },
    ]);
    setTxProduct('');
    setTxAmount('');
    setShowProductSuggestions(false);
  };

  const handleSelectProduct = (item) => {
    setTxProduct(item.name || '');
    if (item.unitPrice != null && Number.isFinite(Number(item.unitPrice))) {
      setTxAmount(amountToInputString(item.unitPrice));
    }
    setShowProductSuggestions(false);
  };

  const removeEntry = (idx) => {
    setEntries((s) => s.filter((_, i) => i !== idx));
  };

  const totalAmount = entries.reduce((sum, entry) => sum + (entry.amount || 0), 0);

  return (
    <>
      <KeyboardAwareOverlayModal
        visible={visible}
        onDismiss={close}
        dismissable
        renderContent={({ sheetMaxHeight }) => (
          <View style={[styles.modalWrapper, { height: sheetMaxHeight }]}> 
            <ScrollView
              keyboardShouldPersistTaps="handled"
              bounces={false}
              showsVerticalScrollIndicator
              style={styles.scrollArea}
              contentContainerStyle={styles.sheetContent}
            >
            {/* SECTION 1: Customer Information */}
            <Text variant="titleLarge" style={styles.title}>
              {t('nav_newCustomer')}
            </Text>
            <View style={styles.section}>
              <Text variant="labelLarge" style={styles.sectionHeader}>Customer Info</Text>
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
            </View>

            {/* SECTION 2: Items */}
            <View style={styles.section}>
              <Text variant="labelLarge" style={styles.sectionHeader}>Add Items (Optional)</Text>
              <Text style={styles.sectionHint}>Add items to the customer account. You can add more later.</Text>
              
              {/* Product Input with Suggestions */}
              <View style={styles.productInputWrapper}>
                <TextInput
                  mode="outlined"
                  label={t('tm_product')}
                  value={txProduct}
                  onChangeText={(v) => {
                    setTxProduct(sanitizeAlphanumeric(v));
                    setShowProductSuggestions(v.length > 0);
                  }}
                  style={styles.input}
                />
                {showProductSuggestions && productSuggestions.length > 0 && (
                  <View style={styles.suggestSection}>
                    <Text variant="labelLarge" style={styles.suggestLabel}>
                      {t('tm_suggestLabel')}
                    </Text>
                    <View style={styles.chipRow}>
                      {productSuggestions.map((suggestion) => {
                        const thumbUri = suggestion.imageUrl || suggestion.imageLocalUri;
                        return (
                          <Chip
                            key={suggestion.id || suggestion.name}
                            style={styles.chip}
                            onPress={() => handleSelectProduct(suggestion)}
                            avatar={
                              thumbUri ? (
                                <Avatar.Image size={24} source={{ uri: thumbUri }} />
                              ) : undefined
                            }
                          >
                            {suggestion.name}
                            {suggestion.unitPrice != null && Number.isFinite(Number(suggestion.unitPrice))
                              ? ` · ${formatPeso(suggestion.unitPrice)}`
                              : ''}
                          </Chip>
                        );
                      })}
                    </View>
                  </View>
                )}
              </View>

              <TextInput
                mode="outlined"
                label={t('tm_amount')}
                value={txAmount}
                onChangeText={(v) => setTxAmount(sanitizeDecimal(v))}
                keyboardType="decimal-pad"
                style={styles.input}
              />
            </View>

            {/* SECTION 3: Items Summary */}
            {entries.length > 0 && (
              <View style={styles.section}>
                <Text variant="labelLarge" style={styles.sectionHeader}>
                  Items ({entries.length})
                </Text>
                {entries.map((entry, idx) => (
                  <View key={idx} style={styles.itemRow}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{entry.description}</Text>
                    </View>
                    <View style={styles.itemActions}>
                      <Text style={styles.itemAmount}>₱{entry.amount}</Text>
                      <Button 
                        mode="text" 
                        compact
                        textColor="red"
                        onPress={() => removeEntry(idx)}
                      >
                        Remove
                      </Button>
                    </View>
                  </View>
                ))}
                <View style={styles.totalRow}>
                  <Text variant="titleSmall" style={styles.totalLabel}>Total Amount:</Text>
                  <Text variant="titleSmall" style={styles.totalAmount}>₱{totalAmount.toFixed(2)}</Text>
                </View>
              </View>
            )}

            {/* ACTION BUTTONS */}
          </ScrollView>
          <View style={styles.fixedActions}>
            <Button mode="text" compact style={styles.actionButton} onPress={close}>
              {t('common_cancel')}
            </Button>
            <Button
              mode="outlined"
              compact
              style={styles.actionButton}
              onPress={handleAddEntry}
              disabled={!txAmountOk}
            >
              {t('cd_addItem')}
            </Button>
            <Button
              mode="contained"
              compact
              style={styles.actionButton}
              onPress={save}
              disabled={!name.trim()}
            >
              {t('ac_save')}
            </Button>
          </View>
        </View>
        )}
      />
      <AppConfirmDialog
        visible={discardOpen}
        title={t('tm_discardTitle')}
        message={t('tm_discardMsg')}
        confirmText={t('common_discard')}
        cancelText={t('common_cancel')}
        destructive={false}
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
  modalWrapper: {
    width: '100%',
  },
  scrollArea: {
    flex: 1,
  },
  sheetContent: {
    padding: 20,
    paddingBottom: 120,
  },
  fixedActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.08)',
    backgroundColor: 'transparent',
  },
  actionButton: {
    minWidth: 82,
    paddingVertical: 2,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 24,
  },
  title: { 
    fontFamily: font.extraBold, 
    marginBottom: 20 
  },
  section: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  sectionHeader: {
    marginBottom: 12,
    opacity: 0.9,
    fontFamily: font.bold,
  },
  sectionHint: {
    marginBottom: 12,
    opacity: 0.65,
    fontSize: 13,
    lineHeight: 18,
  },
  input: { 
    marginBottom: 12 
  },
  productInputWrapper: {
    marginBottom: 12,
    position: 'relative',
  },
  suggestSection: { marginBottom: 8 },
  suggestLabel: { marginBottom: 6, opacity: 0.85 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { marginBottom: 4 },
  suggestionButton: {
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 0,
  },
  addButton: {
    marginTop: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontFamily: font.semiBold,
    fontSize: 14,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemAmount: {
    fontFamily: font.bold,
    minWidth: 60,
    textAlign: 'right',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  totalLabel: {
    fontFamily: font.semiBold,
  },
  totalAmount: {
    fontFamily: font.bold,
    color: '#1B5E20',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
  },
});
