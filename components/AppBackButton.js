import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

/** Matches SukiTrack auth headers (`OnboardingHeader`, register / PIN flows). */
export const APP_BACK_BUTTON_SIZE = 36;

const GREEN_MID = '#2d8a4e';
const BG = '#e8f7ee';

const layout = {
  width: APP_BACK_BUTTON_SIZE,
  height: APP_BACK_BUTTON_SIZE,
  borderRadius: 12,
  backgroundColor: BG,
  alignItems: 'center',
  justifyContent: 'center',
};

export function AppBackButton({ onPress, accessibilityLabel, style }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        { opacity: pressed ? 0.85 : 1 },
        style,
      ]}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <MaterialCommunityIcons name="chevron-left" size={22} color={GREEN_MID} />
    </Pressable>
  );
}

/** Same outer size as `AppBackButton` for title centering; no visible chrome. */
export function AppBackButtonPlaceholder() {
  return <View style={styles.placeholder} pointerEvents="none" />;
}

const styles = StyleSheet.create({
  btn: layout,
  placeholder: {
    width: APP_BACK_BUTTON_SIZE,
    height: APP_BACK_BUTTON_SIZE,
  },
});
