import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';

/**
 * Full-screen form: ScrollView + extra bottom padding when keyboard is open so fields stay scrollable.
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {boolean} [props.centerVertically] — justifyContent center when keyboard closed
 * @param {import('react-native').StyleProp<import('react-native').ViewStyle>} [props.contentContainerStyle]
 * @param {number} [props.extraBottomPad]
 * @param {import('react-native').ScrollViewProps} [props.scrollViewProps]
 * @param {import('react-native').StyleProp<import('react-native').ViewStyle>} [props.style] — KeyboardAvoidingView
 */
export function KeyboardAwareFormScreen({
  children,
  centerVertically = false,
  contentContainerStyle,
  extraBottomPad = 32,
  scrollViewProps = {},
  style,
}) {
  const keyboardPad = useKeyboardHeight(true);
  const insets = useSafeAreaInsets();
  const bottomPad =
    Math.max(keyboardPad, 0) + extraBottomPad + Math.max(insets.bottom, 8);

  return (
    <KeyboardAvoidingView
      style={[styles.flex, style]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.scrollContent,
          centerVertically && styles.scrollCentered,
          contentContainerStyle,
          { paddingBottom: bottomPad },
        ]}
        {...scrollViewProps}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
  },
  scrollCentered: {
    justifyContent: 'center',
  },
});
