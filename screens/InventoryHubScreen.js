import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  Image,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Chip, IconButton, Searchbar, Text, useTheme, Button, Dialog, Portal, TextInput } from 'react-native-paper';
import { AppConfirmDialog } from '@/components/AppConfirmDialog';
import { VerifyPinModal } from '@/components/VerifyPinModal';
import { EmptyState } from '@/components/EmptyState';
import { InventoryHubGridSkeleton } from '@/components/Skeleton';
import { InventoryProductEditorModal } from '@/components/InventoryProductEditorModal';
import { INVENTORY_CATEGORY_PRESET_KEYS } from '@/constants/inventoryCategories';
import {
  getCategoryStickerVisual,
  matchInventoryLabelToSticker,
} from '@/constants/inventoryCategoryStickers';
import { font } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { useToast } from '@/contexts/ToastContext';
import { useShopData } from '@/contexts/ShopDataContext';
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
import { categoryToSlug } from '@/utils/categoryRoute';
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

function hexToRgba(hex, a) {
  const raw = String(hex || '').replace('#', '').trim();
  const v =
    raw.length === 3
      ? raw.split('').map((c) => c + c).join('')
      : raw;
  const r = parseInt(v.slice(0, 2), 16);
  const g = parseInt(v.slice(2, 4), 16);
  const b = parseInt(v.slice(4, 6), 16);
  if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) {
    return `rgba(0,0,0,${a})`;
  }
  return `rgba(${r},${g},${b},${a})`;
}

function cardTint(cardKey) {
  // Match HTML examples: groceries -> green tint, snacks -> amber tint.
  if (String(cardKey).includes('inv_cat_groceries')) {
    return { kind: 'green', border: '#c3e8ce' };
  }
  if (String(cardKey).includes('inv_cat_snacks')) {
    return { kind: 'amber', border: '#fde68a' };
  }
  return { kind: 'none', border: '#dde8df' };
}

