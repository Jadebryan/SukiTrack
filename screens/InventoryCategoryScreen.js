import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useDeferredValue, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Chip, Dialog, IconButton, Portal, Text, TextInput, useTheme } from 'react-native-paper';
import { AppConfirmDialog } from '@/components/AppConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { InventoryCategoryListHeader } from '@/components/inventory/InventoryCategoryListHeader';
import InventoryCategoryProductRow from '@/components/inventory/InventoryCategoryProductRow';
import { InventoryProductEditorModal } from '@/components/InventoryProductEditorModal';
import { InventoryProductListSkeleton } from '@/components/Skeleton';
import { VerifyPinModal } from '@/components/VerifyPinModal';
import { getTabBarOuterHeight } from '@/constants/tabBar';
import { INVENTORY_CATEGORY_PRESET_KEYS } from '@/constants/inventoryCategories';
import { getInventoryCategoryPalette } from '@/constants/inventoryCategoryPalette';
import { font } from '@/constants/theme';
import { useAppTheme } from '@/contexts/AppThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { useToast } from '@/contexts/ToastContext';
import { useInventoryShopData } from '@/hooks/useShopInventory';
import { isOnline } from '@/services/networkStatus';
import * as pinService from '@/services/pinService';
import { updateInventoryItem } from '@/services/inventoryService';
import { itemMatchesCategorySlug, slugToCategory } from '@/utils/categoryRoute';
import { safeRouterBack } from '@/utils/safeRouterBack';

function normalize(s) {
  return String(s || '').toLowerCase().trim();
}

const LIST_PAD = 16;
const LIST_BOTTOM_PAD = 24;

