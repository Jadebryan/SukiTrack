import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import ProductImage from '@/components/ProductImage';
import { font } from '@/constants/theme';
import { formatPeso } from '@/utils/currency';

function CustomerUtangLineRowInner({
  colors,
  title,
  subtitle,
  amount,
  thumbUri,
  fallbackIcon = 'cube-outline',
  onEdit,
  onDelete,
  editA11y,
  deleteA11y,
  readOnly,
}) {
  return (
    <View
      style={[
        styles.wrap,
        { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
      ]}
    >
      <View style={[styles.thumb, { borderColor: colors.border }]}>
        {thumbUri ? (
          <ProductImage uri={thumbUri} size={44} style={styles.thumbImg} />
        ) : (
          <MaterialCommunityIcons
            name={fallbackIcon}
            size={22}
            color={colors.textFaint}
          />
        )}
      </View>

      <View style={styles.info}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.sub, { color: colors.textFaint }]} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View style={styles.right}>
        <Text style={[styles.amount, { color: colors.text }]}>{formatPeso(amount)}</Text>
        {!readOnly ? (
          <View style={styles.actions}>
            <Pressable
              onPress={onEdit}
              hitSlop={8}
              style={({ pressed }) => [styles.iconHit, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={editA11y}
            >
              <MaterialCommunityIcons
                name="pencil-outline"
                size={20}
                color={colors.textSecondary}
              />
            </Pressable>
            <Pressable
              onPress={onDelete}
              hitSlop={8}
              style={({ pressed }) => [styles.iconHit, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={deleteA11y}
            >
              <MaterialCommunityIcons name="trash-can-outline" size={20} color={colors.red800} />
            </Pressable>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const CustomerUtangLineRow = memo(CustomerUtangLineRowInner);
export default CustomerUtangLineRow;

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbImg: { width: 44, height: 44 },
  info: { flex: 1, minWidth: 0, gap: 2 },
  title: {
    fontFamily: font.semiBold,
    fontSize: 14,
    lineHeight: 18,
  },
  sub: {
    fontFamily: font.medium,
    fontSize: 12,
    lineHeight: 16,
  },
  right: { alignItems: 'flex-end', gap: 4 },
  amount: {
    fontFamily: font.semiBold,
    fontSize: 14,
  },
  actions: { flexDirection: 'row', gap: 2 },
  iconHit: { padding: 4 },
  pressed: { opacity: 0.85 },
});