export function InventoryHubScreen() {
  const router = useRouter();
  const { t } = useLocale();
  const { showToast } = useToast();
  const { user, refreshPinState } = useAuth();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { inventory, refresh, loading, error } = useShopData();
  const [refreshing, setRefreshing] = useState(false);
  const [q, setQ] = useState('');
  const [hideEmptyTypes, setHideEmptyTypes] = useState(false);
  const scrollRef = useRef(null);
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
  const [presetsHubExpanded, setPresetsHubExpanded] = useState(true);
  const stickerEnrichTimerRef = useRef(null);

  const rows = useMemo(() => inventory || [], [inventory]);
  const nq = useMemo(() => normalize(q), [q]);

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

  const matchedProducts = useMemo(() => {
    if (!nq) return [];
    return rows
      .filter((it) => itemMatchesHubQuery(it))
      .sort((a, b) =>
        String(a.name || '').localeCompare(String(b.name || ''), 'en', {
          sensitivity: 'base',
        })
      );
  }, [rows, itemMatchesHubQuery, nq]);

  const productCountByCategoryNorm = useMemo(() => {
    const m = new Map();
    for (const it of rows) {
      const k = normalize(String(it.category || '').trim());
      m.set(k, (m.get(k) || 0) + 1);
    }
    return m;
  }, [rows]);

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

  const allCards = useMemo(() => {
    const list = [];

    const uncCount = rows.filter((it) => {
      const isUncat = !String(it.category || '').trim();
      if (!isUncat) return false;
      if (!nq) return true;
      if (normalize(t('inv_filterUncat')).includes(nq)) return true;
      return normalize(it.name).includes(nq);
    }).length;
    list.push({
      key: '_',
      slug: '_',
      title: t('inv_filterUncat'),
      count: uncCount,
    });

    const presetLabels = new Set(
      INVENTORY_CATEGORY_PRESET_KEYS.map((k) => normalize(t(k)))
    );

    for (const presetKey of INVENTORY_CATEGORY_PRESET_KEYS) {
      const label = t(presetKey);
      const count = rows.filter((it) => {
        if (!itemMatchesHubQuery(it)) return false;
        return normalize(it.category) === normalize(label);
      }).length;
      list.push({
        key: `p-${presetKey}`,
        slug: categoryToSlug(label, t),
        title: label,
        count,
      });
    }
    const customNames = new Set();
    for (const it of rows) {
      const c = String(it.category || '').trim();
      if (!c) continue;
      if (presetLabels.has(normalize(c))) continue;
      customNames.add(c);
    }
    const sortedCustom = Array.from(customNames).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' })
    );
    for (const c of sortedCustom) {
      const count = rows.filter((it) => {
        if (!itemMatchesHubQuery(it)) return false;
        return normalize(it.category) === normalize(c);
      }).length;
      list.push({
        key: `c-${c}`,
        slug: categoryToSlug(c, t),
        title: c,
        count,
      });
    }

    return list;
  }, [rows, t, nq, extraCategories]);

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

  const hasPresetTiles = useMemo(
    () => allCards.some((c) => String(c.key).startsWith('p-')),
    [allCards]
  );

  const displayCardsForGrid = useMemo(() => {
    if (!presetsHubExpanded) {
      return displayCards.filter((c) => !String(c.key).startsWith('p-'));
    }
    return displayCards;
  }, [displayCards, presetsHubExpanded]);

  const typesCountVisible = displayCardsForGrid.length;

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [initialName, setInitialName] = useState('');
  const [initialCategory, setInitialCategory] = useState('');
  const [initialUnitPriceStr, setInitialUnitPriceStr] = useState('');
  const [initialImageUri, setInitialImageUri] = useState(null);

  const scrollToCategoryGrid = useCallback(() => {
    const y = gridAnchorY.current;
    scrollRef.current?.scrollTo({
      y: Math.max(0, y - 12),
      animated: true,
    });
  }, []);

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
      const next = await getExtraInventoryCategories(user.ownerId);
      setExtraCategories(next);
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
      const slug = categoryToSlug(name, t);
      router.push(`/inventory/${encodeURIComponent(slug)}`);
    } catch {
      showToast({ type: 'error', message: t('common_error') });
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

  const colW = (Dimensions.get('window').width - PAD * 2 - GAP) / 2;

  const busy = Boolean(user?.ownerId) && loading;

  return (
    <View style={{ flex: 1 }}>
    <ScrollView
      ref={scrollRef}
      stickyHeaderIndices={[1]}
      style={[styles.flex, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={[styles.pad, { paddingTop: Math.max(insets.top, 10) }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View>
        {error ? (
          <Text variant="bodySmall" style={styles.err}>
            {error?.message || t('common_error')}
          </Text>
        ) : null}

        <View
          style={[
            styles.topbar,
            {
              backgroundColor: theme.colors.surface,
              borderBottomColor: theme.colors.outlineVariant || theme.colors.outline,
            },
          ]}
        >
          <View style={{ width: 32, height: 32 }} />
          <Text style={[styles.pageTitle, { color: theme.colors.onSurface }]}>
            {t('tab_inventory')}
          </Text>
          <IconButton
            icon="plus"
            size={18}
            onPress={() => router.push('/inventory/_')}
            iconColor="#fff"
            containerColor="#2d8a4e"
            style={styles.plusBtn}
            accessibilityLabel={t('inv_hubPlusUncatA11y')}
          />
        </View>

        <InventoryProductEditorModal
          visible={editorOpen}
          onDismiss={closeEditor}
          editingId={editingId}
          initialName={initialName}
          initialCategory={initialCategory}
          initialUnitPriceStr={initialUnitPriceStr}
          initialImageUri={initialImageUri}
        />
      </View>

      <View
        style={[
          styles.stickySearchHost,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <View style={styles.searchWrap}>
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
            inputStyle={[styles.searchInput, { color: theme.colors.onSurface }]}
            elevation={0}
          />
          <Text
            variant="bodySmall"
            style={[styles.searchHint, { color: theme.colors.onSurfaceVariant }]}
          >
            {t('inv_hubSearchCategoryHint')}
          </Text>
        </View>
      </View>

      <View>
      <View
        style={[
          styles.statsStrip,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outlineVariant || theme.colors.outline,
          },
        ]}
      >
        <View style={styles.statsStripTopRow}>
          <View style={styles.statsStripText}>
            <Text
              variant="titleSmall"
              style={[styles.statsStripTitle, { color: theme.colors.onSurface }]}
              numberOfLines={2}
            >
              {t('inv_hubStatsTitle')}
            </Text>
            <Text
              variant="bodySmall"
              style={[styles.statsStripSub, { color: theme.colors.onSurfaceVariant }]}
              numberOfLines={2}
            >
              {t('inv_hubStatsSub')}
            </Text>
          </View>
          {user?.ownerId ? (
            <Button
              mode="text"
              compact
              icon="folder-plus-outline"
              onPress={() => {
                setNewCatName('');
                setNewCatOpen(true);
              }}
              style={styles.newCatInOverview}
              textColor="#2d8a4e"
            >
              {t('inv_newCategoryBtn')}
            </Button>
          ) : null}
        </View>
        <View style={styles.statsChips}>
          <Chip
            mode="flat"
            compact
            icon="package-variant"
            onPress={onProductChipPress}
            accessibilityRole="button"
            accessibilityHint={t('inv_hubChipProductsA11y')}
            style={[
              styles.statChip,
              {
                backgroundColor:
                  theme.colors.elevation?.level2 || theme.colors.surfaceVariant,
                borderColor: theme.colors.outlineVariant || theme.colors.outline,
              },
            ]}
            textStyle={[styles.statChipText, { color: theme.colors.onSurfaceVariant }]}
          >
            {t('inv_hubProductCount', { count: rows.length })}
          </Chip>
          <Chip
            mode="flat"
            compact
            icon="shape-outline"
            selected={hideEmptyTypes && !nq}
            onPress={onTypesChipPress}
            accessibilityRole="button"
            accessibilityHint={t('inv_hubChipTypesA11y')}
            style={[
              styles.statChip,
              {
                backgroundColor:
                  hideEmptyTypes && !nq
                    ? '#e8f5ed'
                    : theme.colors.elevation?.level2 || theme.colors.surfaceVariant,
                borderColor:
                  hideEmptyTypes && !nq
                    ? '#2d8a4e'
                    : theme.colors.outlineVariant || theme.colors.outline,
              },
            ]}
            textStyle={[styles.statChipText, { color: theme.colors.onSurfaceVariant }]}
          >
            {t('inv_hubTypesCount', { count: typesCountVisible })}
          </Chip>
        </View>
      </View>

      {user?.ownerId && hasPresetTiles ? (
        <Pressable
          onPress={() => setPresetsHubExpanded((v) => !v)}
          style={[
            styles.presetsToggle,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant || theme.colors.outline,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={
            presetsHubExpanded
              ? t('inv_hubPresetsToggleCollapse')
              : t('inv_hubPresetsToggleExpand')
          }
        >
          <Text style={[styles.presetsToggleLabel, { color: theme.colors.onSurface }]}>
            {t('inv_hubPresetsSection')}
          </Text>
          <MaterialCommunityIcons
            name={presetsHubExpanded ? 'chevron-up' : 'chevron-down'}
            size={22}
            color={theme.colors.onSurfaceVariant}
          />
        </Pressable>
      ) : null}

      <View
        onLayout={(e) => {
          gridAnchorY.current = e.nativeEvent.layout.y;
        }}
      >
      <Text style={[styles.hint, { color: theme.colors.onSurfaceVariant }]}>
        {t('inv_hubHintShort')}
      </Text>

      {busy && rows.length === 0 ? (
        <InventoryHubGridSkeleton colW={colW} gap={GAP} />
      ) : null}

      {!busy && rows.length === 0 && !nq ? (
        <EmptyState
          icon="shape-outline"
          title={t('inv_hubEmptyTitle')}
          subtitle={t('inv_hubEmptySubtitle')}
        />
      ) : !busy && rows.length > 0 && nq && displayCards.length === 0 ? (
        <EmptyState
          icon="magnify"
          title={t('inv_emptySearchTitle')}
          subtitle={t('inv_emptySearchSubtitle')}
        />
      ) : (
        <>
          {nq && matchedProducts.length > 0 ? (
            <View style={styles.searchResultsSection}>
              <Text style={[styles.searchResultsTitle, { color: theme.colors.onSurface }]}> 
                {t('inv_hubSearchResultsTitle')}
              </Text>
              {matchedProducts.map((item) => {
                const categoryLabel = String(item.category || '').trim() || t('inv_filterUncat');
                return (
                  <Pressable
                    key={item.id}
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
                      {item.imageUrl || item.imageLocalUri ? (
                        <View style={styles.productThumbWrap}>
                          <Image
                            source={{ uri: item.imageUrl || item.imageLocalUri }}
                            style={styles.productThumb}
                            resizeMode="cover"
                          />
                        </View>
                      ) : null}
                      <View style={styles.productResultText}>
                        <Text variant="titleMedium" style={[styles.productResultName, { color: theme.colors.onSurface }]}> 
                          {item.name}
                        </Text>
                        <Text variant="bodySmall" style={[styles.productResultMeta, { color: theme.colors.onSurfaceVariant }]}> 
                          {categoryLabel} · {hasPrice(item) ? formatPeso(item.unitPrice) : t('inv_noDefaultPrice')}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
          <View style={styles.grid}>
          {displayCardsForGrid.map((c) => (
            (() => {
              const stickerOverride =
                String(c.key).startsWith('c-') && stickerOverrides[normalize(c.title)]
                  ? stickerOverrides[normalize(c.title)]
                  : null;
              const visual = getCategoryStickerVisual(
                c.key,
                c.title,
                stickerOverride
              );
              const tint = cardTint(c.key);
              const hasItems = c.count > 0;
              const affectedCount =
                productCountByCategoryNorm.get(normalize(c.title)) || 0;
              const isRemovableCategory =
                Boolean(user?.ownerId) &&
                c.key !== '_' &&
                (String(c.key).startsWith('c-') ||
                  (String(c.key).startsWith('p-') && affectedCount > 0));
              const isGreen = tint.kind === 'green';
              const isAmber = tint.kind === 'amber';
              const countColor = hasItems
                ? isAmber
                  ? '#f59e0b'
                  : '#2d8a4e'
                : '#9ab09e';
              const iconWrapBg = hasItems
                ? hexToRgba(isAmber ? '#f59e0b' : '#2d8a4e', 0.12)
                : hexToRgba(visual.bg, 0.18);

              const cardBgStyle = hasItems
                ? isGreen
                  ? styles.cardBgGreen
                  : isAmber
                    ? styles.cardBgAmber
                    : styles.cardBgGreen
                : null;

              const borderColor = hasItems ? tint.border : '#dde8df';
              const borderWidth = hasItems ? 1.5 : 1;

              return (
            <Pressable
              key={c.key}
              onPress={() =>
                router.push(`/inventory/${encodeURIComponent(c.slug)}`)
              }
              style={[styles.cell, { width: colW }]}
            >
              <View
                style={[
                  styles.card,
                  {
                    borderColor,
                    borderWidth,
                  },
                ]}
              >
                {isRemovableCategory ? (
                  <IconButton
                    icon="trash-can-outline"
                    size={18}
                    style={styles.cardRemoveBtn}
                    iconColor="#9ab09e"
                    accessibilityLabel={t('inv_removeCategoryA11y', {
                      name: c.title,
                    })}
                    onPress={() => {
                      setRemoveCategoryTarget({
                        title: c.title,
                        key: c.key,
                        productCount: affectedCount,
                      });
                      setRemoveCategoryOpen(true);
                    }}
                  />
                ) : null}
                {cardBgStyle ? (
                  <LinearGradient
                    colors={cardBgStyle.colors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFillObject}
                  />
                ) : null}
                <View style={styles.cardInner}>
                  <View style={[styles.iconWrap, { backgroundColor: iconWrapBg }]}>
                    <MaterialCommunityIcons
                      name={visual.icon}
                      size={22}
                      color={hasItems ? (isAmber ? '#f59e0b' : '#2d8a4e') : '#5a7060'}
                    />
                  </View>
                  <View style={styles.cardDetails}>
                    <Text variant="titleMedium" style={styles.cardTitle} numberOfLines={2}>
                      {c.title}
                    </Text>
                    <Text style={[styles.cardCount, { color: countColor }]}>
                      {c.count}
                    </Text>
                    <Text variant="bodySmall" style={styles.cardSub}>
                      {t('inv_hubProductCount', { count: c.count })}
                    </Text>
                  </View>
                </View>
              </View>
            </Pressable>
              );
            })()
          ))}
        </View>
        </>
      )}
      </View>
      </View>
    </ScrollView>
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
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#f0f4f1' },
  pad: { paddingHorizontal: PAD, paddingBottom: 32 },
  topbar: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#dde8df',
    paddingHorizontal: 0,
    paddingTop: 8,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: -PAD,
    paddingLeft: PAD,
    paddingRight: PAD,
    marginBottom: 0,
  },
  pageTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: font.extraBold,
    fontSize: 18,
    color: '#1a2e1f',
    letterSpacing: -0.3,
  },
  plusBtn: {
    margin: 0,
    borderRadius: 8,
    width: 32,
    height: 32,
  },
  searchWrap: { paddingTop: 14 },
  /** Sticky slot: no border/shadow — avoids a “double frame” around Searchbar + hint. */
  stickySearchHost: {
    zIndex: 4,
    paddingBottom: 2,
  },
  searchHint: { fontSize: 11, marginTop: 6, lineHeight: 15, fontFamily: font.medium },
  presetsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  presetsToggleLabel: { fontFamily: font.semiBold, fontSize: 13 },
  statsStrip: {
    flexDirection: 'column',
    gap: 12,
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  statsStripTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  statsStripText: { flex: 1, minWidth: 0, paddingRight: 4 },
  statsStripTitle: { fontFamily: font.extraBold, fontSize: 15, letterSpacing: -0.2 },
  statsStripSub: { fontFamily: font.medium, fontSize: 11, marginTop: 4, lineHeight: 15 },
  newCatInOverview: {
    margin: 0,
    flexShrink: 0,
  },
  statsChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
    width: '100%',
  },
  statChip: {
    borderWidth: 1,
    borderRadius: 10,
    height: 32,
  },
  statChipText: { fontFamily: font.semiBold, fontSize: 12, marginVertical: 0 },
  search: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#dde8df',
    borderRadius: 10,
  },
  searchInput: { fontFamily: font.medium, fontSize: 14, color: '#1a2e1f' },
  hint: { paddingTop: 10, paddingBottom: 4, fontSize: 12, color: '#9ab09e' },
  newCatDialog: {
    borderRadius: 16,
    borderWidth: 1,
    alignSelf: 'center',
    width: '92%',
    maxWidth: 400,
  },
  err: { color: '#C62828', marginBottom: 12 },
  center: { textAlign: 'center', padding: 24 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingTop: 10,
  },
  cell: {},
  card: {
    borderRadius: 16,
    minHeight: 168,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    position: 'relative',
  },
  cardRemoveBtn: {
    position: 'absolute',
    top: 0,
    right: 0,
    margin: 0,
    zIndex: 2,
  },
  cardInner: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 14,
    overflow: 'visible',
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  cardDetails: {
    width: '100%',
    alignItems: 'center',
  },
  cardTitle: { fontFamily: font.extraBold, textAlign: 'center', fontSize: 13, color: '#1a2e1f' },
  cardCount: { fontFamily: font.extraBold, marginTop: 6, fontSize: 28, lineHeight: 28 },
  cardSub: { marginTop: 2, color: '#9ab09e', textAlign: 'center' },
  searchResultsSection: { marginBottom: 16 },
  searchResultsTitle: { fontFamily: font.extraBold, fontSize: 15, marginBottom: 10 },
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

  cardBgGreen: { colors: ['#e8f5ed', '#f0faf3'] },
  cardBgAmber: { colors: ['#fef3e2', '#fff8ed'] },
});
