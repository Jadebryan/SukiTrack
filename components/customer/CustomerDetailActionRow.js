import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { font } from '@/constants/theme';

export function CustomerDetailActionRow({
  colors,
  t,
  onAddItem,
  onPay,
  payDisabled,
}) {
  return (
    <View style={styles.row}>
      <Pressable
        onPress={onAddItem}
        style={({ pressed }) => [
          styles.btn,
          styles.btnPrimary,
          { backgroundColor: colors.green600, borderColor: colors.green600 },
          pressed && styles.pressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={t('cd_addItem')}
      >
        <MaterialCommunityIcons name="plus-circle-outline" size={20} color="#FFFFFF" />
        <Text style={styles.btnPrimaryText}>{t('cd_addItem')}</Text>
      </Pressable>

      <Pressable
        onPress={onPay}
        disabled={payDisabled}
        style={({ pressed }) => [
          styles.btn,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
          payDisabled && styles.disabled,
          pressed && !payDisabled && styles.pressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={t('cd_pay')}
      >
        <MaterialCommunityIcons
          name="cash"
          size={20}
          color={payDisabled ? colors.textFaint : colors.green700}
        />
        <Text
          style={[
            styles.btnSecondaryText,
            { color: payDisabled ? colors.textFaint : colors.green700 },
          ]}
        >
          {t('cd_pay')}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  btnPrimary: {},
  btnPrimaryText: {
    fontFamily: font.semiBold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  btnSecondaryText: {
    fontFamily: font.semiBold,
    fontSize: 14,
  },
  pressed: { opacity: 0.88 },
  disabled: { opacity: 0.45 },
});
