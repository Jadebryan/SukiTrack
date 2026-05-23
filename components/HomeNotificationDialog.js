import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Dialog, Divider, IconButton, Portal, Text, useTheme } from 'react-native-paper';
import { useShopCustomers, useShopMeta, useShopPages } from '@/contexts/ShopDataContext';
import { useLocale } from '@/contexts/LocaleContext';
import { font } from '@/constants/theme';
import { formatPeso } from '@/utils/currency';
import { formatDateTime } from '@/utils/date';
import {
  buildOverdueCustomers,
  buildRecentActivity,
} from '@/utils/homeNotifications';

export function HomeNotificationDialog({ visible, onDismiss }) {
  const router = useRouter();
  const { t } = useLocale();
  const theme = useTheme();
  const customers = useShopCustomers();
  const pages = useShopPages();
  const { loading } = useShopMeta();

  const notifLabels = useMemo(
    () => ({
      customerFallback: t('nav_customer'),
      utangFallback: t('home_notifActivityUtang'),
      paymentFallback: t('home_notifActivityPayment'),
    }),
    [t]
  );

  const overdueCustomers = useMemo(() => {
    if (!visible) return [];
    return buildOverdueCustomers(customers);
  }, [visible, customers]);

  const recentActivity = useMemo(() => {
    if (!visible || loading) return [];
    return buildRecentActivity(pages, customers, notifLabels);
  }, [visible, loading, pages, customers, notifLabels]);

  if (!visible) {
    return null;
  }

  return (
    <Portal>
      <Dialog
        visible
        onDismiss={onDismiss}
        style={[
          styles.notifDialog,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outlineVariant || theme.colors.outline,
            borderWidth: 1,
          },
        ]}
      >
        <View style={styles.notifHead}>
          <View style={styles.notifIcon}>
            <MaterialCommunityIcons name="bell-outline" size={18} color="#2d8a4e" />
          </View>
          <Text style={styles.notifTitle}>{t('home_notifTitle')}</Text>
          <IconButton icon="close" size={18} onPress={onDismiss} style={{ margin: 0 }} />
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
                    onDismiss();
                    router.push(`/customer/${c.id}`);
                  }}
                  style={({ pressed }) => [
                    styles.notifRow,
                    { backgroundColor: theme.colors.surfaceVariant },
                    pressed && { opacity: 0.92 },
                  ]}
                >
                  <View style={[styles.notifBadge, { backgroundColor: '#fee2e2' }]}>
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
                  <Text style={styles.notifAmt}>{formatPeso(Number(c.balance) || 0)}</Text>
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
                    onDismiss();
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
                        backgroundColor: e.kind === 'payment' ? '#dcfce7' : '#fef3c7',
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={e.kind === 'payment' ? 'cash-check' : 'cart-plus'}
                      size={18}
                      color={e.kind === 'payment' ? '#16a34a' : '#f59e0b'}
                    />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.notifRowTitle} numberOfLines={1}>
                      {e.customerName}
                    </Text>
                    <Text style={styles.notifRowSub} numberOfLines={1}>
                      {e.title}
                    </Text>
                  </View>
                  <Text style={styles.notifAmt}>{formatPeso(e.amount)}</Text>
                </Pressable>
              ))
            )}
          </ScrollView>
        </Dialog.ScrollArea>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
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
});
