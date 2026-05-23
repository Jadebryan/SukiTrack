import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { font } from '@/constants/theme';

function ProfileField({ colors, label, value, emptyLabel }) {
  const display = value?.trim() ? value.trim() : emptyLabel;
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLbl, { color: colors.textFaint }]}>{label}</Text>
      <Text style={[styles.fieldVal, { color: colors.text }]}>{display}</Text>
    </View>
  );
}

export function CustomerDetailProfileCard({ colors, t, customer, onEdit }) {
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.cardBg, borderColor: colors.border },
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{t('cd_profileTitle')}</Text>
        <Pressable
          onPress={onEdit}
          style={({ pressed }) => [
            styles.editBtn,
            { borderColor: colors.border, backgroundColor: colors.chipBg },
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('cd_editDetails')}
        >
          <MaterialCommunityIcons name="pencil-outline" size={16} color={colors.green600} />
          <Text style={[styles.editText, { color: colors.green700 }]}>{t('cd_editDetails')}</Text>
        </Pressable>
      </View>

      <ProfileField
        colors={colors}
        label={t('cd_profileName')}
        value={customer.name}
        emptyLabel={t('cd_profileEmpty')}
      />
      <ProfileField
        colors={colors}
        label={t('cd_profilePhone')}
        value={customer.phone}
        emptyLabel={t('cd_profileEmpty')}
      />
      <ProfileField
        colors={colors}
        label={t('cd_profileAddress')}
        value={customer.address}
        emptyLabel={t('cd_profileEmpty')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  title: {
    fontFamily: font.semiBold,
    fontSize: 15,
    flex: 1,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  editText: {
    fontFamily: font.medium,
    fontSize: 12,
  },
  field: { marginTop: 10 },
  fieldLbl: {
    fontFamily: font.medium,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  fieldVal: {
    fontFamily: font.medium,
    fontSize: 15,
    marginTop: 3,
    lineHeight: 20,
  },
  pressed: { opacity: 0.88 },
});
