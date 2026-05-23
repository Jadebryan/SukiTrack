import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Text as PaperText } from 'react-native-paper';
import { EmptyState } from '@/components/EmptyState';
import { font } from '@/constants/theme';

function StatPill({ icon, value, label, colors, onPress, selected }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.statPill,
        {
          backgroundColor: selected ? colors.green50 : colors.statPillBg,
          borderColor: selected ? colors.green600 : colors.border,
        },
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
    >
      <MaterialCommunityIcons name={icon} size={16} color={colors.green600} />
      <Text style={[styles.statPillText, { color: colors.textSecondary }]}>
        <Text style={[styles.statPillBold, { color: colors.text }]}>{value}</Text> {label}
      </Text>
    </Pressable>
  );
}

/**
 * Inventory hub chrome: top bar, search, catalog overview, section header, optional search hits title.
 */
export function InventoryHubListHeader({
  colors,
  t,
  error,
  q,
  onChangeQuery,
  productCount,
  typeCount,
  hideEmptyTypes,
  hasSearch,
  onToggleFilter,
  onProductPillPress,
  onTypesPillPress,
  onNewCategory,
  onAddProduct,
  showNewCategory,
  showSearchResultsTitle,
  showEmptyCatalog,
  showEmptySearchTypes,
}) {
  return (
    <View style={styles.wrap}>
      {error ? (
        <PaperText variant="bodySmall" style={styles.err}>
          {error?.message || t('common_error')}
        </PaperText>
      ) : null}

      <View style={styles.topBar}>
        <Text style={[styles.topBarTitle, { color: colors.text }]}>{t('tab_inventory')}</Text>
        <View style={styles.topBarRight}>
          <Pressable
            onPress={onToggleFilter}
            style={({ pressed }) => [
              styles.iconBtn,
              {
                backgroundColor: colors.iconBtnBg,
                borderColor: colors.border,
              },
              hideEmptyTypes && !hasSearch && styles.iconBtnActive,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('inv_hubChipTypesA11y')}
          >
            <MaterialCommunityIcons
              name="tune-variant"
              size={20}
              color={hideEmptyTypes && !hasSearch ? colors.green600 : colors.textSecondary}
            />
          </Pressable>
          <Pressable
            onPress={onAddProduct}
            style={({ pressed }) => [
              styles.iconBtn,
              styles.iconBtnPrimary,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('inv_hubPlusUncatA11y')}
          >
            <MaterialCommunityIcons name="plus" size={22} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      <View
        style={[
          styles.searchBar,
          { backgroundColor: colors.searchBg, borderColor: colors.border },
        ]}
      >
        <MaterialCommunityIcons name="magnify" size={20} color={colors.textFaint} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder={t('inv_searchPlaceholder')}
          placeholderTextColor={colors.textFaint}
          value={q}
          onChangeText={onChangeQuery}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      <View
        style={[
          styles.overviewCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <View style={styles.overviewTop}>
          <View style={styles.overviewText}>
            <Text style={[styles.overviewLabel, { color: colors.textSecondary }]}>
              {t('inv_hubStatsTitle')}
            </Text>
            <Text style={[styles.overviewTitle, { color: colors.text }]}>
              {t('inv_hubOverviewSummary', {
                products: productCount,
                types: typeCount,
              })}
            </Text>
          </View>
          {showNewCategory ? (
            <Pressable
              onPress={onNewCategory}
              style={({ pressed }) => [
                styles.newCatBtn,
                {
                  backgroundColor: colors.newCatBtnBg,
                  borderColor: colors.newCatBtnBorder,
                },
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={t('inv_newCategoryBtn')}
            >
              <MaterialCommunityIcons name="folder-plus-outline" size={16} color={colors.green700} />
              <Text style={[styles.newCatLabel, { color: colors.green700 }]}>{t('inv_newCategoryShort')}</Text>
            </Pressable>
          ) : null}
        </View>
        <View style={styles.statsRow}>
          <StatPill
            icon="package-variant"
            value={productCount}
            label={t('inv_hubProductsLabel')}
            colors={colors}
            onPress={onProductPillPress}
          />
          <StatPill
            icon="tag-outline"
            value={typeCount}
            label={t('inv_hubTypesLabel')}
            colors={colors}
            onPress={onTypesPillPress}
            selected={hideEmptyTypes && !hasSearch}
          />
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.textFaint }]}>
          {t('inv_hubPresetsSection').toUpperCase()}
        </Text>
        <Text style={[styles.sectionHint, { color: colors.textFaint }]}>
          {t('inv_hubSectionHint')}
        </Text>
      </View>

      {showEmptyCatalog ? (
        <EmptyState
          icon="shape-outline"
          title={t('inv_hubEmptyTitle')}
          subtitle={t('inv_hubEmptySubtitle')}
        />
      ) : null}

      {showEmptySearchTypes ? (
        <EmptyState
          icon="magnify"
          title={t('inv_emptySearchTitle')}
          subtitle={t('inv_emptySearchSubtitle')}
        />
      ) : null}

      {showSearchResultsTitle ? (
        <Text style={[styles.searchResultsTitle, { color: colors.text }]}>
          {t('inv_hubSearchResultsTitle')}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12, paddingBottom: 4 },
  err: { color: '#C62828', marginBottom: 4 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  topBarTitle: {
    fontFamily: font.extraBold,
    fontSize: 20,
    letterSpacing: -0.3,
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
  iconBtnActive: {
    borderWidth: 1,
  },
  iconBtnPrimary: {
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
  overviewCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  overviewTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  overviewText: { flex: 1, minWidth: 0 },
  overviewLabel: {
    fontFamily: font.medium,
    fontSize: 13,
    marginBottom: 2,
  },
  overviewTitle: {
    fontFamily: font.semiBold,
    fontSize: 15,
    lineHeight: 20,
  },
  newCatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  newCatLabel: {
    fontFamily: font.semiBold,
    fontSize: 13,
  },
  statsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statPillText: { fontFamily: font.medium, fontSize: 13 },
  statPillBold: { fontFamily: font.semiBold },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
    marginTop: 4,
  },
  sectionTitle: {
    fontFamily: font.semiBold,
    fontSize: 11,
    letterSpacing: 0.8,
  },
  sectionHint: {
    fontFamily: font.medium,
    fontSize: 12,
  },
  searchResultsTitle: {
    fontFamily: font.extraBold,
    fontSize: 15,
    marginBottom: 4,
  },
  pressed: { opacity: 0.88 },
});
