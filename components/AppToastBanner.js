import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from 'react-native-paper';
import { font } from '@/constants/theme';

/**
 * Solid “banner” toast: colored bar, white type + chrome, optional outline action + divider (design ref).
 * @param {{
 *   type: 'success' | 'info' | 'warning' | 'error',
 *   message: string,
 *   onDismiss: () => void,
 *   isDark?: boolean,
 *   actionLabel?: string | null,
 *   onActionPress?: (() => void) | null,
 * }} props
 */
export function AppToastBanner({
  type,
  message,
  onDismiss,
  isDark = false,
  actionLabel,
  onActionPress,
  durationMs = null,
}) {
  const theme = useTheme();
  const tone = TONE[type] || TONE.info;
  const showAction = Boolean(actionLabel && String(actionLabel).trim() && onActionPress);

  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    progress.setValue(0);
    const ms = Number.isFinite(Number(durationMs)) && durationMs > 0 ? durationMs : 3800;
    Animated.timing(progress, {
      toValue: 1,
      duration: ms,
      useNativeDriver: false,
    }).start();
    return () => progress.stopAnimation();
  }, [progress, durationMs, message]);

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.outer]} accessibilityRole="alert">
      <View style={[styles.card, { backgroundColor: theme.colors.surface }]}> 
        <View style={[styles.accent, { backgroundColor: tone.accent }]} />
        <View style={styles.contentRow}>
          <View style={[styles.iconBubble, { backgroundColor: tone.accent }]}> 
            <MaterialCommunityIcons name={tone.icon} size={18} color="#fff" />
          </View>
          <Text style={[styles.msg, { color: theme.colors.onSurface }]} numberOfLines={3}>
            {message}
          </Text>
          {showAction ? (
            <Pressable onPress={onActionPress} style={styles.actionBtn} accessibilityRole="button">
              <Text style={[styles.actionText, { color: tone.accent }]}>{actionLabel}</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={onDismiss} hitSlop={12} accessibilityRole="button" accessibilityLabel="Dismiss" style={styles.closeBtn}>
            <MaterialCommunityIcons name="close" size={18} color={theme.colors.onSurface} />
          </Pressable>
        </View>
        <Animated.View style={[styles.progress, { backgroundColor: tone.accent, width: progressWidth }]} />
      </View>
    </View>
  );
}

/** Medium-saturation fills (readable white text at ~15:1 on bar). */
const TONE = {
  success: { accent: '#16a34a', icon: 'check' },
  info: { accent: '#2563eb', icon: 'information' },
  warning: { accent: '#f97316', icon: 'alert' },
  error: { accent: '#ef4444', icon: 'alert' },
};

const ICON = 36;

const styles = StyleSheet.create({
  outer: { paddingVertical: 4 },
  card: {
    flexDirection: 'column',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
  },
  accent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 6 },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingLeft: 16,
    paddingRight: 12,
    gap: 12,
  },
  iconBubble: {
    width: ICON,
    height: ICON,
    borderRadius: ICON / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  msg: {
    flex: 1,
    minWidth: 0,
    fontFamily: font.semiBold,
    fontSize: 15,
    lineHeight: 20,
  },
  actionBtn: { paddingHorizontal: 8, paddingVertical: 6 },
  actionText: { fontFamily: font.semiBold, fontSize: 13 },
  closeBtn: { padding: 6 },
  progress: { height: 3, width: '0%', alignSelf: 'stretch' },
});
