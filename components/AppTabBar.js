import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CustomersTabBarButton } from '@/components/CustomersTabBarButton';
import { getTabBarPalette } from '@/constants/tabBarPalette';
import { font } from '@/constants/theme';
import { useAppTheme } from '@/contexts/AppThemeContext';

const TAB_ICONS = {
  index: 'account-multiple-outline',
  inventory: 'cube-outline',
  reports: 'chart-bar',
  settings: 'cog-outline',
};

/**
 * Custom bottom tab bar — outline icons, green active state, dark/light surfaces.
 * @param {import('@react-navigation/bottom-tabs').BottomTabBarProps} props
 */
export function AppTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const { isDark } = useAppTheme();
  const colors = getTabBarPalette(isDark);
  const padBottom = Math.max(insets.bottom, 10);

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: colors.barBg,
          borderTopColor: colors.border,
          paddingBottom: padBottom,
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label =
          typeof options.tabBarLabel === 'string'
            ? options.tabBarLabel
            : options.title ?? route.name;
        const isFocused = state.index === index;
        const tint = isFocused ? colors.active : colors.inactive;
        const iconName = TAB_ICONS[route.name] || 'circle-outline';

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        const TabButton = route.name === 'index' ? CustomersTabBarButton : Pressable;

        return (
          <TabButton
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={
              typeof options.tabBarAccessibilityLabel === 'string'
                ? options.tabBarAccessibilityLabel
                : label
            }
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tab}
          >
            <MaterialCommunityIcons name={iconName} size={24} color={tint} />
            <Text
              style={[
                styles.label,
                { color: tint },
                isFocused && styles.labelActive,
              ]}
              numberOfLines={1}
            >
              {label}
            </Text>
          </TabButton>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 48,
    paddingHorizontal: 4,
  },
  label: {
    fontFamily: font.medium,
    fontSize: 11,
  },
  labelActive: {
    fontFamily: font.semiBold,
  },
});
