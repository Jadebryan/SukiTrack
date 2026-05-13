import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
}) {
  const tone = TONE[type] || TONE.info;
  const bar = isDark ? tone.barDark : tone.barLight;
  const showAction =
    Boolean(actionLabel && String(actionLabel).trim() && onActionPress);

  return (
    <View
      style={[styles.wrap, { backgroundColor: bar }]}
      accessibilityRole="alert"
    >
      <View style={styles.iconBubble}>
        <MaterialCommunityIcons name={tone.icon} size={20} color="#ffffff" />
      </View>
      <Text style={styles.msg} numberOfLines={5}>
        {message}
      </Text>
      {showAction ? (
        <>
          <Pressable
            onPress={onActionPress}
            style={({ pressed }) => [
              styles.actionPill,
              pressed && styles.actionPillPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
          >
            <Text style={styles.actionText}>{actionLabel}</Text>
          </Pressable>
          <View style={styles.divider} />
        </>
      ) : null}
      <Pressable
        onPress={onDismiss}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
        style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7 }]}
      >
        <MaterialCommunityIcons name="close" size={22} color="#ffffff" />
      </Pressable>
    </View>
  );
}

/** Medium-saturation fills (readable white text at ~15:1 on bar). */
const TONE = {
  success: {
    barLight: '#15803d',
    barDark: '#166534',
    icon: 'check',
  },
  info: {
    barLight: '#2563eb',
    barDark: '#1d4ed8',
    icon: 'information',
  },
  warning: {
    barLight: '#c2410c',
    barDark: '#9a3412',
    icon: 'alert',
  },
  error: {
    barLight: '#dc2626',
    barDark: '#b91c1c',
    icon: 'alert',
  },
};

const ICON = 36;

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingVertical: 11,
    paddingLeft: 12,
    paddingRight: 10,
    gap: 10,
    maxWidth: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  iconBubble: {
    width: ICON,
    height: ICON,
    borderRadius: ICON / 2,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  msg: {
    flex: 1,
    minWidth: 0,
    fontFamily: font.semiBold,
    fontSize: 15,
    lineHeight: 21,
    color: '#ffffff',
  },
  actionPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.92)',
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  actionPillPressed: {
    backgroundColor: 'rgba(255,255,255,0.24)',
  },
  actionText: {
    fontFamily: font.semiBold,
    fontSize: 13,
    color: '#ffffff',
    letterSpacing: 0.2,
  },
  divider: {
    width: 1,
    height: 22,
    backgroundColor: 'rgba(255,255,255,0.45)',
    marginHorizontal: 2,
  },
  closeBtn: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
