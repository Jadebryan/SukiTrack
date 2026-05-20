import { useLocalSearchParams, useNavigation } from 'expo-router';
import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card, Chip, Dialog, FAB, IconButton, Portal, Searchbar, Text, TextInput, useTheme } from 'react-native-paper';
import { AppConfirmDialog } from '@/components/AppConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { InventoryProductEditorModal } from '@/components/InventoryProductEditorModal';
import ProductImage from '@/components/ProductImage';
import { InventoryProductListSkeleton } from '@/components/Skeleton';
import { VerifyPinModal } from '@/components/VerifyPinModal';
import { getTabBarOuterHeight } from '@/constants/tabBar';
import { INVENTORY_CATEGORY_PRESET_KEYS } from '@/constants/inventoryCategories';
import { font } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { useToast } from '@/contexts/ToastContext';
import { useShopData } from '@/contexts/ShopDataContext';
import { isOnline } from '@/services/networkStatus';
import * as pinService from '@/services/pinService';
import { updateInventoryItem } from '@/services/inventoryService';
import { formatPeso } from '@/utils/currency';
import { itemMatchesCategorySlug, slugToCategory } from '@/utils/categoryRoute';

function normalize(s) {
  return String(s || '').toLowerCase().trim();
}

function hasPrice(it) {
  return it.unitPrice != null && Number.isFinite(Number(it.unitPrice));
}

