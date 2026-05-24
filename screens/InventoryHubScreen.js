import { useFocusEffect, useRouter } from 'expo-router';
import React, {
  useCallback,
  useDeferredValue,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Dimensions,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
  Image,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, useTheme, Button, Dialog, Portal, TextInput } from 'react-native-paper';
import { AppConfirmDialog } from '@/components/AppConfirmDialog';
import { VerifyPinModal } from '@/components/VerifyPinModal';
import { EmptyState } from '@/components/EmptyState';
import { InventoryHubListHeader } from '@/components/InventoryHubListHeader';
import { InventoryHubGridSkeleton } from '@/components/Skeleton';
import { InventoryProductEditorModal } from '@/components/InventoryProductEditorModal';
import InventoryCategoryCard from '@/components/InventoryCategoryCard';
import ProductImage from '@/components/ProductImage';
import { INVENTORY_CATEGORY_PRESET_KEYS } from '@/constants/inventoryCategories';
import { matchInventoryLabelToSticker } from '@/constants/inventoryCategoryStickers';
import { getInventoryHubPalette } from '@/constants/inventoryHubPalette';
import { font } from '@/constants/theme';
import { useAppTheme } from '@/contexts/AppThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { useToast } from '@/contexts/ToastContext';
import { useInventoryShopData } from '@/hooks/useShopInventory';
import { buildInventoryHubCards } from '@/utils/buildInventoryHubCards';
import {
  forgetNetworkStickerMissForLabel,
  suggestAndPersistCategorySticker,
} from '@/services/categoryStickerSuggestService';
import { updateInventoryItem } from '@/services/inventoryService';
import { isOnline } from '@/services/networkStatus';
import * as pinService from '@/services/pinService';
import {
  addExtraInventoryCategory,
  getCategoryStickerOverrides,
  getExtraInventoryCategories,
  removeCategoryStickerOverride,
  removeExtraInventoryCategory,
  setCategoryStickerOverride,
} from '@/services/preferencesService';
import { formatPeso } from '@/utils/currency';

const GAP = 12;
const PAD = 16;

function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .trim();
}

function hasPrice(it) {
  return it.unitPrice != null && Number.isFinite(Number(it.unitPrice));
}

