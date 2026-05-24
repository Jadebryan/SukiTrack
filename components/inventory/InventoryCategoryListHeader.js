import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Text as PaperText } from 'react-native-paper';
import { font } from '@/constants/theme';

/**
 * Category product list chrome: back + title, search, toolbar hint + select toggle.
 */
export function InventoryCategoryListHeader({
  colors,
  t,
  error,
  title,
  q,
  onChangeQuery,
  onBack,
  showUncategorizeAll,
  onUncategorizeAll,
  uncategorizeDisabled,
  selectionMode,
  selectedCount,
  showSelectButton,
  showSelectAll,
  allSelected,
  onToggleSelectMode,
  onSelectAll,
  onAddProduct,
  showAddButton,
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.topBar}>
        <Pressable
          onPress={onBack}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={t('nav_back')}
        >
          <MaterialCommunityIcons name="chevron-left" size={26} color={colors.green600} />
          <Text style={[styles.backText, { color: colors.green600 }]}>{t('nav_back')}</Text>
        </Pressable>

        <View style={styles.topCenter}>
          <Text style={[styles.topTitle, { color: colors.text }]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[styles.topCrumb, { color: colors.textFaint }]} numberOfLines={1}>
            {t('tab_inventory')} · {title}
          </Text>
        </View>

        {showUncategorizeAll ? (
          <Pressable
            onPress={onUncategorizeAll}
            disabled={uncategorizeDisabled}
            style={({ pressed }) => [
              styles.uncatBtn,
              pressed && !uncategorizeDisabled && styles.pressed,
              uncategorizeDisabled && styles.disabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('inv_bulkUncatHeader')}
          >
            <Text style={[styles.uncatText, { color: colors.red800 }]} numberOfLines={2}>
              {t('inv_bulkUncatHeader')}
            </Text>
          </Pressable>
        ) : (
          <View style={styles.uncatPlaceholder} />
        )}
      </View>

      {error ? (
        <PaperText variant="bodySmall" style={styles.err}>
          {error?.message || t('common_error')}
        </PaperText>
      ) : null}

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

      <View style={styles.toolbar}>
        <Text style={[styles.hint, { color: colors.textFaint }]}>
          {selectionMode
            ? t('inv_catBulkSelectedHint', { count: selectedCount })
            : t('inv_catRowHint')}
        </Text>
        <View style={styles.toolbarActions}>
          {showAddButton ? (
            <Pressable
              onPress={onAddProduct}
              style={({ pressed }) => [
                styles.addBtn,
                {
                  backgroundColor: colors.green600,
                  borderColor: colors.green600,
                },
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={t('inv_add')}
            >
              <MaterialCommunityIcons name="plus" size={18} color="#FFFFFF" />
              <Text style={styles.addBtnText}>{t('inv_add')}</Text>
            </Pressable>
          ) : null}
          {selectionMode && showSelectAll ? (
            <Pressable
              onPress={onSelectAll}
              style={({ pressed }) => [
                styles.selectBtn,
                {
                  backgroundColor: colors.green50,
                  borderColor: colors.green100,
                },
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={
                allSelected ? t('inv_deselectAll') : t('inv_selectAll')
              }
            >
              <Text style={[styles.selectBtnText, { color: colors.green700 }]}> 
                {allSelected ? t('inv_deselectAll') : t('inv_selectAll')}
              </Text>
            </Pressable>
          ) : null}
          {showSelectButton ? (
            <Pressable
              onPress={onToggleSelectMode}
              style={({ pressed }) => [
                styles.selectBtn,
                {
                  backgroundColor: selectionMode ? colors.green600 : colors.green50,
                  borderColor: selectionMode ? colors.green600 : colors.green100,
                },
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={t('inv_bulkSelect')}
            >
              <MaterialCommunityIcons
                name={selectionMode ? 'check' : 'checkbox-blank-outline'}
                size={16}
                color={selectionMode ? '#FFFFFF' : colors.green700}
              />
              <Text
                style={[
                  styles.selectBtnText,
                  { color: selectionMode ? '#FFFFFF' : colors.green700 },
                ]}
              >
                {selectionMode ? t('cp_doneBtn') : t('inv_bulkSelect')}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 72,
    marginLeft: -6,
  },
  backText: {
    fontFamily: font.medium,
    fontSize: 14,
    marginLeft: -4,
  },
  topCenter: {
    flex: 1,
    alignItems: 'center',
    minWidth: 0,
  },
  topTitle: {
    fontFamily: font.semiBold,
    fontSize: 16,
  },
  topCrumb: {
    fontFamily: font.medium,
    fontSize: 11,
    marginTop: 1,
  },
  uncatBtn: {
    minWidth: 72,
    maxWidth: 100,
    alignItems: 'flex-end',
  },
  uncatPlaceholder: { width: 72 },
  uncatText: {
    fontFamily: font.medium,
    fontSize: 12,
    textAlign: 'right',
  },
  err: { color: '#C62828', marginBottom: 8 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: font.medium,
    fontSize: 14,
    padding: 0,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  hint: {
    flex: 1,
    fontFamily: font.medium,
    fontSize: 12,
  },
  selectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  selectBtnText: {
    fontFamily: font.medium,
    fontSize: 13,
  },
  toolbarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  addBtnText: {
    fontFamily: font.medium,
    fontSize: 13,
    color: '#FFFFFF',
  },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.45 },
});
