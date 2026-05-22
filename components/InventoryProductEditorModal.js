import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Keyboard, ScrollView, StyleSheet, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Button, Chip, Text, TextInput } from 'react-native-paper';
import { AppConfirmDialog } from '@/components/AppConfirmDialog';
import { KeyboardAwareOverlayModal } from '@/components/KeyboardAwareOverlayModal';
import ProductImage from '@/components/ProductImage';
import { INVENTORY_CATEGORY_PRESET_KEYS } from '@/constants/inventoryCategories';
import { font } from '@/constants/theme';
import { useLocale } from '@/contexts/LocaleContext';
import { useOperationQueue } from '@/contexts/OperationQueueContext';
import { useToast } from '@/contexts/ToastContext';
import { useShopData } from '@/contexts/ShopDataContext';
import {
  createInventoryItem,
  deleteInventoryItem,
  updateInventoryItem,
} from '@/services/inventoryService';
import { isOnline } from '@/services/networkStatus';
import { toastSavedOnDeviceAware } from '@/services/offlineUi';
import { formatPeso, parseAmountInput } from '@/utils/currency';
import { sanitizeDecimal, sanitizeText } from '@/utils/validators';

function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .trim();
}

/**
 * @param {object} props
 * @param {boolean} props.visible
 * @param {() => void} props.onDismiss
 * @param {() => void | Promise<void>} [props.onSaved]
 * @param {string | null} props.editingId
 * @param {string} [props.initialName]
 * @param {string} [props.initialCategory]
 * @param {string} [props.initialUnitPriceStr]
 * @param {boolean} [props.lockCategoryForNewProduct] when true and not editing, category is fixed
 * @param {string | null} [props.initialImageUri] existing remote or local URI when editing
 */
