import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import ProductImage from '@/components/ProductImage';
import { font } from '@/constants/theme';
import { useLocale } from '@/contexts/LocaleContext';
import { formatPeso } from '@/utils/currency';

function hasPrice(it) {
  return it.unitPrice != null && Number.isFinite(Number(it.unitPrice));
}

function InventoryCategoryProductRowInner({
  item,
  colors,
  selectionMode,
  selected,
  onPress,
  onToggleSelect,
  onLongPress,
}) {
  const { t } = useLocale();
  const priced = hasPrice(item);

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.wrap,
        {
          backgroundColor: colors.surface,
          borderColor: selected ? colors.green600 : colors.border,
        },
        pressed && styles.pressed,
        selected && { borderWidth: 1 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={t('inv_editA11y')}
    >
      {selectionMode ? (
        <Pressable
          onPress={onToggleSelect}
          hitSlop={8}
          style={styles.checkHit}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: selected }}
        >
          <MaterialCommunityIcons
            name={selected ? 'checkbox-marked' : 'checkbox-blank-outline'}
            size={24}
            color={selected ? colors.green600 : colors.textFaint}
          />
        </Pressable>
      ) : null}

      <View style={[styles.thumb, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
        <ProductImage
          uri={item.imageLocalUri || item.imageUrl}
          size={48}
          style={styles.thumbImg}
        />
      </View>

      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={[styles.priceLine, { color: colors.textSecondary }]}>
          {priced ? (
            <>
              {t('inv_suggestedPrefix')}:{' '}
              <Text style={[styles.priceVal, { color: colors.green600 }]}>
                {formatPeso(item.unitPrice)}
              </Text>
            </>
          ) : (
            t('inv_noDefaultPrice')
          )}
        </Text>
      </View>

      {!selectionMode ? (
        <MaterialCommunityIcons
          name="chevron-right"
          size={22}
          color={colors.textFaint}
        />
      ) : null}
    </Pressable>
  );
}

/** @param {object} props.item */
const InventoryCategoryProductRow = memo(InventoryCategoryProductRowInner);
export default InventoryCategoryProductRow;

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  pressed: { opacity: 0.88 },
  checkHit: { marginRight: -4 },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  thumbImg: { width: 48, height: 48 },
  info: { flex: 1, minWidth: 0, gap: 3 },
  name: {
    fontFamily: font.semiBold,
    fontSize: 14,
    lineHeight: 18,
  },
  priceLine: {
    fontFamily: font.medium,
    fontSize: 13,
  },
  priceVal: {
    fontFamily: font.semiBold,
  },
});
