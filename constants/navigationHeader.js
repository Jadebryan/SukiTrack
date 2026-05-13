import { Platform, StyleSheet } from 'react-native';
import { font } from '@/constants/theme';

/**
 * Root native-stack scene fill. With Android `edgeToEdgeEnabled`, the default
 * white scene shows behind the status bar during transitions; match app chrome.
 */
export function getStackSceneBackground(theme, isDark) {
  return isDark ? theme.colors.surface : '#f0f4f1';
}

export function getStackContentStyle(theme, isDark) {
  return { backgroundColor: getStackSceneBackground(theme, isDark) };
}

/**
 * Shared native-stack / bottom-tabs header styling aligned with MD3 + brand.
 */
export function getHeaderScreenOptions(theme, isDark) {
  const headerBg = isDark ? theme.colors.surfaceVariant : theme.colors.surface;
  const border = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(46, 125, 50, 0.14)';

  return {
    headerStyle: {
      backgroundColor: headerBg,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: border,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.35 : 0.06,
          shadowRadius: 6,
        },
        android: {
          elevation: 3,
        },
        default: {},
      }),
    },
    headerTintColor: theme.colors.primary,
    headerTitleStyle: {
      fontFamily: font.extraBold,
      fontSize: 19,
      letterSpacing: -0.3,
      color: theme.colors.onSurface,
    },
    headerBackTitleStyle: {
      fontFamily: font.medium,
      fontSize: 15,
    },
    headerShadowVisible: false,
    headerTitleAlign: 'center',
  };
}
