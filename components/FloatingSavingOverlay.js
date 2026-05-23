import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Portal } from 'react-native-paper';
import { useFloatingBannerLayout } from '@/hooks/useFloatingBannerLayout';

/**
 * Renders children in a Portal below the nav header — does not affect layout flow.
 */
export default function FloatingSavingOverlay({ visible, children }) {
  const hostStyle = useFloatingBannerLayout();

  if (!visible) {
    return null;
  }

  return (
    <Portal>
      <View pointerEvents="box-none" style={[styles.host, hostStyle]}>
        <View style={styles.shadowWrap}>{children}</View>
      </View>
    </Portal>
  );
}

const styles = StyleSheet.create({
  host: {
    pointerEvents: 'box-none',
  },
  shadowWrap: {
    width: '100%',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 12,
  },
});
