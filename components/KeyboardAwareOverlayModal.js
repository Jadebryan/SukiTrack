import React, { useMemo } from 'react';
import {
  Modal as RNModal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Surface, useTheme } from 'react-native-paper';
import { overlaySheet } from '@/constants/theme';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';

/**
 * Full-screen overlay modal: centered when keyboard is closed; pins above keyboard when open.
 * Renders a Surface and passes scroll/content max height via render prop.
 *
 * @param {object} props
 * @param {boolean} props.visible
 * @param {() => void} props.onDismiss
 * @param {boolean} [props.dismissable]
 * @param {(opts: { sheetMaxHeight: number }) => React.ReactNode} props.renderContent
 * @param {number} [props.maxSheetHeightRatio]
 * @param {number} [props.maxSheetHeightCap]
 * @param {number} [props.keyboardGap]
 */
export function KeyboardAwareOverlayModal({
  visible,
  onDismiss,
  dismissable = true,
  renderContent,
  maxSheetHeightRatio = 0.85,
  maxSheetHeightCap = 520,
  keyboardGap = 10,
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height: winH } = useWindowDimensions();
  const keyboardPad = useKeyboardHeight(visible);

  const modalMaxHeight = Math.min(winH * maxSheetHeightRatio, maxSheetHeightCap);
  const sheetMaxHeight = useMemo(() => {
    if (!keyboardPad) return modalMaxHeight;
    const topReserve = Math.max(insets.top, 0) + 12;
    const cap = winH - keyboardPad - keyboardGap - topReserve;
    return Math.max(220, Math.min(modalMaxHeight, cap));
  }, [keyboardPad, modalMaxHeight, winH, insets.top, keyboardGap]);

  const onBackdropPress = () => {
    if (dismissable) onDismiss();
  };

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={dismissable ? onDismiss : undefined}
    >
      <View style={styles.root}>
        <Pressable
          style={[
            styles.dim,
            { backgroundColor: theme.colors.backdrop ?? 'rgba(0,0,0,0.5)' },
          ]}
          onPress={onBackdropPress}
          disabled={!dismissable}
        />
        {keyboardPad > 0 ? (
          <View
            style={[styles.aboveKeyboard, { bottom: keyboardPad + keyboardGap }]}
            pointerEvents="box-none"
          >
            <Surface
              elevation={overlaySheet.elevation}
              style={[
                styles.sheet,
                {
                  backgroundColor: theme.colors.surface,
                  maxHeight: sheetMaxHeight,
                  borderRadius: overlaySheet.borderRadius,
                },
              ]}
            >
              {renderContent({ sheetMaxHeight })}
            </Surface>
          </View>
        ) : (
          <View style={styles.centered} pointerEvents="box-none">
            <Surface
              elevation={overlaySheet.elevation}
              style={[
                styles.sheet,
                {
                  backgroundColor: theme.colors.surface,
                  maxHeight: sheetMaxHeight,
                  borderRadius: overlaySheet.borderRadius,
                },
              ]}
            >
              {renderContent({ sheetMaxHeight })}
            </Surface>
          </View>
        )}
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  dim: { ...StyleSheet.absoluteFillObject },
  centered: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  aboveKeyboard: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  sheet: {
    overflow: 'hidden',
    alignSelf: 'center',
    width: '100%',
    maxWidth: overlaySheet.maxWidth,
  },
});
