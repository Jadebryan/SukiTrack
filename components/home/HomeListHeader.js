import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Text as PaperText } from 'react-native-paper';
import { HomeFilterPills } from '@/components/home/HomeFilterPills';
import { HomeRecentChips } from '@/components/home/HomeRecentChips';
import { HomeSummaryCard } from '@/components/home/HomeSummaryCard';
import { font } from '@/constants/theme';

export function HomeListHeader({
  colors,
  t,
  appName,
  todayLabel,
  totals,
  q,
  onChangeQuery,
  filterKey,
  onFilterChange,
  onNotifPress,
  onAddCustomerPress,
  recentCustomers,
  onRecentPress,
  navTipsVisible,
  onDismissNavTips,
  error,
  onRetry,
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.topBar}>
        <View style={[styles.logoBadge, { backgroundColor: colors.green600 }]}>
          <MaterialCommunityIcons name="cart-outline" size={20} color="#FFFFFF" />
        </View>
        <View style={styles.brand}>
          <Text style={[styles.brandName, { color: colors.text }]}>{appName}</Text>
          <Text style={[styles.brandDate, { color: colors.textSecondary }]}>
            {todayLabel}
          </Text>
        </View>
        <View style={styles.topBarRight}>
          <Pressable
            onPress={onNotifPress}
            style={({ pressed }) => [
              styles.iconBtn,
              { backgroundColor: colors.iconBtnBg, borderColor: colors.border },
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('home_notifBellA11y')}
          >
            <MaterialCommunityIcons
              name="bell-outline"
              size={18}
              color={colors.textSecondary}
            />
          </Pressable>
          <Pressable
            onPress={onAddCustomerPress}
            style={({ pressed }) => [
              styles.iconBtn,
              styles.iconBtnGreen,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('home_addCustomerTopA11y')}
          >
            <MaterialCommunityIcons name="plus" size={22} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      <HomeSummaryCard colors={colors} t={t} totals={totals} />

      <View
        style={[
          styles.searchBar,
          { backgroundColor: colors.searchBg, borderColor: colors.border },
        ]}
      >
        <MaterialCommunityIcons name="magnify" size={20} color={colors.textFaint} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder={t('home_searchPlaceholder')}
          placeholderTextColor={colors.textFaint}
          value={q}
          onChangeText={onChangeQuery}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      <HomeFilterPills
        colors={colors}
        t={t}
        activeKey={filterKey}
        onChange={onFilterChange}
      />

      {navTipsVisible ? (
        <View
          style={[
            styles.tipsCard,
            {
              backgroundColor: colors.tipsBg,
              borderColor: colors.tipsBorder,
            },
          ]}
        >
          <Text style={[styles.tipsTitle, { color: colors.text }]}>{t('home_navTipsTitle')}</Text>
          <Text style={[styles.tipsLine, { color: colors.textSecondary }]}>
            {t('home_navTips1')}
          </Text>
          <Text style={[styles.tipsLine, { color: colors.textSecondary }]}>
            {t('home_navTips2')}
          </Text>
          <Text style={[styles.tipsLine, { color: colors.textSecondary }]}>
            {t('home_navTips3')}
          </Text>
          <Button
            mode="contained-tonal"
            compact
            onPress={onDismissNavTips}
            style={{ alignSelf: 'flex-start', marginTop: 10 }}
          >
            {t('home_navTipsDismiss')}
          </Button>
        </View>
      ) : null}

      {recentCustomers.length > 0 ? (
        <View style={styles.recentBlock}>
          <Text style={[styles.recentHeading, { color: colors.textFaint }]}>
            {t('home_recentHeading').toUpperCase()}
          </Text>
          <HomeRecentChips
            colors={colors}
            customers={recentCustomers}
            onPress={onRecentPress}
          />
        </View>
      ) : null}

      {error ? (
        <View style={styles.errBox}>
          <PaperText variant="bodyLarge" style={styles.err}>
            {error?.message || t('home_apiError')}
          </PaperText>
          <Button mode="contained-tonal" compact onPress={onRetry}>
            {t('home_errorRetry')}
          </Button>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12, paddingBottom: 4, paddingHorizontal: 16 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  logoBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: { flex: 1, minWidth: 0 },
  brandName: {
    fontFamily: font.extraBold,
    fontSize: 16,
    letterSpacing: -0.2,
  },
  brandDate: {
    fontFamily: font.medium,
    fontSize: 12,
    marginTop: 1,
  },
  topBarRight: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnGreen: {
    backgroundColor: '#1D9E75',
    borderColor: '#1D9E75',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: font.medium,
    fontSize: 14,
    padding: 0,
  },
  recentBlock: { gap: 8 },
  recentHeading: {
    fontFamily: font.semiBold,
    fontSize: 11,
    letterSpacing: 0.8,
  },
  tipsCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 14,
  },
  tipsTitle: {
    fontFamily: font.extraBold,
    fontSize: 14,
    marginBottom: 6,
  },
  tipsLine: {
    fontFamily: font.medium,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  errBox: { gap: 10, paddingVertical: 8 },
  err: { color: '#C62828' },
  pressed: { opacity: 0.88 },
});
