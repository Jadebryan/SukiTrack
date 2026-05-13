import React, { useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, IconButton, Text, useTheme } from 'react-native-paper';
import { EmptyState } from '@/components/EmptyState';
import { ReportsScreenSkeleton } from '@/components/Skeleton';
import { font } from '@/constants/theme';
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
  const theme = useTheme();
  const { customers, pages, loading, error, refresh } = useShopData();
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState('day');

  const ready = Boolean(user?.ownerId);
  const cust = ready ? customers : [];
  const pgs = ready ? pages : [];

  const summary = useMemo(
    () => buildReportSummary(cust, pgs),
    [cust, pgs]
  );

  const weekSeries = useMemo(() => {
    // Monday–Sunday of the current week.
    const now = new Date();
    const startDay = new Date(now);
    startDay.setHours(0, 0, 0, 0);
    const startWeek = new Date(startDay);
    const dow = startWeek.getDay();
    startWeek.setDate(startWeek.getDate() - ((dow + 6) % 7));
    const endWeek = new Date(startWeek);
    endWeek.setDate(endWeek.getDate() + 7);

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
        return {
          title: t('rep_weekTitle'),
          bucket: summary.weekly,
          hint: t('rep_weekHint'),
        };
      case 'month':
        return {
          title: t('rep_monthTitle'),
          bucket: summary.monthly,
          hint: null,
        };
      case 'all':
        return {
          title: t('rep_allTime'),
          bucket: summary.allTime,
          hint: t('rep_allTimeHint'),
        };
      default:
        return {
          title: t('rep_todayTitle'),
          bucket: summary.daily,
          hint: null,
        };
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
      contentContainerStyle={[
        styles.pad,
        {
          paddingTop: Math.max(insets.top, 10),
          backgroundColor: theme.colors.background,
        },
      ]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
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
          {t('tab_reports')}
        </Text>
        <IconButton
          icon="refresh"
          size={18}
          onPress={onRefresh}
          style={styles.refreshBtn}
          iconColor={theme.colors.onSurfaceVariant}
          containerColor={theme.colors.surfaceVariant}
        />
      </View>

      <View style={styles.periodTabs}>
        {[
          { key: 'day', label: t('rep_today') },
          { key: 'week', label: t('rep_week') },
          { key: 'month', label: t('rep_month') },
          { key: 'all', label: t('rep_allTime') },
        ].map((x) => {
          const active = period === x.key;
          return (
            <Pressable
              key={x.key}
              onPress={() => setPeriod(x.key)}
              style={[
                styles.periodTab,
                {
                  backgroundColor: active ? '#2d8a4e' : theme.colors.surface,
                  borderColor: active
                    ? '#2d8a4e'
                    : theme.colors.outlineVariant || theme.colors.outline,
                },
              ]}
            >
              <Text
                style={[
                  styles.periodTabText,
                  { color: active ? '#ffffff' : theme.colors.onSurfaceVariant },
                ]}
              >
                {x.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {busy && cust.length === 0 && pgs.length === 0 ? (
        <ReportsScreenSkeleton />
      ) : null}

      {error ? (
        <Text
          variant="bodyMedium"
          style={[styles.errBanner, { color: theme.colors.error }]}
        >
          {error?.message || t('common_error')}
        </Text>
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
          <Card
            mode="outlined"
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outlineVariant || theme.colors.outline,
              },
            ]}
          >
            <Card.Content>
              <View style={styles.cardTitleRow}>
                <MaterialCommunityIcons name="clipboard-text-outline" size={18} color="#2d8a4e" />
                <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
                  {t('rep_summary')}
                </Text>
              </View>
              <ReportRow
                label={t('rep_totalUnpaid')}
                value={formatPeso(summary.totalUnpaid)}
                tone="amber"
              />
              <ReportRow
                label={t('rep_unpaidCustomersLabel')}
                value={String(summary.unpaidCustomerCount)}
              />
              <ReportRow
                label={t('rep_totalCollected')}
                value={formatPeso(summary.totalCollected)}
                tone="positive"
              />
            </Card.Content>
          </Card>

          <Card
            mode="outlined"
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outlineVariant || theme.colors.outline,
              },
            ]}
          >
            <Card.Content style={{ paddingBottom: 0 }}>
              <View style={styles.cardTitleRow}>
                <MaterialCommunityIcons name="flash" size={18} color="#f59e0b" />
                <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
                  {period === 'day' ? t('rep_todayTitle') : t('rep_activity')}
                </Text>
              </View>

              <ReportRow
                label={t('rep_collected')}
                value={formatPeso(periodBlock.bucket.payments)}
                tone="positive"
              />
              <ReportRow
                label={t('rep_creditAdded')}
                value={formatPeso(periodBlock.bucket.utangAdded)}
                tone="amber"
                noDivider
              />

              <View
                style={[
                  styles.netRow,
                  { backgroundColor: theme.colors.errorContainer },
                ]}
              >
                <Text
                  style={[
                    styles.netLabel,
                    { color: theme.colors.onErrorContainer },
                  ]}
                >
                  {t('rep_net')}
                </Text>
                <Text style={[styles.netValue, { color: theme.colors.error }]}>
                  {formatPeso(periodBlock.bucket.net)}
                </Text>
              </View>
            </Card.Content>
          </Card>

          <Card
            mode="outlined"
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outlineVariant || theme.colors.outline,
              },
            ]}
          >
            <Card.Content>
              <View style={styles.cardTitleRow}>
                <MaterialCommunityIcons name="chart-bar" size={18} color="#2d8a4e" />
                <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
                  {t('rep_weekTitle')}
                </Text>
              </View>

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
                        <View style={[styles.bar, { height: showCollected ? hCollected : hPending }, showCollected && styles.barFilled]} />
                        <Text style={[styles.barLbl, { color: theme.colors.onSurfaceVariant }]}>
                          {lbl}
                        </Text>
                      </View>
                    );
                  })}
                </View>
                <View style={styles.legend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#2d8a4e' }]} />
                    <Text style={[styles.legendText, { color: theme.colors.onSurfaceVariant }]}>
                      {t('rep_collected')}
                    </Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#e8f5ed' }]} />
                    <Text style={[styles.legendText, { color: theme.colors.onSurfaceVariant }]}>
                      {t('rep_creditAdded')}
                    </Text>
                  </View>
                </View>
              </View>
            </Card.Content>
          </Card>
        </>
      ) : null}

      <View style={styles.spacer} />
    </ScrollView>
  );
}

