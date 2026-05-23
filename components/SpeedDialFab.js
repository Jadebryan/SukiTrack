import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Portal } from 'react-native-paper';
import { font } from '@/constants/theme';

const GREEN = '#2d8a4e';
const MAIN_SIZE = 56;
const MINI_SIZE = 40;
const ACTION_GAP = 12;
const EDGE = 16;

/**
 * Material-style speed dial FAB: green main button + stacked mini actions with labels.
 *
 * @param {object} props
 * @param {number} props.bottom Distance from bottom of screen (above tab bar).
 * @param {boolean} props.open
 * @param {(open: boolean) => void} props.onOpenChange
 * @param {string} props.accessibilityLabel Collapsed main button label.
 * @param {string} [props.accessibilityLabelExpanded] Expanded main button label.
 * @param {string} [props.collapsedIcon] Main FAB icon when closed (default `plus`).
 * @param {string} [props.expandedIcon] Main FAB icon when open; omit to rotate `collapsedIcon` 45° instead.
 * @param {Array<{ key: string, label: string, icon: string, onPress: () => void, accessibilityLabel?: string }>} props.actions Last item sits closest to the main FAB.
 */
export function SpeedDialFab({
  bottom,
  open,
  onOpenChange,
  accessibilityLabel,
  accessibilityLabelExpanded,
  collapsedIcon = 'plus',
  expandedIcon,
  actions,
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: open ? 1 : 0,
      duration: open ? 200 : 160,
      easing: open ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [open, anim]);

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);
  const toggle = useCallback(() => onOpenChange(!open), [onOpenChange, open]);

  const scrimOpacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.45],
  });
  const actionsTranslateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 0],
  });
  const actionsOpacity = anim;
  const actionsScale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 1],
  });

  return (
    <Portal>
      <Animated.View
        pointerEvents={open ? 'auto' : 'none'}
        style={[StyleSheet.absoluteFill, styles.scrimWrap, { opacity: scrimOpacity }]}
      >
        <Pressable style={styles.scrim} onPress={close} accessibilityRole="button" />
      </Animated.View>

      <View pointerEvents="box-none" style={[styles.dialRoot, { bottom, right: EDGE }]}>
        <Animated.View
          pointerEvents={open ? 'auto' : 'none'}
          style={[
            styles.actionsColumn,
            {
              opacity: actionsOpacity,
              transform: [{ translateY: actionsTranslateY }, { scale: actionsScale }],
            },
          ]}
        >
          {[...actions].reverse().map((action) => (
            <View key={action.key} style={styles.actionRow}>
              <Pressable
                onPress={() => {
                  close();
                  action.onPress();
                }}
                style={({ pressed }) => [styles.labelChip, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel={action.accessibilityLabel || action.label}
              >
                <Text style={styles.labelText} numberOfLines={2}>
                  {action.label}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  close();
                  action.onPress();
                }}
                style={({ pressed }) => [styles.miniFab, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel={action.accessibilityLabel || action.label}
              >
                <MaterialCommunityIcons
                  name={action.icon}
                  size={22}
                  color="#1a2e1f"
                />
              </Pressable>
            </View>
          ))}
        </Animated.View>

        <Pressable
          onPress={toggle}
          style={({ pressed }) => [styles.mainFab, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={
            open ? accessibilityLabelExpanded || accessibilityLabel : accessibilityLabel
          }
          accessibilityState={{ expanded: open }}
        >
          {open && expandedIcon ? (
            <MaterialCommunityIcons name={expandedIcon} size={28} color="#ffffff" />
          ) : (
            <Animated.View
              style={{
                transform: [
                  {
                    rotate: expandedIcon
                      ? '0deg'
                      : anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '45deg'],
                        }),
                  },
                ],
              }}
            >
              <MaterialCommunityIcons name={collapsedIcon} size={28} color="#ffffff" />
            </Animated.View>
          )}
        </Pressable>
      </View>
    </Portal>
  );
}

/** Single green circular FAB (inventory add, etc.). */
export function GreenFab({
  bottom,
  right = EDGE,
  onPress,
  accessibilityLabel,
  icon = 'plus',
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.mainFab,
        styles.greenFabAbsolute,
        { bottom, right },
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <MaterialCommunityIcons name={icon} size={28} color="#ffffff" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrimWrap: {
    backgroundColor: '#000',
    zIndex: 10,
  },
  scrim: { flex: 1 },
  dialRoot: {
    position: 'absolute',
    zIndex: 11,
    alignItems: 'flex-end',
  },
  greenFabAbsolute: {
    position: 'absolute',
    zIndex: 11,
  },
  actionsColumn: {
    alignItems: 'flex-end',
    gap: ACTION_GAP,
    marginBottom: ACTION_GAP,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  mainFab: {
    width: MAIN_SIZE,
    height: MAIN_SIZE,
    borderRadius: MAIN_SIZE / 2,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
  },
  miniFab: {
    width: MINI_SIZE,
    height: MINI_SIZE,
    borderRadius: MINI_SIZE / 2,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 4,
  },
  labelChip: {
    backgroundColor: '#424242',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
    maxWidth: 200,
    marginRight: 10,
    elevation: 2,
  },
  labelText: {
    fontFamily: font.medium,
    fontSize: 14,
    color: '#ffffff',
    textAlign: 'right',
  },
  pressed: { opacity: 0.88 },
});
