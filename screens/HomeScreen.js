import { useFocusEffect, useRouter } from 'expo-router';
import React, {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getTabBarOuterHeight } from '@/constants/tabBar';
import { Text } from 'react-native'; // Added Text import
import { IconButton } from 'react-native-paper'; // Added IconButton import
import { AddCustomerModal } from '@/components/AddCustomerModal';
import { AppConfirmDialog } from '@/components/AppConfirmDialog';
import { HomeNotificationDialog } from '@/components/HomeNotificationDialog';
import HomeCustomerRow from '@/components/HomeCustomerRow';
import { EmptyState } from '@/components/EmptyState';
import { CustomerListSkeleton, CustomerRowSkeleton } from '@/components/Skeleton';
import { OfflineBanner } from '@/components/OfflineBanner';
import { SpeedDialFab } from '@/components/SpeedDialFab';
import { HomeListHeader } from '@/components/home/HomeListHeader';
import { HomeSectionHeader } from '@/components/home/HomeSectionHeader';
import { getHomePalette } from '@/constants/homePalette';
import { font } from '@/constants/theme';
import { useAppTheme } from '@/contexts/AppThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { useToast } from '@/contexts/ToastContext';
import { useCustomers } from '@/hooks/useCustomers';
import { useSaveOperation } from '@/hooks/useSaveOperation';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { useOfflineStatus } from '@/hooks/useOfflineStatus';
import { buildCustomerListData } from '@/utils/buildCustomerListData';
import { deleteCustomer } from '@/services/customersService';
import {
  getAndClearPendingOpenAddCustomer,
  getBackupReminderDismissedAt,
  getLastExportAt,
  getNavTipsDismissed,
  getRecentCustomerIds,
  setBackupReminderDismissedNow,
  setNavTipsDismissed,
} from '@/services/preferencesService';
export function HomeScreen() {
  const router = useRouter();
  const { t } = useLocale();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { isDark } = useAppTheme();
  const homeColors = useMemo(() => getHomePalette(isDark), [isDark]);
  const { customers, loading, error, refresh, pendingOutboxCount } = useCustomers(
    user?.ownerId
  );
  const { showToast } = useToast();
  const backupNudgeShownRef = useRef(false);
  const [q, setQ] = useState('');
  const deferredQ = useDeferredValue(q);
  const [filterKey, setFilterKey] = useState('all'); // all | unpaid | paid | recent
  const [refreshing, setRefreshing] = useState(false);
  const [offlineBanner, setOfflineBanner] = useState(true);
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [speedDialOpen, setSpeedDialOpen] = useState(false);
  const [recentIds, setRecentIds] = useState([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const [bulkDeleteBusy, setBulkDeleteBusy] = useState(false);
  const pendingBulkSnapshotRef = useRef([]);
  const { save: runSave } = useSaveOperation();
  const [navTipsVisible, setNavTipsVisible] = useState(false);
  const isOffline = useOfflineStatus();
  const keyboardPad = useKeyboardHeight(true);
  const tabBarOuter = getTabBarOuterHeight(insets.bottom);

  const previousConnectionRef = useRef({
    isOffline,
    pendingOutboxCount,
  });

  useEffect(() => {
    const prev = previousConnectionRef.current;
    const becameOffline = prev.isOffline !== isOffline;
    const pendingChanged = prev.pendingOutboxCount !== pendingOutboxCount;
    previousConnectionRef.current = { isOffline, pendingOutboxCount };

    if (becameOffline) {
      showToast({
        type: isOffline ? 'warning' : 'info',
        message: isOffline ? t('toast_offlineLost') : t('toast_offlineRestored'),
        durationMs: 5000,
      });
    }

    if (!offlineBanner && (becameOffline || pendingChanged)) {
      setOfflineBanner(true);
    }
  }, [isOffline, pendingOutboxCount, offlineBanner, showToast, t]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const pending = await getAndClearPendingOpenAddCustomer();
        if (!cancelled && pending) setAddCustomerOpen(true);
        if (user?.ownerId) {
          const ids = await getRecentCustomerIds(user.ownerId);
          if (!cancelled) setRecentIds(ids);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [user?.ownerId])
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      if (await getNavTipsDismissed()) return;
      if (alive) setNavTipsVisible(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!user?.ownerId || backupNudgeShownRef.current) return undefined;
      let cancelled = false;
      (async () => {
        const [lastIso, dismissedAt] = await Promise.all([
          getLastExportAt(),
          getBackupReminderDismissedAt(),
        ]);
        if (cancelled) return;
        const now = Date.now();
        const fourteenDays = 14 * 24 * 60 * 60 * 1000;
        // only suppress the backup reminder for one day after user taps "Remind me later"
        const oneDay = 24 * 60 * 60 * 1000;
        if (dismissedAt && now - dismissedAt < oneDay) return;
        let stale = false;
        if (!lastIso || !String(lastIso).trim()) stale = true;
        else {
          const ts = new Date(lastIso).getTime();
          stale = !Number.isFinite(ts) || now - ts > fourteenDays;
        }
        if (!stale) return;
        backupNudgeShownRef.current = true;
        showToast({
          type: 'warning',
          message: t('home_backupNudgeMsg'),
          durationMs: 8000,
          actionLabel: t('home_backupNudgeLater'),
          onAction: async () => {
            await setBackupReminderDismissedNow();
          },
        });
      })();
      return () => {
        cancelled = true;
      };
    }, [user?.ownerId, showToast, t])
  );

  const todayLabel = useMemo(() => {
    try {
      return new Date().toLocaleDateString('en-PH', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return '';
    }
  }, []);

  const { totals, listData, outstandingCount } = useMemo(
    () =>
      buildCustomerListData({
        customers,
        loading,
        filterKey,
        query: deferredQ,
      }),
    [customers, loading, filterKey, deferredQ]
  );

  const hasQuery = useMemo(
    () => Boolean(String(deferredQ || '').toLowerCase().trim()),
    [deferredQ]
  );

  const recentCustomers = useMemo(() => {
    const byId = new Map(customers.map((c) => [c.id, c]));
    return recentIds.map((id) => byId.get(id)).filter(Boolean);
  }, [recentIds, customers]);

  const lastRecentCustomer = recentCustomers[0] || null;

  const speedDialActions = useMemo(() => {
    const items = [
      {
        key: 'customer',
        label: t('home_quickNewCustomer'),
        icon: 'account-plus-outline',
        onPress: () => setAddCustomerOpen(true),
      },
      {
        key: 'inventory',
        label: t('home_quickInventory'),
        icon: 'package-variant',
        onPress: () => router.push('/inventory'),
      },
      {
        key: 'reports',
        label: t('home_quickReports'),
        icon: 'chart-bar',
        onPress: () => router.push('/reports'),
      },
    ];
    if (lastRecentCustomer) {
      items.push({
        key: 'recent',
        label: t('home_quickLastCustomer', { name: lastRecentCustomer.name }),
        icon: 'account-arrow-right-outline',
        onPress: () => router.push(`/customer/${lastRecentCustomer.id}`),
      });
    }
    return items;
  }, [t, router, lastRecentCustomer]);

  const onCustomerPress = useCallback(
    (id) => {
      router.push(`/customer/${id}`);
    },
    [router]
  );

  const resetSelection = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds([]);
  }, []);

  const toggleRowSelection = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id];
      if (next.length === 0) setSelectionMode(false);
      return next;
    });
  }, []);

  const openBulkSelectMode = useCallback(() => {
    setSelectionMode(true);
    setSelectedIds([]);
  }, []);

  const openBulkDeleteSelectedFlow = useCallback(() => {
    pendingBulkSnapshotRef.current = customers.filter((c) => selectedIds.includes(c.id));
    setBulkDeleteConfirmOpen(true);
  }, [customers, selectedIds]);

  const runBulkDelete = useCallback(async (snapshot) => {
    if (!user?.ownerId || !snapshot?.length) return;
    setBulkDeleteBusy(true);
    try {
      if (runSave && typeof runSave === 'function') {
        await runSave({
          label: t('home_bulkDelete'),
          toastErrorMessage: t('common_error'),
          retryLabel: t('common_retry'),
          task: async () => {
            for (const c of snapshot) {
              // deleteCustomer handles offline/outbox
              // eslint-disable-next-line no-await-in-loop
              await deleteCustomer(user.ownerId, c.id);
            }
          },
        });
      } else {
        for (const c of snapshot) {
          // eslint-disable-next-line no-await-in-loop
          await deleteCustomer(user.ownerId, c.id);
        }
      }
      showToast({ type: 'success', message: t('home_bulkDeleteDone', { count: snapshot.length }) });
    } catch (err) {
      showToast({ type: 'error', message: t('common_error') });
    } finally {
      setBulkDeleteBusy(false);
      pendingBulkSnapshotRef.current = [];
      resetSelection();
      await refresh();
    }
  }, [user?.ownerId, runSave, t, showToast, resetSelection, refresh]);

  const keyExtractor = useCallback(
    (item, idx) => (item?.__kind ? `sec-${item.id}` : item?.id || String(idx)),
    []
  );

  const renderItem = useCallback(
    ({ item }) => {
      if (item?.__kind === 'skeleton') {
        return <CustomerRowSkeleton />;
      }
      if (item?.__kind === 'section') {
        const hide = item.id === 'out' && outstandingCount === 0;
        if (hide) return null;
        const title =
          item.id === 'out'
            ? t('home_sectionOutstanding').toUpperCase()
            : t('home_sectionAllCustomers').toUpperCase();
        const countLabel =
          item.id === 'out' && outstandingCount > 0
            ? t('home_sectionCustomerCount', { count: outstandingCount })
            : undefined;
        return (
          <HomeSectionHeader
            colors={homeColors}
            title={title}
            countLabel={countLabel}
          />
        );
      }
      return (
        <HomeCustomerRow
          customer={item}
          onCustomerPress={onCustomerPress}
          colors={homeColors}
          selectionMode={selectionMode}
          selected={selectedIds.includes(item.id)}
          onToggleSelect={toggleRowSelection}
          onLongPress={(id) => {
            if (!selectionMode) {
              setSelectionMode(true);
              setSelectedIds([id]);
            }
          }}
        />
      );
    },
    [
      t,
      outstandingCount,
      onCustomerPress,
      homeColors,
      selectionMode,
      selectedIds,
      toggleRowSelection,
    ]
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    await new Promise((r) => setTimeout(r, 300));
    setRefreshing(false);
  }, [refresh]);

  const listContentStyle = useMemo(
    () => ({
      paddingBottom: tabBarOuter + 72 + keyboardPad,
      backgroundColor: homeColors.bg,
    }),
    [tabBarOuter, keyboardPad, homeColors.bg]
  );

  const dismissNavTips = useCallback(async () => {
    await setNavTipsDismissed();
    setNavTipsVisible(false);
  }, []);

  const listEmptyComponent = useMemo(() => {
    if (loading && customers.length === 0) {
      return <CustomerListSkeleton rows={6} />;
    }
    if (customers.length === 0) {
      return (
        <EmptyState
          icon="account-group-outline"
          title={t('home_emptyTitle')}
          subtitle={t('home_emptySubtitle')}
          actionLabel={t('home_emptyAction')}
          onAction={() => setAddCustomerOpen(true)}
        />
      );
    }
    if (hasQuery) {
      return (
        <EmptyState
          icon="magnify"
          title={t('home_emptySearchTitle')}
          subtitle={t('home_emptySearchSubtitle')}
        />
      );
    }
    return (
      <EmptyState
        icon="filter-remove-outline"
        title={t('home_emptyFilterTitle')}
        subtitle={t('home_emptyFilterSubtitle')}
      />
    );
  }, [loading, customers.length, hasQuery, t]);

  const listHeaderComponent = useMemo(
    () => (
      <View style={{ paddingTop: Math.max(insets.top, 10) }}>
        <HomeListHeader
          colors={homeColors}
          t={t}
          appName={t('app_name')}
          todayLabel={todayLabel}
          totals={totals}
          q={q}
          onChangeQuery={setQ}
          filterKey={filterKey}
          onFilterChange={setFilterKey}
          onNotifPress={() => setNotifOpen(true)}
          onAddCustomerPress={() => setAddCustomerOpen(true)}
          recentCustomers={recentCustomers}
          onRecentPress={(id) => router.push(`/customer/${id}`)}
          navTipsVisible={navTipsVisible}
          onDismissNavTips={dismissNavTips}
          error={error}
          onRetry={refresh}
        />
      </View>
    ),
    [
      insets.top,
      homeColors,
      t,
      todayLabel,
      totals,
      q,
      filterKey,
      navTipsVisible,
      recentCustomers,
      error,
      refresh,
      router,
      dismissNavTips,
    ]
  );

  return (
    <View style={[styles.flex, { backgroundColor: homeColors.bg }]}>
      {(isOffline || pendingOutboxCount > 0) && offlineBanner ? (
        <OfflineBanner
          visible
          isOffline={isOffline}
          onDismiss={() => setOfflineBanner(false)}
          pendingCount={pendingOutboxCount}
        />
      ) : null}

      <FlatList
        data={listData}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={listHeaderComponent}
        ListEmptyComponent={listEmptyComponent}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        initialNumToRender={10}
        maxToRenderPerBatch={8}
        windowSize={9}
        removeClippedSubviews
        contentContainerStyle={listContentStyle}
      />

      <SpeedDialFab
        bottom={tabBarOuter + 14}
        open={speedDialOpen}
        onOpenChange={setSpeedDialOpen}
        actions={speedDialActions}
        accessibilityLabel={t('home_fabQuickA11y')}
        accessibilityLabelExpanded={t('home_fabQuickCloseA11y')}
      />

      {selectionMode ? (
        <View
          style={[
            styles.bulkSelectionBar,
            { bottom: tabBarOuter + 12, borderColor: homeColors.border, backgroundColor: homeColors.cardBg },
          ]}
        >
          <Text style={[styles.selectionLabel, { color: homeColors.text }]}> {t('home_sectionCustomerCount', { count: selectedIds.length })} </Text>
          <View style={styles.selectionActions}>
            <IconButton
              icon="trash-can"
              size={20}
              onPress={openBulkDeleteSelectedFlow}
              disabled={!selectedIds.length}
              accessibilityLabel={t('common_delete')}
              style={{ marginRight: 8 }}
            />
            <IconButton icon="close" size={20} onPress={resetSelection} accessibilityLabel={t('common_cancel')} />
          </View>
        </View>
      ) : null}

      <AppConfirmDialog
        visible={bulkDeleteConfirmOpen}
        title={t('home_bulkDelete')}
        message={t('home_bulkDeleteMsg', { count: selectedIds.length })}
        cancelText={t('common_cancel')}
        confirmText={t('common_delete')}
        destructive
        confirmLoading={bulkDeleteBusy}
        onCancel={() => setBulkDeleteConfirmOpen(false)}
        onConfirm={async () => {
          const snap = pendingBulkSnapshotRef.current;
          setBulkDeleteConfirmOpen(false);
          if (!snap?.length) return;
          await runBulkDelete(snap);
        }}
      />

      <AddCustomerModal
        visible={addCustomerOpen}
        onDismiss={() => setAddCustomerOpen(false)}
      />

      <HomeNotificationDialog
        visible={notifOpen}
        onDismiss={() => setNotifOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bulkSelectionBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectionLabel: { fontFamily: font.extraBold },
  selectionActions: { flexDirection: 'row', alignItems: 'center' },
});
