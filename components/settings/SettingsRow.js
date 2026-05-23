import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { font } from '@/constants/theme';

function RowIcon({ name, bg, color }) {
  return (
    <View style={[styles.rowIcon, { backgroundColor: bg }]}>
      <MaterialCommunityIcons name={name} size={18} color={color} />
    </View>
  );
}

export function SettingsRow({
  colors,
  icon,
  iconBg,
  iconColor,
  title,
  subtitle,
  danger,
  right,
  onPress,
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole={onPress ? 'button' : undefined}
    >
      <RowIcon name={icon} bg={iconBg} color={iconColor} />
      <View style={styles.rowText}>
        <Text
          style={[
            styles.rowTitle,
            { color: danger ? colors.red800 : colors.text },
          ]}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.rowSub, { color: colors.textFaint }]}>{subtitle}</Text>
        ) : null}
      </View>
      {right || (
        <MaterialCommunityIcons
          name="chevron-right"
          size={18}
          color={colors.textFaint}
        />
      )}
    </Pressable>
  );
}

export function SettingsGroup({ colors, children }) {
  return (
    <View
      style={[
        styles.group,
        { backgroundColor: colors.cardBg, borderColor: colors.border },
      ]}
    >
      {children}
    </View>
  );
}

export function SettingsDivider({ colors }) {
  return (
    <View style={[styles.div, { backgroundColor: colors.border }]} />
  );
}

const styles = StyleSheet.create({
  group: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  div: { height: StyleSheet.hairlineWidth },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, minWidth: 0 },
  rowTitle: {
    fontFamily: font.semiBold,
    fontSize: 14,
  },
  rowSub: {
    fontFamily: font.medium,
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  pressed: { opacity: 0.88 },
});
