import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Card,
  Chip,
  Dialog,
  Divider,
  FAB,
  IconButton,
  Portal,
  Searchbar,
  Text,
  Button,
  useTheme,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getTabBarOuterHeight } from '@/constants/tabBar';
import { AddCustomerModal } from '@/components/AddCustomerModal';
import { CustomerCard } from '@/components/CustomerCard';
import { EmptyState } from '@/components/EmptyState';
import { CustomerListSkeleton, CustomerRowSkeleton } from '@/components/Skeleton';
import { OfflineBanner } from '@/components/OfflineBanner';
import { font } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { useToast } from '@/contexts/ToastContext';
import { useCustomers } from '@/hooks/useCustomers';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { useOfflineStatus } from '@/hooks/useOfflineStatus';
import { useAllPages } from '@/hooks/useTransactions';
import {
  getAndClearPendingOpenAddCustomer,
  getBackupReminderDismissedAt,
  getLastExportAt,
  getNavTipsDismissed,
  getRecentCustomerIds,
  setBackupReminderDismissedNow,
  setNavTipsDismissed,
} from '@/services/preferencesService';
import { formatPeso } from '@/utils/currency';
import { formatDateTime } from '@/utils/date';

function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .trim();
}

function compareCustomers(a, b, sortKey) {
  if (sortKey === 'balance') {
    const diff = (Number(b.balance) || 0) - (Number(a.balance) || 0);
    if (diff !== 0) return diff;
  }
  if (sortKey === 'recent') {
    const ta = new Date(a.lastTransactionAt || 0).getTime();
    const tb = new Date(b.lastTransactionAt || 0).getTime();
    if (tb !== ta) return tb - ta;
  }
  return String(a.name || '').localeCompare(String(b.name || ''), 'en', {
    sensitivity: 'base',
  });
}