export function InventoryCategoryScreen() {
  const { slug: slugParam } = useLocalSearchParams();
  const router = useRouter();
  const { t } = useLocale();
  const { user } = useAuth();
  const { showToast } = useToast();
  const theme = useTheme();
  const { isDark } = useAppTheme();
  const colors = useMemo(() => getInventoryCategoryPalette(isDark), [isDark]);
  const insets = useSafeAreaInsets();
  const { inventory, refresh, loading, error } = useInventoryShopData();
  const [refreshing, setRefreshing] = useState(false);
  const [q, setQ] = useState('');
  const deferredQ = useDeferredValue(q);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [initialName, setInitialName] = useState('');
  const [initialCategory, setInitialCategory] = useState('');
  const [initialUnitPriceStr, setInitialUnitPriceStr] = useState('');
  const [initialImageUri, setInitialImageUri] = useState(null);
  const [bulkUncatConfirmOpen, setBulkUncatConfirmOpen] = useState(false);
  const [bulkUncatPinOpen, setBulkUncatPinOpen] = useState(false);
  const [bulkUncatBusy, setBulkUncatBusy] = useState(false);
  const [bulkMoveBusy, setBulkMoveBusy] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [moveCategory, setMoveCategory] = useState('');
  const pendingBulkSnapshotRef = useRef([]);

  const slug = useMemo(() => {
    const raw = slugParam;
    const s = Array.isArray(raw) ? raw[0] : raw;
    return String(s || '_').trim() || '_';
  }, [slugParam]);

  const categoryStored = useMemo(() => slugToCategory(slug, t), [slug, t]);

  const headerTitle = useMemo(
    () => (categoryStored.trim() ? categoryStored.trim() : t('inv_filterUncat')),
    [categoryStored, t]
  );

  const rows = useMemo(() => inventory || [], [inventory]);
  const nq = useMemo(() => normalize(deferredQ), [deferredQ]);

  const filtered = useMemo(() => {
    const list = rows.filter((it) => itemMatchesCategorySlug(it, slug, t));
    const matches = list.filter((it) => {
      if (!nq) return true;
      return (
        normalize(it.name).includes(nq) ||
        normalize(String(it.category || '')).includes(nq)
      );
    });
    return [...matches].sort((a, b) =>
      String(a.name || '').localeCompare(String(b.name || ''), 'en', {
        sensitivity: 'base',
      })
    );
  }, [rows, slug, t, nq]);

  const resetSelection = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds([]);
  }, []);

  const toggleRowSelection = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id];
      if (next.length === 0) setSelectionMode(false);
      return next;
    });
  }, []);

  const runBulkUncat = useCallback(
    async (snapshot) => {
      if (!user?.ownerId || !snapshot?.length) return;
      setBulkUncatBusy(true);
      const doneIds = [];
      try {
        for (const p of snapshot) {
          await updateInventoryItem(p.id, {
            name: p.name,
            category: '',
            unitPrice: p.unitPrice,
          });
          doneIds.push(p.id);
        }
        await refresh();
        const online = await isOnline();
        showToast({
          type: online ? 'success' : 'warning',
          message: online
            ? t('inv_bulkUncatToast', { count: snapshot.length })
            : t('toast_editsQueued'),
          durationMs: 12_000,
          actionLabel: t('common_undo'),
          onAction: async () => {
            try {
              for (const row of snapshot) {
                await updateInventoryItem(row.id, {
                  name: row.name,
                  category: row.category,
                  unitPrice: row.unitPrice,
                });
              }
              await refresh();
              showToast({ type: 'success', message: t('inv_bulkUncatUndoDone') });
            } catch {
              showToast({ type: 'error', message: t('inv_bulkUncatUndoFail') });
            }
          },
        });
      } catch {
        for (const id of [...doneIds].reverse()) {
          const orig = snapshot.find((x) => x.id === id);
          if (!orig) continue;
          try {
            await updateInventoryItem(id, {
              name: orig.name,
              category: orig.category,
              unitPrice: orig.unitPrice,
            });
          } catch {
            /* best-effort rollback */
          }
        }
        showToast({ type: 'error', message: t('common_error') });
      } finally {
        setBulkUncatBusy(false);
        pendingBulkSnapshotRef.current = [];
        resetSelection();
      }
    },
    [user?.ownerId, t, showToast, refresh, resetSelection]
  );

  const runBulkMove = useCallback(
    async (snapshot, targetCategory) => {
      if (!user?.ownerId || !snapshot?.length || !targetCategory?.trim()) return;
      setBulkMoveBusy(true);
      const doneIds = [];
      try {
        const categoryValue = targetCategory.trim().slice(0, 80);
        for (const p of snapshot) {
          await updateInventoryItem(p.id, {
            name: p.name,
            category: categoryValue,
            unitPrice: p.unitPrice,
          });
          doneIds.push(p.id);
        }
        await refresh();
        const online = await isOnline();
        showToast({
          type: online ? 'success' : 'warning',
          message: online
            ? t('inv_bulkMoveToast', {
                count: snapshot.length,
                category: categoryValue,
              })
            : t('toast_editsQueued'),
          durationMs: 12_000,
          actionLabel: t('common_undo'),
          onAction: async () => {
            try {
              for (const row of snapshot) {
                await updateInventoryItem(row.id, {
                  name: row.name,
                  category: row.category,
                  unitPrice: row.unitPrice,
                });
              }
              await refresh();
              showToast({
                type: 'success',
                message: t('inv_bulkMoveUndoDone', {
                  category: categoryValue,
                }),
              });
            } catch {
              showToast({ type: 'error', message: t('inv_bulkMoveUndoFail') });
            }
          },
        });
      } catch {
        for (const id of [...doneIds].reverse()) {
          const orig = snapshot.find((x) => x.id === id);
          if (!orig) continue;
          try {
            await updateInventoryItem(id, {
              name: orig.name,
              category: orig.category,
              unitPrice: orig.unitPrice,
            });
          } catch {
            /* best-effort rollback */
          }
        }
        showToast({ type: 'error', message: t('common_error') });
      } finally {
        setBulkMoveBusy(false);
        pendingBulkSnapshotRef.current = [];
        resetSelection();
      }
    },
    [user?.ownerId, t, showToast, refresh, resetSelection]
  );

  const openBulkUncatFlow = useCallback(() => {
    pendingBulkSnapshotRef.current = filtered.map((it) => ({
      id: it.id,
      name: it.name,
      category: String(it.category || '').trim(),
      unitPrice: it.unitPrice,
    }));
    setBulkUncatConfirmOpen(true);
  }, [filtered]);

  const openBulkSelectMode = useCallback(() => {
    setSelectionMode(true);
    setSelectedIds([]);
  }, []);

  const openBulkUncatSelectedFlow = useCallback(() => {
    pendingBulkSnapshotRef.current = rows
      .filter((it) => selectedIds.includes(it.id))
      .map((it) => ({
        id: it.id,
        name: it.name,
        category: String(it.category || '').trim(),
        unitPrice: it.unitPrice,
      }));
    setBulkUncatConfirmOpen(true);
  }, [rows, selectedIds]);

  const openBulkMoveFlow = useCallback(() => {
    pendingBulkSnapshotRef.current = rows
      .filter((it) => selectedIds.includes(it.id))
      .map((it) => ({
        id: it.id,
        name: it.name,
        category: String(it.category || '').trim(),
        unitPrice: it.unitPrice,
      }));
    setMoveCategory('');
    setMoveDialogOpen(true);
  }, [rows, selectedIds]);

  const bulkActionBusy = bulkUncatBusy || bulkMoveBusy;
  const fabBottom = getTabBarOuterHeight(insets.bottom) + 12;
  const showUncategorizeAll =
    Boolean(user?.ownerId) && Boolean(categoryStored.trim()) && filtered.length > 0;
  const showSelectButton =
    Boolean(categoryStored.trim()) && filtered.length > 0;

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      await new Promise((r) => setTimeout(r, 250));
      setRefreshing(false);
    }
  };

  const openCreate = useCallback(() => {
    setEditingId(null);
    setInitialName('');
    setInitialCategory('');
    setInitialUnitPriceStr('');
    setInitialImageUri(null);
    setEditorOpen(true);
  }, []);

  const openEdit = useCallback((item) => {
    setEditingId(item.id);
    setInitialName(item.name || '');
    setInitialCategory(String(item.category || '').trim());
    setInitialUnitPriceStr(
      item.unitPrice != null && Number.isFinite(Number(item.unitPrice))
        ? String(item.unitPrice)
        : ''
    );
    setInitialImageUri(item.imageUrl || item.imageLocalUri || null);
    setEditorOpen(true);
  }, []);

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingId(null);
  };

  const handleToggleSelectMode = useCallback(() => {
    if (selectionMode) {
      resetSelection();
    } else {
      openBulkSelectMode();
    }
  }, [selectionMode, resetSelection, openBulkSelectMode]);

  const listEmpty =
    loading && rows.length === 0 ? (
      <InventoryProductListSkeleton rows={7} />
    ) : !loading && filtered.length === 0 ? (
      <View style={styles.emptyWrap}>
        <EmptyState
          icon="package-variant-closed"
          title={t('inv_catEmptyTitle')}
          subtitle={t('inv_catEmptySubtitle')}
          actionLabel={t('inv_add')}
          onAction={openCreate}
        />
      </View>
    ) : null;

  const selectedCount = selectedIds.length;
  const bulkSnapshot = pendingBulkSnapshotRef.current;
  const bulkCount = bulkSnapshot.length;
  const bulkCategoryLabel = categoryStored.trim() || t('inv_filterUncat');
  const listBottomPad = selectionMode ? fabBottom + 100 : fabBottom + LIST_BOTTOM_PAD;

  const renderItem = useCallback(
    ({ item }) => {
      const selected = selectedIds.includes(item.id);
      return (
        <InventoryCategoryProductRow
          item={item}
          colors={colors}
          selectionMode={selectionMode}
          selected={selected}
          onPress={() => {
            if (selectionMode) {
              toggleRowSelection(item.id);
              return;
            }
            openEdit(item);
          }}
          onToggleSelect={() => toggleRowSelection(item.id)}
          onLongPress={() => {
            if (!selectionMode) {
              setSelectionMode(true);
              setSelectedIds([item.id]);
            }
          }}
        />
      );
    },
    [colors, selectionMode, selectedIds, toggleRowSelection, openEdit]
  );

  const listHeader = useMemo(
    () => (
      <InventoryCategoryListHeader
        colors={colors}
        t={t}
        error={error}
        title={headerTitle}
        q={q}
        onChangeQuery={setQ}
        onBack={() => safeRouterBack(router, '/inventory')}
        showUncategorizeAll={showUncategorizeAll}
        onUncategorizeAll={openBulkUncatFlow}
        uncategorizeDisabled={bulkUncatBusy}
        selectionMode={selectionMode}
        selectedCount={selectedCount}
        showSelectButton={showSelectButton}
        onToggleSelectMode={handleToggleSelectMode}
        onAddProduct={openCreate}
        showAddButton={!selectionMode}
      />
    ),
    [
      colors,
      t,
      error,
      headerTitle,
      q,
      showUncategorizeAll,
      openBulkUncatFlow,
      bulkUncatBusy,
      selectionMode,
      selectedCount,
      showSelectButton,
      handleToggleSelectMode,
      openCreate,
      router,
    ]
  );

  return (
    <>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <KeyboardAvoidingView
        style={[styles.flex, { backgroundColor: colors.bg }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          style={styles.listFlex}
          data={filtered}
          keyExtractor={(it) => it.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListHeaderComponent={
            <View style={{ paddingTop: insets.top }}>{listHeader}</View>
          }
          contentContainerStyle={[
            styles.content,
            { paddingHorizontal: LIST_PAD, paddingBottom: listBottomPad },
          ]}
          ListEmptyComponent={listEmpty}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />

        {selectionMode ? (
          <View
            style={[
              styles.bulkSelectionBar,
              {
                bottom: fabBottom,
                borderColor: colors.border,
                backgroundColor: colors.surface,
              },
            ]}
          >
            <Text style={[styles.selectionLabel, { color: colors.text }]}>
              {t('inv_bulkSelectedCount', { count: selectedCount })}
            </Text>
            <View style={styles.selectionActions}>
              <Button
                mode="outlined"
                compact
                onPress={openBulkMoveFlow}
                disabled={!selectedCount || bulkActionBusy}
              >
                {t('inv_bulkMove')}
              </Button>
              <Button
                mode="contained"
                compact
                onPress={openBulkUncatSelectedFlow}
                disabled={!selectedCount || bulkActionBusy}
              >
                {t('inv_bulkUncatSelected')}
              </Button>
              <IconButton
                icon="close"
                size={24}
                onPress={resetSelection}
                disabled={bulkActionBusy}
                accessibilityLabel={t('common_cancel')}
              />
            </View>
          </View>
        ) : null}

        <InventoryProductEditorModal
          visible={editorOpen}
          onDismiss={closeEditor}
          editingId={editingId}
          initialName={initialName}
          initialCategory={initialCategory}
          initialUnitPriceStr={initialUnitPriceStr}
          initialImageUri={initialImageUri}
          lockCategoryForNewProduct
          forcedCategoryWhenLocked={categoryStored}
        />
      </KeyboardAvoidingView>

      <Portal>
        <Dialog
          visible={moveDialogOpen}
          onDismiss={() => setMoveDialogOpen(false)}
          style={[styles.dialog, { borderColor: theme.colors.outlineVariant }]}
        >
          <Dialog.Title>{t('inv_bulkMoveTitle')}</Dialog.Title>
          <Dialog.Content>
            <Text style={[styles.moveDialogMsg, { color: theme.colors.onSurfaceVariant }]}>
              {t('inv_bulkMoveHint', {
                count: selectedCount,
                category: bulkCategoryLabel,
              })}
            </Text>
            <TextInput
              label={t('inv_category')}
              value={moveCategory}
              onChangeText={(value) => setMoveCategory(value.slice(0, 80))}
              style={styles.input}
              placeholder={t('inv_categoryPlaceholder')}
            />
            <Text variant="bodySmall" style={styles.modalSectionLabel}>
              {t('inv_categoryQuick')}
            </Text>
            <View style={styles.modalPresetRow}>
              {INVENTORY_CATEGORY_PRESET_KEYS.map((key) => (
                <Chip
                  key={key}
                  compact
                  style={styles.modalPresetChip}
                  onPress={() => setMoveCategory(t(key))}
                >
                  {t(key)}
                </Chip>
              ))}
            </View>
          </Dialog.Content>
          <Dialog.Actions style={styles.dialogActions}>
            <Button onPress={() => setMoveDialogOpen(false)}>{t('common_cancel')}</Button>
            <Button
              mode="contained"
              onPress={async () => {
                setMoveDialogOpen(false);
                const snap = pendingBulkSnapshotRef.current;
                const targetCategory = moveCategory.trim();
                if (!snap?.length || !targetCategory) return;
                await runBulkMove(snap, targetCategory);
              }}
              disabled={!moveCategory.trim() || bulkActionBusy}
              loading={bulkMoveBusy}
            >
              {t('inv_bulkMoveConfirm')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <AppConfirmDialog
        visible={bulkUncatConfirmOpen}
        title={t('inv_bulkUncatTitle')}
        message={t('inv_bulkUncatMsg', {
          count: bulkCount,
          category: bulkCategoryLabel,
        })}
        confirmText={t('inv_bulkUncatConfirm')}
        cancelText={t('common_cancel')}
        destructive
        confirmDisabled={bulkActionBusy}
        confirmLoading={bulkActionBusy}
        onCancel={() => {
          if (!bulkActionBusy) {
            setBulkUncatConfirmOpen(false);
            pendingBulkSnapshotRef.current = [];
          }
        }}
        onConfirm={() => {
          setBulkUncatConfirmOpen(false);
          void (async () => {
            const snap = pendingBulkSnapshotRef.current;
            if (!snap?.length || !user?.ownerId) return;
            if (await pinService.hasPin()) {
              setBulkUncatPinOpen(true);
              return;
            }
            await runBulkUncat(snap);
          })();
        }}
      />

      <VerifyPinModal
        visible={bulkUncatPinOpen}
        onDismiss={() => {
          setBulkUncatPinOpen(false);
          pendingBulkSnapshotRef.current = [];
        }}
        title={t('inv_bulkUncatPinTitle')}
        message={t('inv_bulkUncatPinMsg')}
        cancelText={t('common_cancel')}
        confirmText={t('inv_bulkUncatPinConfirm')}
        onConfirmed={async () => {
          setBulkUncatPinOpen(false);
          const snap = pendingBulkSnapshotRef.current;
          if (snap?.length) await runBulkUncat(snap);
          else pendingBulkSnapshotRef.current = [];
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  listFlex: { flex: 1 },
  content: { flexGrow: 1 },
  emptyWrap: { flex: 1, justifyContent: 'center', minHeight: 280 },
  bulkSelectionBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    padding: 12,
  },
  selectionLabel: { fontFamily: font.extraBold, marginBottom: 8 },
  selectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  dialog: { alignSelf: 'center', width: '92%', maxWidth: 420 },
  dialogActions: { paddingHorizontal: 16 },
  moveDialogMsg: { lineHeight: 20, marginBottom: 12 },
  input: { marginBottom: 10 },
  modalSectionLabel: { marginTop: 12, marginBottom: 6 },
  modalPresetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  modalPresetChip: { marginBottom: 8 },
});