function ReportRow({ label, value, tone, noDivider }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.rRow,
        {
          borderBottomColor: theme.colors.surfaceVariant,
        },
        noDivider && { borderBottomWidth: 0, paddingBottom: 12 },
      ]}
    >
      <Text style={[styles.rLabel, { color: theme.colors.onSurfaceVariant }]}>
        {label}
      </Text>
      <Text
        style={[
          styles.rVal,
          { color: theme.colors.onSurface },
          tone === 'positive' && styles.rValPositive,
          tone === 'negative' && styles.rValNegative,
          tone === 'amber' && styles.rValAmber,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: 16, paddingBottom: 32 },
  topbar: {
    borderBottomWidth: 1,
    marginHorizontal: -16,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 0,
  },
  pageTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: font.extraBold,
    fontSize: 18,
    letterSpacing: -0.3,
  },
  refreshBtn: { margin: 0, borderRadius: 8, width: 32, height: 32 },
  periodTabs: { flexDirection: 'row', gap: 4, paddingTop: 14 },
  periodTab: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 8,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodTabActive: { backgroundColor: '#2d8a4e', borderColor: '#2d8a4e' },
  periodTabText: { fontFamily: font.semiBold, fontSize: 12 },
  periodTabTextActive: { color: '#ffffff' },

  card: { borderRadius: 16, marginTop: 12 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  cardTitle: { fontFamily: font.extraBold, fontSize: 15 },

  rRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f4f1',
  },
  rLabel: { fontFamily: font.medium, fontSize: 13, flex: 1, paddingRight: 12 },
  rVal: { fontFamily: font.extraBold, fontSize: 15 },
  rValPositive: { color: '#2d8a4e' },
  rValNegative: { color: '#ef4444' },
  rValAmber: { color: '#f59e0b' },

  netRow: {
    backgroundColor: '#fee2e2',
    marginHorizontal: -16,
    marginTop: 0,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  netLabel: { fontFamily: font.semiBold, fontSize: 13 },
  netValue: { fontFamily: font.extraBold, fontSize: 15, color: '#ef4444' },

  chartWrap: { paddingTop: 4 },
  miniChart: { flexDirection: 'row', alignItems: 'flex-end', gap: 5, height: 52 },
  barWrap: { flex: 1, alignItems: 'center', gap: 3 },
  bar: { width: '100%', borderTopLeftRadius: 4, borderTopRightRadius: 4, backgroundColor: '#e8f5ed' },
  barFilled: { backgroundColor: '#2d8a4e' },
  barLbl: { fontFamily: font.semiBold, fontSize: 9, color: '#9ab09e' },
  legend: { flexDirection: 'row', gap: 12, marginTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 2 },
  legendText: { fontFamily: font.semiBold, fontSize: 11, color: '#9ab09e' },

  center: { textAlign: 'center', padding: 16 },
  errBanner: {
    color: '#C62828',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  spacer: { height: 8 },
});