export function InventoryHubScreen() {
  const router = useRouter();
  const { t } = useLocale();
  const { showToast } = useToast();
  const { user, refreshPinState } = useAuth();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { isDark } = useAppTheme();
  const hubColors = useMemo(() => getInventoryHubPalette(isDark), [isDark]);
  const { inventory, refresh, loading, error } = useInventoryShopData();
  const [refreshing, setRefreshing] = useState(false);
  const [q, setQ] = useState('');
  const deferredQ = useDeferredValue(q);
  const [hideEmptyTypes, setHideEmptyTypes] = useState(false);
  const flatListRef = useRef(null);
  const gridAnchorY = useRef(0);
  const [extraCategories, setExtraCategories] = useState([]);
  const [newCatOpen, setNewCatOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [savingCat, setSavingCat] = useState(false);
  const [removeCategoryOpen, setRemoveCategoryOpen] = useState(false);
  const [removeCategoryTarget, setRemoveCategoryTarget] = useState(null);
  const [removingCategory, setRemovingCategory] = useState(false);
  const [pinVerifyRemovalOpen, setPinVerifyRemovalOpen] = useState(false);
  const pendingRemovalAfterPin = useRef(null);
  const [stickerOverrides, setStickerOverrides] = useState({});
  const stickerEnrichTimerRef = useRef(null);

  const rows = useMemo(() => inventory || [], [inventory]);
  const nq = useMemo(() => normalize(deferredQ), [deferredQ]);

  const itemMatchesHubQuery = useCallback(
    (it) => {
      if (!nq) return true;
      return (
        normalize(it.name).includes(nq) ||
        normalize(String(it.category || '')).includes(nq)
      );
    },
    [nq]
  );

  const rowsMatchingQuery = useMemo(() => {
    if (!nq) return rows;
    return rows.filter((it) => itemMatchesHubQuery(it));
  }, [rows, itemMatchesHubQuery, nq]);

  const matchedProducts = useMemo(() => {
    if (!nq) return [];
    return [...rowsMatchingQuery].sort((a, b) =>
      String(a.name || '').localeCompare(String(b.name || ''), 'en', {
        sensitivity: 'base',
      })
    );
  }, [rowsMatchingQuery, nq]);

  const colW = (Dimensions.get('window').width - PAD * 2 - GAP) / 2;

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        if (!user?.ownerId) {
          if (alive) {
            setExtraCategories([]);
            setStickerOverrides({});
          }
          return;
        }
        void refreshPinState();
        const [list, stickers] = await Promise.all([
          getExtraInventoryCategories(user.ownerId),
          getCategoryStickerOverrides(user.ownerId),
        ]);
        if (!alive) return;
        setExtraCategories(list);
        setStickerOverrides(stickers);

        if (stickerEnrichTimerRef.current) {
          clearTimeout(stickerEnrichTimerRef.current);
          stickerEnrichTimerRef.current = null;
        }
        stickerEnrichTimerRef.current = setTimeout(() => {
          void (async () => {
            if (!alive) return;
            const presetLabels = new Set(
              INVENTORY_CATEGORY_PRESET_KEYS.map((k) => normalize(t(k)))
            );
            const customs = new Set();
            for (const it of rows) {
              const c = String(it.category || '').trim();
              if (c && !presetLabels.has(normalize(c))) customs.add(c);
            }
            for (const lab of list) {
              const c = String(lab || '').trim();
              if (c && !presetLabels.has(normalize(c))) customs.add(c);
            }

            let queued = 0;
            for (const lab of customs) {
              if (queued >= 6) break;
              const nk = normalize(lab);
              if (stickers[nk]?.icon) continue;
              if (matchInventoryLabelToSticker(lab)) continue;
              if (!(await isOnline())) break;
              queued += 1;
              void suggestAndPersistCategorySticker(user.ownerId, lab).then(
                (res) => {
                  if (!alive || !res?.visual) return;
                  setStickerOverrides((prev) => ({
                    ...prev,
                    [nk]: res.visual,
                  }));
                }
              );
            }
          })();
        }, 700);
      })();
      return () => {
        alive = false;
        if (stickerEnrichTimerRef.current) {
          clearTimeout(stickerEnrichTimerRef.current);
          stickerEnrichTimerRef.current = null;
        }
      };
    }, [user?.ownerId, rows, t, refreshPinState])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      await new Promise((r) => setTimeout(r, 250));
      setRefreshing(false);
    }
  };

  const allCards = useMemo(
    () =>
      buildInventoryHubCards({
        rows,
        rowsMatchingQuery,
        extraCategories,
        t,
        uncategorizedLabel: t('inv_filterUncat'),
      }),
    [rows, rowsMatchingQuery, extraCategories, t]
  );

  const displayCards = useMemo(() => {
    let cards = allCards;
    if (nq) {
      cards = allCards.filter((x) => {
        if (normalize(x.title).includes(nq)) return true;
        return x.count > 0;
      });
    }
    if (hideEmptyTypes && !nq) {
      cards = cards.filter((x) => x.count > 0);
    }
    return cards;
  }, [allCards, nq, hideEmptyTypes]);

  const onRemoveCategoryPress = useCallback((target) => {
    setRemoveCategoryTarget(target);
    setRemoveCategoryOpen(true);
  }, []);

  const renderCategoryCard = useCallback(
    ({ item: c }) => {
      const nk = normalize(c.title);
      const stickerOverride =
        String(c.key).startsWith('c-') && stickerOverrides[nk]
          ? stickerOverrides[nk]
          : null;
      return (
        <InventoryCategoryCard
          card={c}
          colW={colW}
          stickerOverride={stickerOverride}
          ownerId={user?.ownerId}
          onRemovePress={onRemoveCategoryPress}
          colors={hubColors}
        />
      );
    },
    [stickerOverrides, colW, user?.ownerId, onRemoveCategoryPress, hubColors]
  );

  const scrollToCategoryGrid = useCallback(() => {
    const y = gridAnchorY.current;
    flatListRef.current?.scrollToOffset({
      offset: Math.max(0, y - 12),
      animated: true,
    });
  }, []);

  const isSearchMode = Boolean(nq);

  const onProductChipPress = useCallback(() => {
    const hadSearch = Boolean(nq);
    if (hadSearch) setQ('');
    const delay = hadSearch ? 120 : 0;
    setTimeout(() => scrollToCategoryGrid(), delay);
  }, [nq, scrollToCategoryGrid]);

  const onTypesChipPress = useCallback(() => {
    let delay = 0;
    if (!nq) {
      setHideEmptyTypes((v) => !v);
      delay = 80;
    }
    setTimeout(() => scrollToCategoryGrid(), delay);
  }, [nq, scrollToCategoryGrid]);

  const busy = Boolean(user?.ownerId) && loading;
  const typesCountVisible = displayCards.length;
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [initialName, setInitialName] = useState('');
  const [initialCategory, setInitialCategory] = useState('');
  const [initialUnitPriceStr, setInitialUnitPriceStr] = useState('');
  const [initialImageUri, setInitialImageUri] = useState(null);

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

  const renderSearchResultItem = useCallback(
    ({ item }) => {
      const categoryLabel =
        String(item.category || '').trim() || t('inv_filterUncat');
      return (
        <Pressable
          onPress={() => openEdit(item)}
          style={[
            styles.productResultCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant || theme.colors.outline,
            },
          ]}
        >
          <View style={styles.productResultRow}>
            <View style={styles.productThumbWrap}>
              <ProductImage
                uri={item.imageUrl || item.imageLocalUri}
                size={56}
                style={styles.productThumb}
              />
            </View>
            <View style={styles.productResultText}>
              <Text
                variant="titleMedium"
                style={[styles.productResultName, { color: theme.colors.onSurface }]}
              >
                {item.name}
              </Text>
              <Text
                variant="bodySmall"
                style={[styles.productResultMeta, { color: theme.colors.onSurfaceVariant }]}
              >
                {categoryLabel} · {hasPrice(item) ? formatPeso(item.unitPrice) : t('inv_noDefaultPrice')}
              </Text>
            </View>
          </View>
        </Pressable>
      );
    },
    [openEdit, theme.colors.surface, theme.colors.outlineVariant, theme.colors.outline, theme.colors.onSurface, theme.colors.onSurfaceVariant, t]
  );

  const openNewCategory = useCallback(() => {
    setNewCatName('');
    setNewCatOpen(true);
  }, []);

  const onToggleFilter = useCallback(() => {
    if (nq) return;
    setHideEmptyTypes((v) => !v);
    setTimeout(() => scrollToCategoryGrid(), 80);
  }, [nq, scrollToCategoryGrid]);

  const listHeaderComponent = useMemo(
    () => (
      <View
        onLayout={(e) => {
          gridAnchorY.current = e.nativeEvent.layout.y;
        }}
      >
        <InventoryHubListHeader
          colors={hubColors}
          t={t}
          error={error}
          q={q}
          onChangeQuery={setQ}
          productCount={rows.length}
          typeCount={typesCountVisible}
          hideEmptyTypes={hideEmptyTypes}
          hasSearch={Boolean(nq)}
          onToggleFilter={onToggleFilter}
          onProductPillPress={onProductChipPress}
          onTypesPillPress={onTypesChipPress}
          onNewCategory={openNewCategory}
          onAddProduct={() => router.push('/inventory/_')}
          showNewCategory={Boolean(user?.ownerId)}
          showSearchResultsTitle={Boolean(nq && matchedProducts.length > 0)}
          showEmptyCatalog={!busy && rows.length === 0 && !nq}
          showEmptySearchTypes={!busy && rows.length > 0 && nq && displayCards.length === 0}
        />
      </View>
    ),
    [
      hubColors,
      t,
      error,
      q,
      rows.length,
      typesCountVisible,
      hideEmptyTypes,
      nq,
      onToggleFilter,
      onProductChipPress,
      onTypesChipPress,
      openNewCategory,
      router,
      user?.ownerId,
      matchedProducts.length,
      busy,
      displayCards.length,
    ]
  );
  const submitNewCategory = useCallback(async () => {
    const name = newCatName.trim().slice(0, 80);
    if (!name) {
      showToast({ type: 'error', message: t('inv_newCategoryErrEmpty') });
      return;
    }
    if (!user?.ownerId) return;
    if (
      INVENTORY_CATEGORY_PRESET_KEYS.some((k) => normalize(t(k)) === normalize(name))
    ) {
      showToast({ type: 'error', message: t('inv_newCategoryErrPreset') });
      return;
    }
    const dupInv = rows.some(
      (it) => normalize(String(it.category || '')) === normalize(name)
    );
    if (dupInv) {
      showToast({ type: 'error', message: t('inv_newCategoryErrDup') });
      return;
    }
    if (extraCategories.some((x) => normalize(x) === normalize(name))) {
      showToast({ type: 'error', message: t('inv_newCategoryErrDup') });
      return;
    }
    setSavingCat(true);
    let added = false;
    try {
      const r = await addExtraInventoryCategory(user.ownerId, name);
      if (!r.ok) {
        showToast({
          type: 'error',
          message:
            r.reason === 'dup' ? t('inv_newCategoryErrDup') : t('common_error'),
        });
        return;
      }
      added = true;
      setExtraCategories((prev) => [...prev, name]);
      forgetNetworkStickerMissForLabel(name);
      void suggestAndPersistCategorySticker(user.ownerId, name).then((res) => {
        if (res?.visual) {
          setStickerOverrides((prev) => ({
            ...prev,
            [normalize(name)]: res.visual,
          }));
        }
        if (res?.source === 'network' && res.visual) {
          showToast({
            type: 'info',
            message: t('inv_toastStickerNetwork', { name }),
          });
        } else if (res?.source === 'offline') {
          showToast({
            type: 'info',
            message: t('inv_toastStickerOffline'),
          });
        }
      });
      setNewCatOpen(false);
      setNewCatName('');
      showToast({ type: 'success', message: t('inv_newCategorySaved') });
      const slug = categoryToSlug(name, t);
      router.push(`/inventory/${encodeURIComponent(slug)}`);
    } catch {
      if (!added) {
        showToast({ type: 'error', message: t('common_error') });
      }
    } finally {
      setSavingCat(false);
    }
  }, [
    newCatName,
    user?.ownerId,
    rows,
    extraCategories,
    t,
    showToast,
    router,
  ]);

  const performCategoryRemoval = useCallback(
    async (target) => {
      if (!target?.title || !user?.ownerId) return;
      const { title } = target;
      const titleNorm = normalize(title);
      const extraWasPresent = extraCategories.some(
        (x) => normalize(x) === titleNorm
      );
      const stickerSnap = stickerOverrides[titleNorm]
        ? { ...stickerOverrides[titleNorm] }
        : null;

      const matching = rows.filter(
        (it) => normalize(String(it.category || '').trim()) === titleNorm
      );
      const snapshot = {
        title,
        products: matching.map((it) => ({
          id: it.id,
          name: it.name,
          category: String(it.category || '').trim(),
          unitPrice: it.unitPrice,
        })),
        extraWasPresent,
        sticker: stickerSnap,
      };

      setRemovingCategory(true);
      const doneIds = [];
      try {
        for (const it of matching) {
          await updateInventoryItem(it.id, {
            name: it.name,
            category: '',
            unitPrice: it.unitPrice,
          });
          doneIds.push(it.id);
        }
        await removeExtraInventoryCategory(user.ownerId, title);
        await removeCategoryStickerOverride(user.ownerId, title);
        const next = await getExtraInventoryCategories(user.ownerId);
        setExtraCategories(next);
        setStickerOverrides((prev) => {
          const copy = { ...prev };
          delete copy[titleNorm];
          return copy;
        });
        await refresh();
        setRemoveCategoryOpen(false);
        setRemoveCategoryTarget(null);
        showToast({
          type: 'success',
          message: t('inv_removeCategoryToast'),
          durationMs: 12_000,
          actionLabel: t('common_undo'),
          onAction: async () => {
            try {
              for (const p of snapshot.products) {
                await updateInventoryItem(p.id, {
                  name: p.name,
                  category: p.category,
                  unitPrice: p.unitPrice,
                });
              }
              if (snapshot.extraWasPresent) {
                await addExtraInventoryCategory(user.ownerId, snapshot.title);
              }
              if (snapshot.sticker) {
                await setCategoryStickerOverride(
                  user.ownerId,
                  snapshot.title,
                  snapshot.sticker
                );
              }
              const nextE = await getExtraInventoryCategories(user.ownerId);
              setExtraCategories(nextE);
              const stickers = await getCategoryStickerOverrides(user.ownerId);
              setStickerOverrides(stickers);
              await refresh();
              showToast({
                type: 'success',
                message: t('inv_removeCategoryUndoDone'),
              });
            } catch {
              showToast({
                type: 'error',
                message: t('inv_removeCategoryUndoFail'),
              });
            }
          },
        });
      } catch {
        for (const id of [...doneIds].reverse()) {
          const orig = snapshot.products.find((p) => p.id === id);
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
        showToast({
          type: 'error',
          message: t('inv_removeCategoryRollbackFail'),
        });
      } finally {
        setRemovingCategory(false);
      }
    },
    [
      user?.ownerId,
      rows,
      extraCategories,
      stickerOverrides,
      t,
      showToast,
      refresh,
    ]
  );

  const onConfirmRemoveCategoryDialog = useCallback(async () => {
    const target = removeCategoryTarget;
    if (!target) return;
    const pinRequired = await pinService.hasPin();
    if (pinRequired) {
      pendingRemovalAfterPin.current = target;
      setRemoveCategoryOpen(false);
      setRemoveCategoryTarget(null);
      setPinVerifyRemovalOpen(true);
      return;
    }
    void performCategoryRemoval(target);
  }, [removeCategoryTarget, performCategoryRemoval]);

  return (
    <>
      <View style={{ flex: 1 }}>
        <InventoryProductEditorModal
          visible={editorOpen}
          onDismiss={closeEditor}
          editingId={editingId}
          initialName={initialName}
          initialCategory={initialCategory}
          initialUnitPriceStr={initialUnitPriceStr}
          initialImageUri={initialImageUri}
        />

      <FlatList
        key={isSearchMode ? 'search-mode' : 'grid-mode'}
        ref={flatListRef}
        style={[styles.flex, { backgroundColor: hubColors.bg }]}
        contentContainerStyle={{
          paddingHorizontal: PAD,
          paddingTop: Math.max(insets.top, 10),
          paddingBottom: 32,
        }}
        data={isSearchMode ? matchedProducts : displayCards}
        renderItem={isSearchMode ? renderSearchResultItem : renderCategoryCard}
        keyExtractor={(item) =>
          isSearchMode ? String(item.id || '') : item.key
        }
        numColumns={isSearchMode ? 1 : 2}
        columnWrapperStyle={
          isSearchMode
            ? undefined
            : {
                justifyContent: 'space-between',
                marginBottom: GAP,
              }
        }
        ListHeaderComponent={listHeaderComponent}
        refreshing={refreshing}
        onRefresh={onRefresh}
        keyboardShouldPersistTaps='handled'
        initialNumToRender={isSearchMode ? 8 : 6}
        maxToRenderPerBatch={isSearchMode ? 10 : 8}
        windowSize={isSearchMode ? 12 : 10}
        ListEmptyComponent={
          busy && rows.length === 0 ? (
            <InventoryHubGridSkeleton colW={colW} gap={GAP} />
          ) : isSearchMode && matchedProducts.length === 0 ? (
            <EmptyState
              icon="magnify"
              title={t('inv_emptySearchTitle')}
              subtitle={t('inv_emptySearchSubtitle')}
            />
          ) : null
        }
      />
    </View>
    <Portal>
      <Dialog
        visible={newCatOpen}
        onDismiss={() => {
          if (!savingCat) {
            setNewCatOpen(false);
            setNewCatName('');
          }
        }}
        style={[
          styles.newCatDialog,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outlineVariant || theme.colors.outline,
          },
        ]}
      >
        <Dialog.Title style={{ fontFamily: font.extraBold }}>
          {t('inv_newCategoryTitle')}
        </Dialog.Title>
        <Dialog.Content>
          <Text variant="bodySmall" style={{ marginBottom: 12, opacity: 0.85 }}>
            {t('inv_newCategoryDesc')}
          </Text>
          <Text
            variant="bodySmall"
            style={{ marginBottom: 12, opacity: 0.72, lineHeight: 18 }}
          >
            {t('inv_newCategoryDatamuseNote')}
          </Text>
          <TextInput
            mode="outlined"
            label={t('inv_newCategoryField')}
            placeholder={t('inv_newCategoryPlaceholder')}
            value={newCatName}
            onChangeText={setNewCatName}
            maxLength={80}
            autoFocus
            disabled={savingCat}
          />
        </Dialog.Content>
        <Dialog.Actions style={{ paddingHorizontal: 12, paddingBottom: 10 }}>
          <Button
            onPress={() => {
              if (savingCat) return;
              setNewCatOpen(false);
              setNewCatName('');
            }}
          >
            {t('common_cancel')}
          </Button>
          <Button
            mode="contained"
            loading={savingCat}
            disabled={savingCat}
            onPress={() => void submitNewCategory()}
            buttonColor="#2d8a4e"
          >
            {t('inv_newCategorySave')}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
    <AppConfirmDialog
      visible={removeCategoryOpen}
      title={t('inv_removeCategoryTitle')}
      message={
        (removeCategoryTarget?.productCount || 0) > 0
          ? t('inv_removeCategoryMsgProducts', {
              name: removeCategoryTarget?.title || '',
              count: removeCategoryTarget?.productCount || 0,
            })
          : t('inv_removeCategoryMsgEmpty', {
              name: removeCategoryTarget?.title || '',
            })
      }
      confirmText={t('inv_removeCategoryConfirm')}
      cancelText={t('common_cancel')}
      destructive
      confirmDisabled={removingCategory}
      confirmLoading={removingCategory}
      onConfirm={() => void onConfirmRemoveCategoryDialog()}
      onCancel={() => {
        if (!removingCategory) {
          setRemoveCategoryOpen(false);
          setRemoveCategoryTarget(null);
        }
      }}
    />
    <VerifyPinModal
      visible={pinVerifyRemovalOpen}
      onDismiss={() => {
        setPinVerifyRemovalOpen(false);
        pendingRemovalAfterPin.current = null;
      }}
      title={t('inv_removeCategoryPinTitle')}
      message={t('inv_removeCategoryPinMsg')}
      cancelText={t('common_cancel')}
      confirmText={t('inv_removeCategoryPinConfirm')}
      onConfirmed={async () => {
        const pending = pendingRemovalAfterPin.current;
        pendingRemovalAfterPin.current = null;
        if (pending) await performCategoryRemoval(pending);
      }}
    />
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  newCatDialog: {
    borderRadius: 16,
    borderWidth: 1,
    alignSelf: 'center',
    width: '92%',
    maxWidth: 400,
  },
  err: { color: '#C62828', marginBottom: 4 },
  searchResultsSection: { marginBottom: 8 },
  productResultCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  productResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  productResultText: { flex: 1, minWidth: 0 },
  productResultName: { fontFamily: font.extraBold, fontSize: 15 },
  productResultMeta: { fontFamily: font.medium, lineHeight: 18, marginTop: 3 },
  productThumbWrap: {
    width: 56,
    height: 56,
    borderRadius: 10,
    overflow: 'hidden',
    marginRight: 10,
  },
  productThumb: { width: 56, height: 56 },
});
