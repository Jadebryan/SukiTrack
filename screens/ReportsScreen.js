import React, { useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState } from '@/components/EmptyState';
import { HubScreenHeader } from '@/components/hub/HubScreenHeader';
import { HomeSectionHeader } from '@/components/home/HomeSectionHeader';
import { ReportMetricCard, ReportMetricRow } from '@/components/reports/ReportMetricCard';
import { ReportPeriodPills } from '@/components/reports/ReportPeriodPills';
import { ReportsScreenSkeleton } from '@/components/Skeleton';
import { getHomePalette } from '@/constants/homePalette';
import { getTabBarOuterHeight } from '@/constants/tabBar';
import { font } from '@/constants/theme';
import { useAppTheme } from '@/contexts/AppThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { useShopData } from '@/contexts/ShopDataContext';
import { buildReportSummary } from '@/services/reportsService';
import { formatPeso } from '@/utils/currency';
import { toJsDate } from '@/utils/date';

export function ReportsScreen() {
  const { t } = useLocale();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { isDark } = useAppTheme();
  const colors = useMemo(() => getHomePalette(isDark), [isDark]);
  const { customers, pages, loading, error, refresh } = useShopData();
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState('day');
  const tabBarPad = getTabBarOuterHeight(insets.bottom);

  const ready = Boolean(user?.ownerId);
  const cust = ready ? customers : [];
  const pgs = ready ? pages : [];

  const summary = useMemo(() => buildReportSummary(cust, pgs), [cust, pgs]);

  const weekSeries = useMemo(() => {
    const now = new Date();
    const startDay = new Date(now);
    startDay.setHours(0, 0, 0, 0);
    const startWeek = new Date(startDay);
    const dow = startWeek.getDay();
    startWeek.setDate(startWeek.getDate() - ((dow + 6) % 7));

    const days = Array.from({ length: 7 }).map((_, i) => {
      const d0 = new Date(startWeek);
      d0.setDate(d0.getDate() + i);
      const d1 = new Date(d0);
      d1.setHours(23, 59, 59, 999);
      return { start: d0, end: d1 };
    });

    const collected = Array.from({ length: 7 }).fill(0);
    const pending = Array.from({ length: 7 }).fill(0);
    for (const p of pgs) {
      for (const pay of p.payments || []) {
        const d = toJsDate(pay.createdAt);
        if (!d) continue;
        for (let i = 0; i < 7; i += 1) {
          const { start, end } = days[i];
          const x = d.getTime();
          if (x >= start.getTime() && x <= end.getTime()) {
            collected[i] += Number(pay.amount) || 0;
            break;
          }
        }
      }
      for (const it of p.items || []) {
        const d = toJsDate(it.createdAt);
        if (!d) continue;
        for (let i = 0; i < 7; i += 1) {
          const { start, end } = days[i];
          const x = d.getTime();
          if (x >= start.getTime() && x <= end.getTime()) {
            pending[i] += Number(it.amount) || 0;
            break;
          }
        }
      }
    }

    const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    return { labels, collected, pending };
  }, [pgs]);

  const periodBlock = useMemo(() => {
    switch (period) {
      case 'week':
        return { title: t('rep_weekTitle'), bucket: summary.weekly };
      case 'month':
        return { title: t('rep_monthTitle'), bucket: summary.monthly };
      case 'all':
        return { title: t('rep_allTime'), bucket: summary.allTime };
      default:
        return { title: t('rep_todayTitle'), bucket: summary.daily };
    }
  }, [period, summary, t]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      await new Promise((r) => setTimeout(r, 200));
      setRefreshing(false);
    }
  };

  const busy = ready && loading;
  const isEmpty = ready && !loading && cust.length === 0 && pgs.length === 0;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{
        paddingTop: insets.top,
        paddingBottom: tabBarPad + 16,
      }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      showsVerticalScrollIndicator={false}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <HubScreenHeader
        colors={colors}
        title={t('tab_reports')}
        rightIcon="refresh"
        onRightPress={onRefresh}
        rightA11y={t('common_retry')}
        rightLoading={refreshing}
      />

      <ReportPeriodPills
        colors={colors}
        t={t}
        activeKey={period}
        onChange={setPeriod}
      />

      {busy && cust.length === 0 && pgs.length === 0 ? (
        <ReportsScreenSkeleton />
      ) : null}

      {error ? (
        <Text style={styles.errBanner}>{error?.message || t('common_error')}</Text>
      ) : null}

      {isEmpty ? (
        <EmptyState
          icon="chart-box-outline"
          title={t('rep_emptyTitle')}
          subtitle={t('rep_emptySubtitle')}
        />
      ) : null}

      {!isEmpty ? (
        <>
          <View style={[styles.hero, { backgroundColor: colors.green600 }]}>
            <Text style={styles.heroLabel}>{periodBlock.title}</Text>
            <Text style={styles.heroAmount}>
              {formatPeso(periodBlock.bucket.payments)}
            </Text>
            <Text style={styles.heroSub}>{t('rep_collected')}</Text>
            <View style={styles.heroStats}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatVal}>
                  {formatPeso(periodBlock.bucket.utangAdded)}
                </Text>
                <Text style={styles.heroStatLbl}>{t('rep_creditAdded')}</Text>
              </View>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatVal}>{formatPeso(periodBlock.bucket.net)}</Text>
                <Text style={styles.heroStatLbl}>{t('rep_net')}</Text>
              </View>
            </View>
          </View>

          <HomeSectionHeader colors={colors} title={t('rep_summary').toUpperCase()} />

          <ReportMetricCard
            colors={colors}
            title={t('rep_summary')}
            icon="clipboard-text-outline"
          >
            <ReportMetricRow
              colors={colors}
              label={t('rep_totalUnpaid')}
              value={formatPeso(summary.totalUnpaid)}
              tone="amber"
            />
            <ReportMetricRow
              colors={colors}
              label={t('rep_unpaidCustomersLabel')}
              value={String(summary.unpaidCustomerCount)}
            />
            <ReportMetricRow
              colors={colors}
              label={t('rep_totalCollected')}
              value={formatPeso(summary.totalCollected)}
              tone="positive"
              noDivider
            />
          </ReportMetricCard>

          <ReportMetricCard
            colors={colors}
            title={period === 'day' ? t('rep_todayTitle') : t('rep_activity')}
            icon="flash"
            iconColor={colors.amber700}
          >
            <ReportMetricRow
              colors={colors}
              label={t('rep_collected')}
              value={formatPeso(periodBlock.bucket.payments)}
              tone="positive"
            />
            <ReportMetricRow
              colors={colors}
              label={t('rep_creditAdded')}
              value={formatPeso(periodBlock.bucket.utangAdded)}
              tone="amber"
              noDivider
            />
          </ReportMetricCard>

          <ReportMetricCard
            colors={colors}
            title={t('rep_weekTitle')}
            icon="chart-bar"
          >
            <View style={styles.chartWrap}>
              <View style={styles.miniChart}>
                {weekSeries.labels.map((lbl, i) => {
                  const cVal = weekSeries.collected[i] || 0;
                  const pVal = weekSeries.pending[i] || 0;
                  const max = Math.max(...weekSeries.collected, ...weekSeries.pending, 1);
                  const hCollected = Math.max(6, Math.round((cVal / max) * 52));
                  const hPending = Math.max(6, Math.round((pVal / max) * 52));
                  const showCollected = cVal > 0;
                  return (
                    <View key={`${lbl}-${i}`} style={styles.barWrap}>
                      <View
                        style={[
                          styles.bar,
                          {
                            height: showCollected ? hCollected : hPending,
                            backgroundColor: showCollected
                              ? colors.green600
                              : colors.green50,
                          },
                        ]}
                      />
                      <Text style={[styles.barLbl, { color: colors.textFaint }]}>
                        {lbl}
                      </Text>
                    </View>
                  );
                })}
              </View>
              <View style={styles.legend}>
                <View style={styles.legendItem}>
                  <View
                    style={[styles.legendDot, { backgroundColor: colors.green600 }]}
                  />
                  <Text style={[styles.legendText, { color: colors.textFaint }]}>
                    {t('rep_collected')}
                  </Text>
                </View>
                <View style={styles.legendItem}>
                  <View
                    style={[styles.legendDot, { backgroundColor: colors.green50 }]}
                  />
                  <Text style={[styles.legendText, { color: colors.textFaint }]}>
                    {t('rep_creditAdded')}
                  </Text>
                </View>
              </View>
            </View>
          </ReportMetricCard>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  errBanner: {
    color: '#C62828',
    marginHorizontal: 16,
    marginBottom: 12,
    fontFamily: font.medium,
    fontSize: 13,
  },
  hero: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    padding: 18,
    gap: 4,
  },
  heroLabel: {
    fontFamily: font.medium,
    fontSize: 13,
    color: '#9FE1CB',
  },
  heroAmount: {
    fontFamily: font.extraBold,
    fontSize: 30,
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginTop: -2,
  },
  heroSub: {
    fontFamily: font.medium,
    fontSize: 12,
    color: '#E1F5EE',
    marginBottom: 8,
  },
  heroStats: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  heroStat: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    padding: 10,
    gap: 2,
  },
  heroStatVal: {
    fontFamily: font.semiBold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  heroStatLbl: {
    fontFamily: font.medium,
    fontSize: 10,
    color: '#9FE1CB',
    lineHeight: 13,
  },
  chartWrap: { paddingTop: 4 },
  miniChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 5,
    height: 52,
  },
  barWrap: { flex: 1, alignItems: 'center', gap: 3 },
  bar: {
    width: '100%',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  barLbl: {
    fontFamily: font.semiBold,
    fontSize: 9,
  },
  legend: { flexDirection: 'row', gap: 12, marginTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 2 },
  legendText: {
    fontFamily: font.medium,
    fontSize: 11,
  },
});
