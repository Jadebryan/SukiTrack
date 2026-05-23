import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Portal } from 'react-native-paper';
import { font } from '@/constants/theme';

function ActionRow({ icon, iconBg, iconColor, label, labelColor, colors, onPress, destructive }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
    >
      <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
        <MaterialCommunityIcons name={icon} size={20} color={iconColor} />
      </View>
      <Text
        style={[
          styles.rowLabel,
          { color: labelColor || (destructive ? colors.red800 : colors.text) },
        ]}
        numberOfLines={2}
      >
        {label}
      </Text>
      <MaterialCommunityIcons
        name="chevron-right"
        size={18}
        color={colors.textFaint}
      />
    </Pressable>
  );
}

/**
 * Custom header action menu (replaces Paper Menu) — matches Home / hub card styling.
 */
export function CustomerDetailActionsMenu({
  visible,
  colors,
  t,
  anchor,
  onClose,
  onEdit,
  onDelete,
  onClearRecords,
}) {
  if (!visible || !anchor) return null;

  const top = anchor.y + anchor.height + 6;
  const right = Math.max(12, anchor.screenWidth - anchor.x - anchor.width);

  return (
    <Portal>
      <Pressable
        style={styles.scrim}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={t('common_cancel')}
      />
      <View
        style={[
          styles.card,
          {
            top,
            right,
            backgroundColor: colors.cardBg,
            borderColor: colors.border,
            shadowColor: '#000',
          },
        ]}
      >
        <ActionRow
          colors={colors}
          icon="pencil-outline"
          iconBg={colors.green50}
          iconColor={colors.green700}
          label={t('cd_editTitle')}
          onPress={() => {
            onClose();
            onEdit();
          }}
        />

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <ActionRow
          colors={colors}
          icon="delete-outline"
          iconBg={colors.red50}
          iconColor={colors.red800}
          label={t('cd_deleteConfirm')}
          destructive
          onPress={() => {
            onClose();
            onDelete();
          }}
        />
        <ActionRow
          colors={colors}
          icon="broom"
          iconBg={colors.red50}
          iconColor={colors.red800}
          label={t('cd_clearRecords')}
          destructive
          onPress={() => {
            onClose();
            onClearRecords();
          }}
        />
      </View>
    </Portal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  card: {
    position: 'absolute',
    minWidth: 220,
    maxWidth: 280,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 6,
    paddingHorizontal: 6,
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    flex: 1,
    fontFamily: font.medium,
    fontSize: 14,
    lineHeight: 18,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 8,
    marginVertical: 4,
  },
  pressed: { opacity: 0.88 },
});
