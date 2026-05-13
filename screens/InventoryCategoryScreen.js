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
import { Button, Card, FAB, Text } from 'react-native-paper';
import { AppConfirmDialog } from '@/components/AppConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { InventoryProductEditorModal } from '@/components/InventoryProductEditorModal';
import { InventoryProductListSkeleton } from '@/components/Skeleton';
import { VerifyPinModal } from '@/components/VerifyPinModal';
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

const TAB_BAR_CLEARANCE = 56;

function hasPrice(it) {
  return it.unitPrice != null && Number.isFinite(Number(it.unitPrice));
}

export function InventoryCategoryScreen() {
  const { slug: slugParam } = useLocalSearchParams();
  const navigation = useNavigation();
  const { t } = useLocale();
  const { user } = useAuth();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const { inventory, refresh, loading, error } = useShopData();
  const [refreshing, setRefreshing] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [initialName, setInitialName] = useState('');
  const [initialCategory, setInitialCategory] = useState('');
  const [initialUnitPriceStr, setInitialUnitPriceStr] = useState('');
  const [initialImageUri, setInitialImageUri] = useState(null);
  const [bulkUncatConfirmOpen, setBulkUncatConfirmOpen] = useState(false);
  const [bulkUncatPinOpen, setBulkUncatPinOpen] = useState(false);
  const [bulkUncatBusy, setBulkUncatBusy] = useState(false);
  const pendingBulkUncatSnapshotRef = useRef([]);

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

  const filtered = useMemo(() => {
    const list = rows.filter((it) => itemMatchesCategorySlug(it, slug, t));
    return [...list].sort((a, b) =>
      String(a.name || '').localeCompare(String(b.name || ''), 'en', {
        sensitivity: 'base',
      })
    );
  }, [rows, slug, t]);

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
        pendingBulkUncatSnapshotRef.current = [];
      }
    },
    [user?.ownerId, t, showToast, refresh]
  );

  const openBulkUncatFlow = useCallback(() => {
    pendingBulkUncatSnapshotRef.current = filtered.map((it) => ({
      id: it.id,
      name: it.name,
      category: String(it.category || '').trim(),
      unitPrice: it.unitPrice,
    }));
    setBulkUncatConfirmOpen(true);
  }, [filtered]);

  useLayoutEffect(() => {
    const showBulk =
      Boolean(user?.ownerId) && Boolean(categoryStored.trim()) && filtered.length > 0;
    navigation.setOptions({
      title: headerTitle,
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
  ]);

  const fabBottom = insets.bottom + TAB_BAR_CLEARANCE;

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

  const bulkSnapshot = pendingBulkUncatSnapshotRef.current;
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
              <Text variant="bodySmall" style={styles.hint}>
                {t('inv_catScreenHint')}
              </Text>
            </View>
          }
          contentContainerStyle={[
            styles.content,
            { paddingBottom: fabBottom + 72 },
          ]}
          ListEmptyComponent={listEmpty}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => openEdit(item)}
              style={styles.cardPress}
              accessibilityRole="button"
              accessibilityLabel={t('inv_editA11y')}
            >
              <Card mode="elevated" style={styles.card}>
                <Card.Content style={styles.cardContent}>
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
                  {item.imageUrl || item.imageLocalUri ? (
                    <View style={styles.stickerWrap}>
                      <Image
                        source={{ uri: item.imageUrl || item.imageLocalUri }}
                        style={styles.stickerImg}
                        resizeMode="cover"
                      />
                    </View>
                  ) : null}
                </Card.Content>
              </Card>
            </Pressable>
          )}
        />
        <FAB
          icon="plus"
          style={[styles.fab, { bottom: fabBottom }]}
          onPress={openCreate}
          label={t('inv_add')}
        />

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
        confirmDisabled={bulkUncatBusy}
        onCancel={() => {
          if (!bulkUncatBusy) {
            setBulkUncatConfirmOpen(false);
            pendingBulkUncatSnapshotRef.current = [];
          }
        }}
        onConfirm={() => {
          setBulkUncatConfirmOpen(false);
          void (async () => {
            const snap = pendingBulkUncatSnapshotRef.current;
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
          pendingBulkUncatSnapshotRef.current = [];
        }}
        title={t('inv_bulkUncatPinTitle')}
        message={t('inv_bulkUncatPinMsg')}
        cancelText={t('common_cancel')}
        confirmText={t('inv_bulkUncatPinConfirm')}
        onConfirmed={async () => {
          setBulkUncatPinOpen(false);
          const snap = pendingBulkUncatSnapshotRef.current;
          if (snap?.length) await runBulkUncat(snap);
          else pendingBulkUncatSnapshotRef.current = [];
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
  hint: {
    opacity: 0.75,
    marginBottom: 8,
    lineHeight: 20,
  },
  errBanner: { color: '#C62828', marginBottom: 8 },
  content: { flexGrow: 1 },
  centerPad: { textAlign: 'center', padding: 24 },
  emptyWrap: { flex: 1, justifyContent: 'center', minHeight: 280 },
  cardPress: { paddingHorizontal: 16, marginBottom: 10 },
  card: { borderRadius: 14 },
  cardContent: { flexDirection: 'row', alignItems: 'center' },
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
  fab: { position: 'absolute', right: 16 },
});
