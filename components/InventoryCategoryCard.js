import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import React, { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { getCategoryStickerVisual } from '@/constants/inventoryCategoryStickers';
import { font } from '@/constants/theme';
import { useLocale } from '@/contexts/LocaleContext';

function cardVariant(cardKey) {
  if (String(cardKey).includes('inv_cat_groceries')) return 'green';
  if (String(cardKey).includes('inv_cat_snacks')) return 'amber';
  return 'default';
}

function InventoryCategoryCardInner({
  card,
  colW,
  stickerOverride,
  ownerId,
  onRemovePress,
  colors,
}) {
  const router = useRouter();
  const { t } = useLocale();
  const visual = getCategoryStickerVisual(card.key, card.title, stickerOverride);
  const variant = cardVariant(card.key);
  const isGreen = variant === 'green';
  const isAmber = variant === 'amber';

  const cardBg = isGreen
    ? colors.cardGreenBg
    : isAmber
      ? colors.cardAmberBg
      : colors.cardDefault;
  const cardBorder = isGreen
    ? colors.cardGreenBorder
    : isAmber
      ? colors.cardAmberBorder
      : colors.border;
  const countColor = isAmber ? colors.amber700 : colors.green700;
  const iconBadgeBg = isAmber ? colors.amber100 : colors.green100;
  const iconColor = isAmber ? colors.amber700 : colors.green700;
  const titleColor = isGreen || isAmber ? colors.text : colors.text;
  const subColor = colors.textFaint;

  const isRemovableCategory =
    Boolean(ownerId) &&
    card.key !== '_' &&
    (String(card.key).startsWith('c-') ||
      (String(card.key).startsWith('p-') && card.count > 0));

  return (
    <Pressable
      onPress={() => router.push(`/inventory/${encodeURIComponent(card.slug)}`)}
      style={[styles.cell, { width: colW }]}
    >
      <View
        style={[
          styles.card,
          {
            backgroundColor: cardBg,
            borderColor: cardBorder,
          },
        ]}
      >
        {isRemovableCategory ? (
          <Pressable
            onPress={() =>
              onRemovePress({
                title: card.title,
                key: card.key,
                productCount: card.count,
              })
            }
            hitSlop={8}
            style={styles.deleteBtn}
            accessibilityRole="button"
            accessibilityLabel={t('inv_removeCategoryA11y', { name: card.title })}
          >
            <MaterialCommunityIcons
              name="trash-can-outline"
              size={16}
              color={colors.textFaint}
            />
          </Pressable>
        ) : null}

        <View style={[styles.iconBadge, { backgroundColor: iconBadgeBg }]}>
          <MaterialCommunityIcons name={visual.icon} size={20} color={iconColor} />
        </View>

        <Text style={[styles.catName, { color: titleColor }]} numberOfLines={2}>
          {card.title}
        </Text>
        <Text style={[styles.catCount, { color: countColor }]}>{card.count}</Text>
        <Text style={[styles.catSub, { color: subColor }]}>
          {t('inv_hubProductCount', { count: card.count })}
        </Text>
      </View>
    </Pressable>
  );
}

const InventoryCategoryCard = memo(InventoryCategoryCardInner);
export default InventoryCategoryCard;

const styles = StyleSheet.create({
  cell: { marginBottom: 0 },
  card: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    minHeight: 140,
    position: 'relative',
    gap: 6,
  },
  deleteBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 2,
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catName: {
    fontFamily: font.semiBold,
    fontSize: 14,
    marginTop: 2,
  },
  catCount: {
    fontFamily: font.extraBold,
    fontSize: 24,
    lineHeight: 28,
    marginTop: 2,
  },
  catSub: {
    fontFamily: font.medium,
    fontSize: 12,
    marginTop: -2,
  },
});