export function InventoryCategoryScreen() {
  const { slug: slugParam } = useLocalSearchParams();
  const navigation = useNavigation();
  const { t } = useLocale();
  const { user } = useAuth();
  const { showToast } = useToast();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { inventory, refresh, loading, error } = useShopData();
  const [refreshing, setRefreshing] = useState(false);
  const [q, setQ] = useState('');
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
  const nq = useMemo(() => normalize(q), [q]);

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

  useLayoutEffect(() => {
    const showBulk =
      Boolean(user?.ownerId) && Boolean(categoryStored.trim()) && filtered.length > 0;
    navigation.setOptions({
      headerTitle: () => (
        <View style={{ alignItems: 'center', justifyContent: 'center', maxWidth: 260 }}>
          <Text
            style={{
              fontFamily: font.extraBold,
              fontSize: 17,
              color: theme.colors.onSurface,
            }}
            numberOfLines={1}
          >
            {headerTitle}
          </Text>
          <Text
            variant="labelSmall"
            style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}
            numberOfLines={1}
          >
            {t('tab_inventory')} · {headerTitle}
          </Text>
        </View>
      ),
      headerRight: showBulk
        ? () => (
            <Button
              mode="text"
              compact
              disabled={bulkUncatBusy}
              onPress={openBulkUncatFlow}
              style={{ marginRight: 4 }}
              accessibilityLabel={t('inv_bulkUncatHeader')}
            >
              {t('inv_bulkUncatHeader')}
            </Button>
          )
        : undefined,
    });
  }, [
    navigation,
    headerTitle,
    categoryStored,
    filtered.length,
    user?.ownerId,
    bulkUncatBusy,
    t,
    openBulkUncatFlow,
    theme.colors.onSurface,
    theme.colors.onSurfaceVariant,
  ]);

  const fabBottom = getTabBarOuterHeight(insets.bottom) + 12;

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      await new Promise((r) => setTimeout(r, 250));
      setRefreshing(false);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setInitialName('');
    setInitialCategory('');
    setInitialUnitPriceStr('');
    setInitialImageUri(null);
    setEditorOpen(true);
  };

  const openEdit = (item) => {
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
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingId(null);
  };

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

  return (
    <>
      <KeyboardAvoidingView
        style={styles.flex}
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
            <View style={styles.header}>
              {error ? (
                <Text variant="bodySmall" style={styles.errBanner}>
                  {error?.message || t('common_error')}
                </Text>
              ) : null}
              <Searchbar
                placeholder={t('inv_searchPlaceholder')}
                value={q}
                onChangeText={setQ}
                style={[
                  styles.search,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.outlineVariant || theme.colors.outline,
                  },
                ]}
                inputStyle={{ color: theme.colors.onSurface }}
                elevation={0}
              />
              <Text variant="bodySmall" style={styles.hint}>
                {selectionMode
                  ? t('inv_catBulkSelectedHint', { count: selectedCount })
                  : t('inv_catScreenHint')}
              </Text>
              {!selectionMode && Boolean(categoryStored.trim()) && filtered.length > 0 ? (
                <Button
                  mode="outlined"
                  compact
                  onPress={openBulkSelectMode}
                  style={styles.bulkSelectBtn}
                >
                  {t('inv_bulkSelect')}
                </Button>
              ) : null}
            </View>
          }
          contentContainerStyle={[
            styles.content,
            { paddingBottom: fabBottom + 72 },
          ]}
          ListEmptyComponent={listEmpty}
          renderItem={({ item }) => {
            const selected = selectedIds.includes(item.id);
            return (
              <Pressable
                onPress={() => {
                  if (selectionMode) {
                    toggleRowSelection(item.id);
                    return;
                  }
                  openEdit(item);
                }}
                onLongPress={() => {
                  if (!selectionMode) {
                    setSelectionMode(true);
                    setSelectedIds([item.id]);
                  }
                }}
                style={[styles.cardPress, selected && styles.cardPressSelected]}
                accessibilityLabel={t('inv_editA11y')}
              >
                <Card mode="elevated" style={[styles.card, selected && styles.cardSelected]}>
                  <Card.Content
                    style={[
                      styles.cardContent,
                      selectionMode && styles.cardContentSelect,
                    ]}
                  >
                    {selectionMode ? (
                      <IconButton
                        icon={selected ? 'checkbox-marked' : 'checkbox-blank-outline'}
                        size={24}
                        onPress={() => toggleRowSelection(item.id)}
                        style={styles.selectionIcon}
                        containerColor="transparent"
                        iconColor={selected ? theme.colors.primary : theme.colors.onSurfaceVariant}
                        accessibilityLabel={
                          selected
                            ? t('common_deselect')
                            : t('common_select')
                        }
                      />
                    ) : null}
                    <View style={styles.cardMain}>
                      <Text variant="titleMedium" style={styles.rowName}>
                        {item.name}
                      </Text>
                      <Text variant="bodySmall" style={styles.rowSub}>
                        {hasPrice(item)
                          ? t('inv_defaultPrice', {
                              price: formatPeso(item.unitPrice),
                            })
                          : t('inv_noDefaultPrice')}
                      </Text>
                    </View>
                    <View style={styles.stickerWrap}>
                      <ProductImage uri={item.imageUrl || item.imageLocalUri} size={44} style={styles.stickerImg} />
                    </View>
                  </Card.Content>
                </Card>
              </Pressable>
            );
          }}
        />
        {selectionMode ? (
          <View
            style={[
              styles.bulkSelectionBar,
              {
                bottom: fabBottom,
                borderColor: theme.colors.outlineVariant,
                backgroundColor: theme.colors.surface,
              },
            ]}
          >
            <Text style={[styles.selectionLabel, { color: theme.colors.onSurface }]}> 
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
        ) : (
          <FAB
            icon="plus"
            style={[styles.fab, { bottom: fabBottom }]}
            onPress={openCreate}
            label={t('inv_add')}
          />
        )}

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
            <Button onPress={() => setMoveDialogOpen(false)}>
              {t('common_cancel')}
            </Button>
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
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  search: {
    marginBottom: 10,
    borderWidth: 1,
  },
  hint: {
    opacity: 0.75,
    marginBottom: 8,
    lineHeight: 20,
  },
  bulkHint: { opacity: 0.85, lineHeight: 18, marginBottom: 4 },
  errBanner: { color: '#C62828', marginBottom: 8 },
  content: { flexGrow: 1 },
  centerPad: { textAlign: 'center', padding: 24 },
  emptyWrap: { flex: 1, justifyContent: 'center', minHeight: 280 },
  cardPress: { paddingHorizontal: 16, marginBottom: 10 },
  cardPressSelected: { opacity: 0.95 },
  card: { borderRadius: 14 },
  cardContent: { flexDirection: 'row', alignItems: 'center' },
  cardContentSelect: { gap: 8 },
  cardMain: { flex: 1, minWidth: 0 },
  rowName: { fontFamily: font.extraBold },
  rowSub: { marginTop: 4, opacity: 0.75 },
  stickerWrap: {
    marginLeft: 12,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(45,138,78,0.25)',
    backgroundColor: '#f4f7f5',
  },
  stickerImg: { width: 52, height: 52 },
  bulkSelectBtn: { alignSelf: 'flex-start', marginTop: 8 },
  bulkSelectionBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderTopWidth: 1,
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
  selectionIcon: { margin: 0, marginRight: -4 },
  dialog: { alignSelf: 'center', width: '92%', maxWidth: 420 },
  dialogActions: { paddingHorizontal: 16 },
  moveDialogMsg: { lineHeight: 20, marginBottom: 12 },
  cardSelected: { borderColor: '#2d8a4e', borderWidth: 1 },
  input: { marginBottom: 10 },
  modalSectionLabel: { marginTop: 12, marginBottom: 6 },
  modalPresetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  modalPresetChip: { marginBottom: 8 },
  fab: { position: 'absolute', right: 16 },
});