export function HomeScreen() {
  const router = useRouter();
  const { t } = useLocale();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { customers, loading, error, refresh, pendingOutboxCount } = useCustomers(
    user?.ownerId
  );
  const { pages } = useAllPages(user?.ownerId);
  const { showToast } = useToast();
  const backupNudgeShownRef = useRef(false);
  const [q, setQ] = useState('');
  const [filterKey, setFilterKey] = useState('all'); // all | unpaid | paid | recent
  const [refreshing, setRefreshing] = useState(false);
  const [offlineBanner, setOfflineBanner] = useState(true);
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [recentIds, setRecentIds] = useState([]);
  const [navTipsVisible, setNavTipsVisible] = useState(false);
  const isOffline = useOfflineStatus();
  const keyboardPad = useKeyboardHeight(true);
  const tabBarOuter = getTabBarOuterHeight(insets.bottom);

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
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        if (dismissedAt && now - dismissedAt < sevenDays) return;
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

  const sortKey = filterKey === 'recent' ? 'recent' : 'name';

  const filtered = useMemo(() => {
    const nq = normalize(q);
    let rows = customers;
    if (nq) {
      rows = rows.filter((c) => {
        const name = normalize(c.name);
        const phone = normalize(c.phone);
        const addr = normalize(c.address);
        return name.includes(nq) || phone.includes(nq) || addr.includes(nq);
      });
    }
    if (filterKey === 'unpaid') {
      rows = rows.filter((c) => (Number(c.balance) || 0) > 0);
    }
    if (filterKey === 'paid') {
      rows = rows.filter((c) => (Number(c.balance) || 0) <= 0);
    }
    return [...rows].sort((a, b) => compareCustomers(a, b, sortKey));
  }, [customers, q, filterKey, sortKey]);

  const outstanding = useMemo(() => {
    return filtered.filter((c) => (Number(c.balance) || 0) > 0);
  }, [filtered]);

  const outstandingIds = useMemo(() => {
    return new Set(outstanding.map((c) => c.id));
  }, [outstanding]);

  const recentCustomers = useMemo(() => {
    const byId = new Map(customers.map((c) => [c.id, c]));
    return recentIds.map((id) => byId.get(id)).filter(Boolean);
  }, [recentIds, customers]);

  const lastRecentCustomer = recentCustomers[0] || null;

  const allCustomers = useMemo(() => {
    if (filterKey !== 'all') return filtered;
    // Prevent duplicate keys by excluding customers already in OUTSTANDING.
    return filtered.filter((c) => !outstandingIds.has(c.id));
  }, [filtered, filterKey, outstandingIds]);

  const hasQuery = Boolean(normalize(q));

  const listData = useMemo(() => {
    if (loading && customers.length === 0) {
      if (filterKey === 'all') {
        return Array.from({ length: 7 }).map((_, i) => ({
          __kind: 'skeleton',
          id: `sk-${i}`,
        }));
      }
      return [];
    }

    const rowCount =
      filterKey === 'all'
        ? outstanding.length + allCustomers.length
        : filtered.length;

    const emptySearch =
      hasQuery && rowCount === 0 && customers.length > 0 && !loading;

    if (emptySearch) {
      return [];
    }

    if (filterKey === 'all') {
      return [
        { __kind: 'section', id: 'out' },
        ...outstanding,
        { __kind: 'section', id: 'all' },
        ...allCustomers,
      ];
    }
    return filtered;
  }, [
    filterKey,
    outstanding,
    allCustomers,
    filtered,
    hasQuery,
    customers.length,
    loading,
  ]);

  const totals = useMemo(() => {
    let unpaid = 0;
    let count = 0;
    let allPaid = 0;
    for (const c of customers) {
      const b = Number(c.balance) || 0;
      if (b > 0) {
        unpaid += b;
        count += 1;
      } else {
        allPaid += Math.abs(b);
      }
    }
    return { unpaid, count, allPaid, totalCustomers: customers.length };
  }, [customers]);

  const overdueCustomers = useMemo(() => {
    const now = Date.now();
    const OVERDUE_DAYS = 30;
    const cutoff = now - OVERDUE_DAYS * 24 * 60 * 60 * 1000;
    return customers
      .filter((c) => (Number(c.balance) || 0) > 0)
      .map((c) => {
        const ts = new Date(c.lastTransactionAt || 0).getTime() || 0;
        const days = ts ? Math.max(0, Math.floor((now - ts) / (24 * 60 * 60 * 1000))) : 999;
        return { customer: c, ts, days };
      })
      .filter((x) => x.ts === 0 || x.ts < cutoff)
      .sort((a, b) => {
        if (b.days !== a.days) return b.days - a.days;
        return (Number(b.customer.balance) || 0) - (Number(a.customer.balance) || 0);
      })
      .slice(0, 8);
  }, [customers]);

  const recentActivity = useMemo(() => {
    const byId = new Map(customers.map((c) => [c.id, c]));
    const events = [];
    for (const p of pages || []) {
      const cust = byId.get(p.customerId);
      const customerName = cust?.name || t('nav_customer');
      for (const it of p.items || []) {
        const ts = new Date(it.createdAt || 0).getTime() || 0;
        if (!ts) continue;
        events.push({
          id: `i-${p.id}-${it.id}`,
          kind: 'utang',
          customerId: p.customerId,
          customerName,
          title: it.description || t('home_notifActivityUtang'),
          amount: Number(it.amount) || 0,
          ts,
        });
      }
      for (const pay of p.payments || []) {
        const ts = new Date(pay.createdAt || 0).getTime() || 0;
        if (!ts) continue;
        events.push({
          id: `p-${p.id}-${pay.id}`,
          kind: 'payment',
          customerId: p.customerId,
          customerName,
          title: pay.note
            ? `${t('home_notifActivityPayment')} · ${pay.note}`
            : t('home_notifActivityPayment'),
          amount: Number(pay.amount) || 0,
          ts,
        });
      }
    }
    return events.sort((a, b) => b.ts - a.ts).slice(0, 10);
  }, [pages, customers, t]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    await new Promise((r) => setTimeout(r, 300));
    setRefreshing(false);
  };

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
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
        keyExtractor={(item, idx) =>
          item?.__kind ? `sec-${item.id}` : item?.id || String(idx)
        }
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <>
          <View
            style={[
              styles.header,
              {
                paddingTop: Math.max(insets.top, 10),
                backgroundColor: theme.colors.surface,
                borderBottomColor:
                  theme.colors.outlineVariant || theme.colors.outline,
              },
            ]}
          >
            <View style={styles.topBar}>
              <View style={styles.topbarLeft}>
                <View style={styles.topbarLogo}>
                  <MaterialCommunityIcons name="cart-outline" size={18} color="#fff" />
                </View>
                <View>
                  <Text style={styles.topbarTitle}>{t('app_name')}</Text>
                  <Text style={styles.topbarSubtitle}>{todayLabel}</Text>
                </View>
              </View>
              <View style={styles.topbarActions}>
                <IconButton
                  icon="bell-outline"
                  size={18}
                  onPress={() => setNotifOpen(true)}
                  iconColor={theme.colors.onSurfaceVariant}
                  containerColor={theme.colors.surfaceVariant}
                  style={styles.iconBtn}
                  accessibilityLabel={t('home_notifBellA11y')}
                />
                <IconButton
                  icon="plus"
                  size={18}
                  onPress={() => setAddCustomerOpen(true)}
                  iconColor="#2d8a4e"
                  containerColor={theme.colors.surfaceVariant}
                  style={styles.iconBtn}
                  accessibilityLabel={t('home_addCustomerTopA11y')}
                />
              </View>
            </View>

            <Card mode="elevated" style={styles.summary}>
              <LinearGradient
                colors={['#2d8a4e', '#2f9a57', '#3cb96a']}
                locations={[0, 0.55, 1]}
                start={{ x: 0.1, y: 0 }}
                end={{ x: 0.9, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View pointerEvents="none" style={styles.bannerCircle1} />
              <View pointerEvents="none" style={styles.bannerCircle2} />
              <Card.Content style={styles.summaryContent}>
                <Text style={styles.bannerLabel}>{t('home_totalUnpaid')}</Text>
                <Text style={styles.bannerAmount}>{formatPeso(totals.unpaid)}</Text>
                <View style={styles.bannerStats}>
                  <View style={styles.bannerStat}>
                    <Text style={styles.bannerVal}>{totals.count}</Text>
                    <Text style={styles.bannerLbl}>{t('home_withDebt')}</Text>
                  </View>
                  <View style={styles.bannerStat}>
                    <Text style={styles.bannerVal}>{totals.totalCustomers}</Text>
                    <Text style={styles.bannerLbl}>{t('home_totalCustomers')}</Text>
                  </View>
                  <View style={styles.bannerStat}>
                    <Text style={styles.bannerVal}>{formatPeso(totals.allPaid)}</Text>
                    <Text style={styles.bannerLbl}>{t('home_allTimePaid')}</Text>
                  </View>
                </View>
              </Card.Content>
            </Card>
            <Searchbar
              placeholder={t('home_searchPlaceholder')}
              value={q}
              onChangeText={setQ}
              style={[
                styles.search,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor:
                    theme.colors.outlineVariant || theme.colors.outline,
                },
              ]}
              elevation={0}
              inputStyle={[
                styles.searchInput,
                { color: theme.colors.onSurface },
              ]}
            />

            <View style={styles.chipsRow}>
              <Chip
                selected={filterKey === 'all'}
                onPress={() => setFilterKey('all')}
                style={[
                  styles.chip,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor:
                      theme.colors.outlineVariant || theme.colors.outline,
                  },
                  filterKey === 'all' && styles.chipActive,
                ]}
                textStyle={[
                  styles.chipText,
                  { color: theme.colors.onSurfaceVariant },
                  filterKey === 'all' && styles.chipTextActive,
                ]}
                compact
              >
                {t('home_chipAll')}
              </Chip>
              <Chip
                selected={filterKey === 'unpaid'}
                onPress={() => setFilterKey('unpaid')}
                style={[
                  styles.chip,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor:
                      theme.colors.outlineVariant || theme.colors.outline,
                  },
                  filterKey === 'unpaid' && styles.chipActive,
                ]}
                textStyle={[
                  styles.chipText,
                  { color: theme.colors.onSurfaceVariant },
                  filterKey === 'unpaid' && styles.chipTextActive,
                ]}
                compact
              >
                {t('home_filterUnpaid')}
              </Chip>
              <Chip
                selected={filterKey === 'paid'}
                onPress={() => setFilterKey('paid')}
                style={[
                  styles.chip,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor:
                      theme.colors.outlineVariant || theme.colors.outline,
                  },
                  filterKey === 'paid' && styles.chipActive,
                ]}
                textStyle={[
                  styles.chipText,
                  { color: theme.colors.onSurfaceVariant },
                  filterKey === 'paid' && styles.chipTextActive,
                ]}
                compact
              >
                {t('home_chipPaidUp')}
              </Chip>
              <Chip
                selected={filterKey === 'recent'}
                onPress={() => setFilterKey('recent')}
                style={[
                  styles.chip,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor:
                      theme.colors.outlineVariant || theme.colors.outline,
                  },
                  filterKey === 'recent' && styles.chipActive,
                ]}
                textStyle={[
                  styles.chipText,
                  { color: theme.colors.onSurfaceVariant },
                  filterKey === 'recent' && styles.chipTextActive,
                ]}
                compact
              >
                {t('home_chipRecent')}
              </Chip>
            </View>
            {navTipsVisible ? (
              <View
                style={[
                  styles.tipsCard,
                  {
                    backgroundColor: theme.colors.primaryContainer || '#e8f5ed',
                    borderColor: theme.colors.outlineVariant || theme.colors.outline,
                  },
                ]}
              >
                <Text style={[styles.tipsTitle, { color: theme.colors.onPrimaryContainer || '#1a2e1f' }]}>
                  {t('home_navTipsTitle')}
                </Text>
                <Text style={[styles.tipsLine, { color: theme.colors.onSurfaceVariant }]}>
                  {t('home_navTips1')}
                </Text>
                <Text style={[styles.tipsLine, { color: theme.colors.onSurfaceVariant }]}>
                  {t('home_navTips2')}
                </Text>
                <Text style={[styles.tipsLine, { color: theme.colors.onSurfaceVariant }]}>
                  {t('home_navTips3')}
                </Text>
                <Button
                  mode="contained-tonal"
                  compact
                  onPress={async () => {
                    await setNavTipsDismissed();
                    setNavTipsVisible(false);
                  }}
                  style={{ alignSelf: 'flex-start', marginTop: 10 }}
                >
                  {t('home_navTipsDismiss')}
                </Button>
              </View>
            ) : null}
            {recentCustomers.length > 0 ? (
              <View style={styles.recentBlock}>
                <Text style={[styles.recentHeading, { color: theme.colors.onSurfaceVariant }]}>
                  {t('home_recentHeading')}
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.recentChips}
                >
                  {recentCustomers.map((c) => (
                    <Chip
                      key={c.id}
                      compact
                      mode="outlined"
                      style={styles.recentChip}
                      onPress={() => router.push(`/customer/${c.id}`)}
                    >
                      {c.name}
                    </Chip>
                  ))}
                </ScrollView>
              </View>
            ) : null}
            {error ? (
              <View style={styles.errBox}>
                <Text variant="bodyLarge" style={styles.err}>
                  {error?.message || t('home_apiError')}
                </Text>
                <Button
                  mode="contained-tonal"
                  compact
                  onPress={() => refresh()}
                  style={styles.errRetry}
                >
                  {t('home_errorRetry')}
                </Button>
              </View>
            ) : null}
          </View>
          {filterKey !== 'all' ? (
            <View
              style={{
                height: 12,
                backgroundColor: theme.colors.background,
              }}
            />
          ) : null}
          </>
        }
        ListEmptyComponent={
          loading && customers.length === 0 ? (
            <CustomerListSkeleton rows={6} />
          ) : customers.length === 0 ? (
            <EmptyState
              icon="account-group-outline"
              title={t('home_emptyTitle')}
              subtitle={t('home_emptySubtitle')}
              actionLabel={t('home_emptyAction')}
              onAction={() => setAddCustomerOpen(true)}
            />
          ) : hasQuery ? (
            <EmptyState
              icon="magnify"
              title={t('home_emptySearchTitle')}
              subtitle={t('home_emptySearchSubtitle')}
            />
          ) : (
            <EmptyState
              icon="filter-remove-outline"
              title={t('home_emptyFilterTitle')}
              subtitle={t('home_emptyFilterSubtitle')}
            />
          )
        }
        renderItem={({ item }) => {
          if (item?.__kind === 'skeleton') {
            return <CustomerRowSkeleton />;
          }
          if (item?.__kind === 'section') {
            const label =
              item.id === 'out'
                ? t('home_sectionOutstanding')
                : t('home_sectionAllCustomers');
            const hide = item.id === 'out' && outstanding.length === 0;
            if (hide) return null;
            return (
              <View style={styles.sectionWrap}>
                <Text style={styles.sectionLabel}>{label}</Text>
              </View>
            );
          }
          return (
            <CustomerCard
              customer={item}
              onPress={() => router.push(`/customer/${item.id}`)}
            />
          );
        }}
        contentContainerStyle={{
          paddingBottom: tabBarOuter + 72 + keyboardPad,
          backgroundColor: theme.colors.background,
        }}
      />

      <FAB
        icon="menu"
        style={[styles.fab, { bottom: tabBarOuter + 14 }]}
        onPress={() => setQuickOpen(true)}
        variant="primary"
        accessibilityLabel={t('home_fabQuickA11y')}
      />

      <AddCustomerModal
        visible={addCustomerOpen}
        onDismiss={() => setAddCustomerOpen(false)}
      />

      <Portal>
        <Dialog
          visible={quickOpen}
          onDismiss={() => setQuickOpen(false)}
          style={[
            styles.quickDialog,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant || theme.colors.outline,
              borderWidth: 1,
            },
          ]}
        >
          <Dialog.Title style={{ fontFamily: font.extraBold }}>{t('home_quickTitle')}</Dialog.Title>
          <Dialog.Content>
            <Button
              mode="text"
              icon="account-plus-outline"
              onPress={() => {
                setQuickOpen(false);
                setAddCustomerOpen(true);
              }}
              style={styles.quickBtn}
            >
              {t('home_quickNewCustomer')}
            </Button>
            <Button
              mode="text"
              icon="package-variant"
              onPress={() => {
                setQuickOpen(false);
                router.push('/inventory');
              }}
              style={styles.quickBtn}
            >
              {t('home_quickInventory')}
            </Button>
            <Button
              mode="text"
              icon="chart-bar"
              onPress={() => {
                setQuickOpen(false);
                router.push('/reports');
              }}
              style={styles.quickBtn}
            >
              {t('home_quickReports')}
            </Button>
            {lastRecentCustomer ? (
              <Button
                mode="text"
                icon="account-arrow-right-outline"
                onPress={() => {
                  setQuickOpen(false);
                  router.push(`/customer/${lastRecentCustomer.id}`);
                }}
                style={styles.quickBtn}
              >
                {t('home_quickLastCustomer', { name: lastRecentCustomer.name })}
              </Button>
            ) : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setQuickOpen(false)}>{t('home_quickClose')}</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Portal>
        <Dialog
          visible={notifOpen}
          onDismiss={() => setNotifOpen(false)}
          style={[
            styles.notifDialog,
            {
              backgroundColor: theme.colors.surface,
              borderColor:
                theme.colors.outlineVariant || theme.colors.outline,
              borderWidth: 1,
            },
          ]}
        >
          <View style={styles.notifHead}>
            <View style={styles.notifIcon}>
              <MaterialCommunityIcons
                name="bell-outline"
                size={18}
                color="#2d8a4e"
              />
            </View>
            <Text style={styles.notifTitle}>{t('home_notifTitle')}</Text>
            <IconButton
              icon="close"
              size={18}
              onPress={() => setNotifOpen(false)}
              style={{ margin: 0 }}
            />
          </View>
          <Dialog.ScrollArea>
            <ScrollView
              style={{ maxHeight: 520 }}
              contentContainerStyle={styles.notifBody}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.notifSection}>{t('home_notifOverdue')}</Text>
              {overdueCustomers.length === 0 ? (
                <Text style={[styles.notifEmpty, { color: theme.colors.onSurfaceVariant }]}>
                  {t('home_notifNoneOverdue')}
                </Text>
              ) : (
                overdueCustomers.map(({ customer: c, days }) => (
                  <Pressable
                    key={c.id}
                    onPress={() => {
                      setNotifOpen(false);
                      router.push(`/customer/${c.id}`);
                    }}
                    style={({ pressed }) => [
                      styles.notifRow,
                      { backgroundColor: theme.colors.surfaceVariant },
                      pressed && { opacity: 0.92 },
                    ]}
                  >
                    <View
                      style={[
                        styles.notifBadge,
                        { backgroundColor: '#fee2e2' },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name="clock-alert-outline"
                        size={18}
                        color="#ef4444"
                      />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.notifRowTitle} numberOfLines={1}>
                        {c.name}
                      </Text>
                      <Text style={styles.notifRowSub} numberOfLines={1}>
                        {t('home_notifOverdueAge', { days })}
                        {c.lastTransactionAt
                          ? ` · ${formatDateTime(c.lastTransactionAt)}`
                          : ''}
                      </Text>
                    </View>
                    <Text style={styles.notifAmt}>
                      {formatPeso(Number(c.balance) || 0)}
                    </Text>
                  </Pressable>
                ))
              )}

              <Divider style={{ marginVertical: 14 }} />

              <Text style={styles.notifSection}>{t('home_notifRecent')}</Text>
              {recentActivity.length === 0 ? (
                <Text style={[styles.notifEmpty, { color: theme.colors.onSurfaceVariant }]}>
                  {t('home_notifNoneRecent')}
                </Text>
              ) : (
                recentActivity.map((e) => (
                  <Pressable
                    key={e.id}
                    onPress={() => {
                      setNotifOpen(false);
                      router.push(`/customer/${e.customerId}`);
                    }}
                    style={({ pressed }) => [
                      styles.notifRow,
                      { backgroundColor: theme.colors.surfaceVariant },
                      pressed && { opacity: 0.92 },
                    ]}
                  >
                    <View
                      style={[
                        styles.notifBadge,
                        {
                          backgroundColor:
                            e.kind === 'payment' ? '#e8f5ed' : '#fef3c7',
                        },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={e.kind === 'payment' ? 'cash-check' : 'cart-plus'}
                        size={18}
                        color={e.kind === 'payment' ? '#2d8a4e' : '#f59e0b'}
                      />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.notifRowTitle} numberOfLines={1}>
                        {e.customerName}
                      </Text>
                      <Text style={styles.notifRowSub} numberOfLines={1}>
                        {e.title} · {formatDateTime(e.ts)}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.notifAmt,
                        e.kind === 'payment'
                          ? { color: '#2d8a4e' }
                          : { color: '#f59e0b' },
                      ]}
                    >
                      {formatPeso(e.amount)}
                    </Text>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </Dialog.ScrollArea>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    borderBottomWidth: 1,
    paddingTop: 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  topbarLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  topbarLogo: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#2d8a4e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topbarTitle: {
    fontFamily: font.extraBold,
    fontSize: 18,
    color: '#1a2e1f',
    letterSpacing: -0.3,
  },
  topbarSubtitle: { fontFamily: font.medium, fontSize: 11, color: '#5a7060', marginTop: 1 },
  topbarActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { margin: 0, borderRadius: 10 },

  notifDialog: { borderRadius: 18, alignSelf: 'center', width: '92%', maxWidth: 480 },
  notifHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  notifIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#e8f5ed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifTitle: { flex: 1, fontFamily: font.extraBold, fontSize: 16 },
  notifBody: { paddingHorizontal: 16, paddingBottom: 18 },
  notifSection: {
    fontFamily: font.semiBold,
    fontSize: 11,
    letterSpacing: 0.8,
    color: '#9ab09e',
    textTransform: 'uppercase',
    marginTop: 6,
    marginBottom: 8,
  },
  notifEmpty: { opacity: 0.75, paddingVertical: 10 },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 16,
    marginBottom: 10,
  },
  notifBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifRowTitle: { fontFamily: font.semiBold },
  notifRowSub: { opacity: 0.75, marginTop: 2, fontSize: 11 },
  notifAmt: { fontFamily: font.extraBold, fontSize: 12 },

  summary: { borderRadius: 16, overflow: 'hidden', marginTop: 2 },
  summaryContent: { paddingVertical: 18, paddingHorizontal: 20 },
  bannerCircle1: {
    position: 'absolute',
    right: -20,
    top: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  bannerCircle2: {
    position: 'absolute',
    right: 20,
    bottom: -30,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  bannerLabel: { fontFamily: font.medium, fontSize: 13, color: 'rgba(255,255,255,0.86)' },
  bannerAmount: {
    fontFamily: font.extraBold,
    fontSize: 34,
    color: '#fff',
    letterSpacing: -1,
    marginTop: 4,
    marginBottom: 12,
  },
  bannerStats: { flexDirection: 'row', gap: 18 },
  bannerStat: { flex: 1 },
  bannerVal: { fontFamily: font.extraBold, fontSize: 18, color: '#fff' },
  bannerLbl: {
    fontFamily: font.medium,
    fontSize: 13,
    color: 'rgba(255,255,255,0.82)',
    marginTop: 3,
    lineHeight: 16,
  },

  search: {
    marginTop: 12,
    borderWidth: 1.5,
    borderRadius: 10,
  },
  searchInput: { fontFamily: font.medium, fontSize: 14 },

  chipsRow: { flexDirection: 'row', gap: 6, marginTop: 10 },
  chip: { borderWidth: 1.5 },
  chipActive: { backgroundColor: '#2d8a4e', borderColor: '#2d8a4e' },
  chipText: { fontFamily: font.semiBold, fontSize: 12, color: '#5a7060' },
  chipTextActive: { color: '#fff' },

  sectionWrap: {
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  sectionLabel: {
    fontFamily: font.semiBold,
    fontSize: 12,
    color: '#9ab09e',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  fab: { position: 'absolute', right: 18 },
  quickDialog: { borderRadius: 16, alignSelf: 'center', width: '90%', maxWidth: 400 },
  quickBtn: { justifyContent: 'flex-start' },
  tipsCard: {
    marginTop: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  tipsTitle: { fontFamily: font.extraBold, fontSize: 15, marginBottom: 8 },
  tipsLine: { fontSize: 13, lineHeight: 19, marginBottom: 4 },
  recentBlock: { marginTop: 12 },
  recentHeading: {
    fontFamily: font.semiBold,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  recentChips: { flexDirection: 'row', gap: 8, paddingRight: 8 },
  recentChip: { marginRight: 0 },
  centerPad: { textAlign: 'center', padding: 24 },
  errBox: { marginHorizontal: 16, marginBottom: 8 },
  err: { color: '#C62828', marginBottom: 8 },
  errRetry: { alignSelf: 'flex-start' },
});
