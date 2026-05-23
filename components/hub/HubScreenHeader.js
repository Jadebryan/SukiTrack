import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { font } from '@/constants/theme';

/**
 * Hub-style screen title row (Home / Inventory / Reports / Settings).
 */
export function HubScreenHeader({
  colors,
  title,
  rightIcon,
  onRightPress,
  rightA11y,
  rightLoading,
}) {
  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
        {title}
      </Text>
      {rightIcon ? (
        <Pressable
          onPress={onRightPress}
          disabled={rightLoading}
          style={({ pressed }) => [
            styles.iconBtn,
            {
              backgroundColor: colors.iconBtnBg,
              borderColor: colors.border,
            },
            pressed && !rightLoading && styles.pressed,
            rightLoading && styles.disabled,
          ]}
          accessibilityRole="button"
          accessibilityLabel={rightA11y}
        >
          <MaterialCommunityIcons
            name={rightIcon}
            size={20}
            color={rightLoading ? colors.textFaint : colors.textSecondary}
          />
        </Pressable>
      ) : (
        <View style={styles.iconSpacer} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: {
    flex: 1,
    fontFamily: font.semiBold,
    fontSize: 22,
    letterSpacing: -0.3,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSpacer: { width: 40, height: 40 },
  pressed: { opacity: 0.88 },
  disabled: { opacity: 0.5 },
});
