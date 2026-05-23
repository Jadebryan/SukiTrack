import React, { useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { useTheme } from 'react-native-paper';
import { useAppTheme } from '@/contexts/AppThemeContext';
import { font } from '@/constants/theme';
import { t } from '@/i18n/strings';

const SIZE = 52;
const STROKE = 4;
const HALF = SIZE / 2;

function ProgressRing({ animatedValue, trackColor, color }) {
  const rightRotate = animatedValue.interpolate({
    inputRange: [0, 50],
    outputRange: ['0deg', '180deg'],
    extrapolate: 'clamp',
  });

  const leftRotate = animatedValue.interpolate({
    inputRange: [50, 100],
    outputRange: ['0deg', '180deg'],
    extrapolate: 'clamp',
  });

  const leftOpacity = animatedValue.interpolate({
    inputRange: [49.9, 50],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const arcBase = {
    width: SIZE,
    height: SIZE,
    borderRadius: HALF,
    borderWidth: STROKE,
    position: 'absolute',
    top: 0,
    borderTopColor: color,
    borderRightColor: color,
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
  };

  return (
    <View style={ringStyles.wrap}>
      <View
        style={[
          ringStyles.track,
          {
            width: SIZE,
            height: SIZE,
            borderRadius: HALF,
            borderWidth: STROKE,
            borderColor: trackColor,
          },
        ]}
      />
      <View style={[ringStyles.halfClip, { right: 0 }]}>
        <Animated.View
          style={[
            arcBase,
            { right: 0, transform: [{ rotate: '-90deg' }, { rotate: rightRotate }] },
          ]}
        />
      </View>
      <Animated.View style={[ringStyles.halfClip, { left: 0, opacity: leftOpacity }]}>
        <Animated.View
          style={[
            arcBase,
            { left: 0, transform: [{ rotate: '90deg' }, { rotate: leftRotate }] },
          ]}
        />
      </Animated.View>
    </View>
  );
}

const ringStyles = StyleSheet.create({
  wrap: {
    width: SIZE,
    height: SIZE,
  },
  track: {
    position: 'absolute',
  },
  halfClip: {
    position: 'absolute',
    width: HALF,
    height: SIZE,
    overflow: 'hidden',
    top: 0,
  },
});

/**
 * Circular ring saving indicator — card with ring, title, subtitle, optional Cancel.
 * Uses pure RN views (no react-native-svg) for broad RN / Expo compatibility.
 */
export default function SavingProgress({
  progress = 0,
  indeterminate = false,
  title,
  statusText,
  onCancel,
  error = false,
  style,
}) {
  const theme = useTheme();
  const { isDark } = useAppTheme();
  const animatedProgress = useRef(new Animated.Value(progress)).current;
  const mountedRef = useRef(false);
  const lastProgressRef = useRef(progress);

  const resolvedTitle = title ?? t('common_savingFileTitle');
  const resolvedStatus = statusText ?? t('common_savingUploadSub');

  const palette = useMemo(() => {
    if (isDark) {
      return {
        cardBg: theme.colors.surfaceVariant,
        cardBorder: 'rgba(255,255,255,0.12)',
        track: '#3A3A3A',
        arc: error ? theme.colors.error : '#1D9E75',
        title: '#FFFFFF',
        subtitle: '#AAAAAA',
        pct: '#FFFFFF',
        cancelBorder: 'rgba(255,255,255,0.22)',
        cancelText: '#FFFFFF',
      };
    }
    return {
      cardBg: '#FFFFFF',
      cardBorder: 'rgba(0,0,0,0.12)',
      track: '#E1F5EE',
      arc: error ? theme.colors.error : '#1D9E75',
      title: '#1D1D1D',
      subtitle: '#6B6B6B',
      pct: '#1D1D1D',
      cancelBorder: 'rgba(0,0,0,0.18)',
      cancelText: '#6B6B6B',
    };
  }, [isDark, theme.colors.error, theme.colors.surfaceVariant, error]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      animatedProgress.stopAnimation();
    };
  }, [animatedProgress]);

  useEffect(() => {
    if (indeterminate) {
      animatedProgress.setValue(18);
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(animatedProgress, {
            toValue: 82,
            duration: 1100,
            useNativeDriver: true,
          }),
          Animated.timing(animatedProgress, {
            toValue: 18,
            duration: 1100,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }

    const prev = lastProgressRef.current;
    lastProgressRef.current = progress;
    const jump = Math.abs(progress - prev);
    if (jump > 30 || progress === 0 || progress === 100) {
      animatedProgress.setValue(progress);
    }

    const animation = Animated.timing(animatedProgress, {
      toValue: progress,
      duration: jump > 30 ? 120 : 280,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [progress, indeterminate, animatedProgress]);

  const pctLabel = indeterminate ? '…' : `${Math.round(progress)}%`;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: palette.cardBg,
          borderColor: palette.cardBorder,
        },
        style,
      ]}
    >
      <View style={styles.ringWrapper}>
        <ProgressRing
          animatedValue={animatedProgress}
          trackColor={palette.track}
          color={palette.arc}
        />
        <View style={styles.pctOverlay}>
          <Text style={[styles.pctText, { color: palette.pct, fontFamily: font.medium }]}>
            {pctLabel}
          </Text>
        </View>
      </View>

      <View style={styles.body}>
        <Text style={[styles.title, { color: palette.title, fontFamily: font.semiBold }]}>
          {resolvedTitle}
        </Text>
        <Text style={[styles.subtitle, { color: palette.subtitle, fontFamily: font.regular }]}>
          {resolvedStatus}
        </Text>
      </View>

      {onCancel ? (
        <TouchableOpacity
          style={[styles.cancelBtn, { borderColor: palette.cancelBorder }]}
          onPress={onCancel}
          activeOpacity={0.7}
        >
          <Text style={[styles.cancelText, { color: palette.cancelText, fontFamily: font.medium }]}>
            {t('common_cancel')}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 0.5,
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 12,
  },
  ringWrapper: {
    width: SIZE,
    height: SIZE,
    position: 'relative',
    flexShrink: 0,
  },
  pctOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pctText: {
    fontSize: 11,
    fontWeight: '500',
  },
  body: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 15,
    fontWeight: '500',
  },
  subtitle: {
    fontSize: 13,
  },
  cancelBtn: {
    borderWidth: 0.5,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  cancelText: {
    fontSize: 12,
  },
});