export function InventoryProductEditorModal({
  visible,
  onDismiss,
  onSaved,
  editingId,
  initialName = '',
  initialCategory = '',
  initialUnitPriceStr = '',
  initialImageUri = null,
  lockCategoryForNewProduct = false,
  forcedCategoryWhenLocked = '',
}) {
  const { t } = useLocale();
  const { showToast } = useToast();
  const { runOperation } = useOperationQueue();
  const { inventory, refresh } = useShopData();
  const categoryInputRef = useRef(null);
  const priceInputRef = useRef(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [unitPriceStr, setUnitPriceStr] = useState('');
  const [busy, setBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const [pickedUri, setPickedUri] = useState(null);
  const [clearImage, setClearImage] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);

  const rows = inventory || [];
  const isEditing = Boolean(editingId);
  const showCategoryEditor =
    !lockCategoryForNewProduct || isEditing;

  // Check if there are unsaved changes
  const hasChanges = () => {
    if (name !== initialName) return true;
    if (pickedUri) return true;
    if (clearImage && initialImageUri) return true;
    if (showCategoryEditor && category !== initialCategory) return true;
    if (!showCategoryEditor && category !== String(forcedCategoryWhenLocked || '').trim()) return true;
    if (unitPriceStr !== initialUnitPriceStr) return true;
    return false;
  };

  const displayImageUri = useMemo(() => {
    if (clearImage) return null;
    if (pickedUri) return pickedUri;
    return initialImageUri || null;
  }, [clearImage, pickedUri, initialImageUri]);

  useEffect(() => {
    if (!visible) return;
    setName(initialName || '');
    setUnitPriceStr(initialUnitPriceStr || '');
    setPickedUri(null);
    setClearImage(false);
    if (showCategoryEditor) {
      setCategory(initialCategory || '');
    } else {
      setCategory(String(forcedCategoryWhenLocked || '').trim());
    }
  }, [
    visible,
    initialName,
    initialCategory,
    initialUnitPriceStr,
    initialImageUri,
    forcedCategoryWhenLocked,
    lockCategoryForNewProduct,
    isEditing,
    showCategoryEditor,
  ]);

  const imagePickerOptions = {
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.75,
  };

  const applyPickedAsset = (res) => {
    if (!res.canceled && res.assets?.[0]?.uri) {
      setClearImage(false);
      setPickedUri(res.assets[0].uri);
    }
  };

  const pickImageFromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showToast({ type: 'warning', message: t('inv_photoPermission') });
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync(imagePickerOptions);
    applyPickedAsset(res);
  };

  const takePhotoWithCamera = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        showToast({ type: 'warning', message: t('inv_cameraPermission') });
        return;
      }
      const res = await ImagePicker.launchCameraAsync(imagePickerOptions);
      applyPickedAsset(res);
    } catch (e) {
      showToast({
        type: 'warning',
        message: e?.message || t('inv_cameraUnavailable'),
      });
    }
  };

  const close = () => {
    if (!busy) {
      if (hasChanges()) {
        setDiscardOpen(true);
      } else {
        Keyboard.dismiss();
        onDismiss();
      }
    }
  };

  const save = async () => {
    const n = name.trim();
    if (!n) {
      showToast({ type: 'error', message: t('inv_errName') });
      return;
    }
    const nKey = normalize(n);
    const dup = rows.find(
      (r) => r.id !== editingId && normalize(r.name) === nKey
    );
    if (dup) {
      showToast({ type: 'error', message: t('inv_dupName') });
      return;
    }
    let unitPrice = null;
    if (unitPriceStr.trim() !== '') {
      const p = parseAmountInput(unitPriceStr);
      if (!Number.isFinite(p) || p < 0) {
        showToast({ type: 'error', message: t('inv_errPrice') });
        return;
      }
      unitPrice = p;
    }
    const cat = (
      showCategoryEditor ? category.trim() : String(forcedCategoryWhenLocked || '').trim()
    ).slice(0, 80);

    const imagePayload = {};
    if (pickedUri) imagePayload.pickedImageUri = pickedUri;
    if (clearImage && isEditing) imagePayload.clearProductImage = true;

    setBusy(true);
    onDismiss();
    void runOperation({
      label: editingId ? t('inv_editTitle') : t('inv_addTitle'),
      task: async () => {
        if (editingId) {
          await updateInventoryItem(editingId, {
            name: n,
            unitPrice,
            category: cat,
            ...imagePayload,
          });
        } else {
          await createInventoryItem({
            name: n,
            unitPrice,
            category: cat,
            ...imagePayload,
          });
        }
        await refresh();
      },
      onSuccess: async () => {
        Keyboard.dismiss();
        await toastSavedOnDeviceAware(showToast, t, 'toast_productSaved');
        if (onSaved) await onSaved();
      },
      toastErrorMessage: t('inv_errSave'),
      retryLabel: t('common_retry'),
    });
  };

  const confirmDelete = (item) => {
    setDeleteItem(item);
    setDeleteOpen(true);
  };

  return (
    <>
      <AppConfirmDialog
        visible={discardOpen}
        title={t('inv_discardTitle')}
        message={t('inv_discardMsg')}
        confirmText={t('common_discard')}
        cancelText={t('common_cancel')}
        destructive
        confirmDisabled={busy}
        onCancel={() => {
          setDiscardOpen(false);
        }}
        onConfirm={() => {
          setDiscardOpen(false);
          Keyboard.dismiss();
          onDismiss();
        }}
      />

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
            contentContainerStyle={styles.modalScrollContent}
          >
          <Text variant="titleLarge" style={styles.modalTitle}>
            {editingId ? t('inv_editTitle') : t('inv_addTitle')}
          </Text>
          <TextInput
            mode="outlined"
            label={t('inv_fieldName')}
            value={name}
            onChangeText={(v) => setName(sanitizeText(v))}
            style={styles.input}
            autoFocus={!editingId}
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => {
              if (showCategoryEditor) {
                try {
                  categoryInputRef.current?.focus?.();
                } catch {
                  /* noop */
                }
              } else {
                try {
                  priceInputRef.current?.focus?.();
                } catch {
                  /* noop */
                }
              }
            }}
          />
          <Text variant="bodySmall" style={styles.modalSectionLabel}>
            {t('inv_photoSection')}
          </Text>
          <View style={styles.photoRow}>
            <ProductImage uri={displayImageUri} size={128} containerStyle={displayImageUri ? styles.photoPreviewWrap : [styles.photoPreviewWrap, styles.photoPlaceholder]} style={styles.photoPreview} />
            <View style={styles.photoBtns}>
              <View style={styles.photoPickerRow}>
                <Button
                  mode="outlined"
                  compact
                  style={styles.photoPickerBtn}
                  onPress={pickImageFromLibrary}
                  disabled={busy}
                >
                  {t('inv_photoGallery')}
                </Button>
                <Button
                  mode="outlined"
                  compact
                  style={styles.photoPickerBtn}
                  onPress={takePhotoWithCamera}
                  disabled={busy}
                >
                  {t('inv_takePhoto')}
                </Button>
              </View>
              {displayImageUri ? (
                <Button
                  mode="text"
                  compact
                  onPress={() => {
                    setPickedUri(null);
                    setClearImage(true);
                  }}
                  disabled={busy}
                >
                  {t('inv_removePhoto')}
                </Button>
              ) : null}
            </View>
          </View>
          <Text variant="bodySmall" style={styles.modalHint}>
            {t('inv_photoHint')}
          </Text>
          {!showCategoryEditor ? (
            <Text variant="bodyMedium" style={styles.lockedCategory}>
              {t('inv_category')}:{' '}
              <Text style={styles.lockedCategoryEm}>
                {forcedCategoryWhenLocked
                  ? forcedCategoryWhenLocked
                  : t('inv_filterUncat')}
              </Text>
            </Text>
          ) : (
            <>
              <TextInput
                ref={categoryInputRef}
                mode="outlined"
                label={t('inv_category')}
                value={category}
                onChangeText={(v) =>
                  setCategory(sanitizeText(v).slice(0, 80))
                }
                style={styles.input}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => {
                  try {
                    priceInputRef.current?.focus?.();
                  } catch {
                    /* noop */
                  }
                }}
              />
              <Text variant="bodySmall" style={styles.modalSectionLabel}>
                {t('inv_categoryQuick')}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.modalPresetRow}
              >
                {INVENTORY_CATEGORY_PRESET_KEYS.map((key) => (
                  <Chip
                    key={key}
                    compact
                    style={styles.modalPresetChip}
                    onPress={() => setCategory(t(key))}
                  >
                    {t(key)}
                  </Chip>
                ))}
              </ScrollView>
            </>
          )}
          <TextInput
            ref={priceInputRef}
            mode="outlined"
            label={t('inv_fieldPrice')}
            value={unitPriceStr}
            onChangeText={(v) => setUnitPriceStr(sanitizeDecimal(v))}
            keyboardType="decimal-pad"
            style={styles.input}
            returnKeyType="done"
            onSubmitEditing={() => {
              if (name.trim() && !busy) save();
            }}
          />
          <Text variant="bodySmall" style={styles.modalHint}>
            {t('inv_priceHint')}
          </Text>
          <View style={styles.modalActions}>
            {editingId ? (
              <Button
                mode="text"
                textColor="#C62828"
                onPress={() => {
                  const item = rows.find((r) => r.id === editingId);
                  if (item) confirmDelete(item);
                }}
                disabled={busy}
              >
                {t('inv_deleteA11y')}
              </Button>
            ) : (
              <View style={styles.spacer} />
            )}
            <View style={styles.actionsRight}>
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
          </View>
          </ScrollView>
        )}
      />

      <AppConfirmDialog
        visible={deleteOpen}
        title={t('inv_deleteTitle')}
        message={t('inv_deleteMsg', { name: deleteItem?.name || '' })}
        confirmText={t('common_yes')}
        cancelText={t('common_cancel')}
        destructive
        useNativeModal
        confirmDisabled={busy}
        onCancel={() => {
          setDeleteOpen(false);
          setDeleteItem(null);
        }}
        onConfirm={async () => {
          const it = deleteItem;
          setDeleteOpen(false);
          setDeleteItem(null);
          if (!it) return;
          const snap = {
            name: String(it.name || '').trim(),
            category: String(it.category || '').trim(),
            unitPrice: it.unitPrice,
          };
          try {
            await deleteInventoryItem(it.id);
            await refresh();
            onDismiss();
            const online = await isOnline();
            showToast({
              type: online ? 'success' : 'warning',
              message: t(online ? 'toast_productDeleted' : 'toast_editsQueued'),
              durationMs: 12_000,
              actionLabel: t('common_undo'),
              onAction: async () => {
                try {
                  await createInventoryItem({
                    name: snap.name,
                    category: snap.category,
                    unitPrice: snap.unitPrice,
                  });
                  await refresh();
                  showToast({ type: 'success', message: t('inv_undoProductRestored') });
                } catch {
                  showToast({ type: 'error', message: t('inv_undoProductFail') });
                }
              },
            });
            if (onSaved) await onSaved();
          } catch (e) {
            showToast({
              type: 'error',
              message: e?.message || t('inv_errDelete'),
            });
          }
        }}
      />

      <AppConfirmDialog
        visible={discardOpen}
        title={t('inv_discardTitle')}
        message={t('inv_discardMsg')}
        confirmText={t('common_discard')}
        cancelText={t('common_cancel')}
        destructive
        useNativeModal
        confirmDisabled={busy}
        onCancel={() => {
          setDiscardOpen(false);
        }}
        onConfirm={() => {
          setDiscardOpen(false);
          Keyboard.dismiss();
          onDismiss();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  modalScrollContent: {
    padding: 20,
    paddingBottom: 20,
  },
  modalTitle: { fontFamily: font.extraBold, marginBottom: 12 },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 6,
  },
  photoPreviewWrap: {
    width: 72,
    height: 72,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#dde8df',
    backgroundColor: '#f4f7f5',
  },
  photoPreview: { width: '100%', height: '100%' },
  photoPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  photoPlaceholderText: { opacity: 0.35 },
  photoBtns: { flex: 1, gap: 6 },
  photoPickerRow: { flexDirection: 'row', gap: 8 },
  photoPickerBtn: { flex: 1 },
  lockedCategory: { marginBottom: 12, opacity: 0.9 },
  lockedCategoryEm: { fontFamily: font.semiBold },
  modalSectionLabel: {
    opacity: 0.75,
    marginBottom: 6,
    marginTop: 4,
    fontFamily: font.medium,
  },
  modalPresetRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 8,
    flexWrap: 'nowrap',
  },
  modalPresetChip: { marginRight: 0 },
  input: { marginBottom: 8 },
  modalHint: { opacity: 0.7, marginBottom: 12 },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  actionsRight: { flexDirection: 'row', gap: 8 },
  spacer: { width: 8 },
});
