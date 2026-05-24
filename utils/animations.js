import React from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withRepeat,
  Easing,
  runOnJS,
  useAnimatedReaction,
} from 'react-native-reanimated';

// ─── Spring configs ────────────────────────────────────────────────────────────

/** Snappy spring for most press interactions */
export const SPRING_SNAPPY = { damping: 18, stiffness: 300 };

/** Bouncy spring for badges and success pops */
export const SPRING_BOUNCY = { damping: 10, stiffness: 260 };

/** Gentle spring for bottom sheet entrance */
export const SPRING_GENTLE = { damping: 22, stiffness: 180 };

// ─── Press scale hook ──────────────────────────────────────────────────────────

export function usePressScale(scaleTo = 0.96) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const onPressIn = () => {
    scale.value = withSpring(scaleTo, SPRING_SNAPPY);
  };
  const onPressOut = () => {
    scale.value = withSpring(1, SPRING_SNAPPY);
  };
  return { animatedStyle, onPressIn, onPressOut };
}

// ─── Fade + slide up entrance ──────────────────────────────────────────────────

export function useFadeSlideIn(delayMs = 0) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(16);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));
  React.useEffect(() => {
    opacity.value = withTiming(1, {
      duration: 320,
      easing: Easing.out(Easing.ease),
    });
    translateY.value = withTiming(0, {
      duration: 320,
      easing: Easing.out(Easing.ease),
    });
  }, []);
  return animatedStyle;
}

// ─── Stagger delay helper ──────────────────────────────────────────────────────

export function staggerStyle(index, baseDelayMs = 60) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));
  React.useEffect(() => {
    const delay = index * baseDelayMs;
    const timeoutId = setTimeout(() => {
      opacity.value = withTiming(1, {
        duration: 280,
        easing: Easing.out(Easing.ease),
      });
      translateY.value = withTiming(0, {
        duration: 280,
        easing: Easing.out(Easing.ease),
      });
    }, delay);
    return () => clearTimeout(timeoutId);
  }, []);
  return animatedStyle;
}

// ─── Shake — for validation errors ────────────────────────────────────────────

export function useShake() {
  const translateX = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));
  const shake = () => {
    translateX.value = withSequence(
      withTiming(-8, { duration: 60 }),
      withTiming(8, { duration: 60 }),
      withTiming(-6, { duration: 60 }),
      withTiming(6, { duration: 60 }),
      withTiming(-3, { duration: 60 }),
      withTiming(0, { duration: 60 })
    );
  };
  return { animatedStyle, shake };
}

// ─── Count-up number ───────────────────────────────────────────────────────────

export function useCountUp(target, durationMs = 900) {
  const [display, setDisplay] = React.useState(0);
  const progress = useSharedValue(0);
  React.useEffect(() => {
    progress.value = withTiming(1, {
      duration: durationMs,
      easing: Easing.out(Easing.cubic),
    });
  }, [target]);
  useAnimatedReaction(
    () => progress.value * target,
    (current) => runOnJS(setDisplay)(current)
  );
  return display;
}

// ─── Pop-in (badge / success icon) ────────────────────────────────────────────

export function usePopIn() {
  const scale = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const trigger = () => {
    scale.value = withSpring(1, SPRING_BOUNCY);
  };
  return { animatedStyle, trigger };
}

// ─── FAB icon rotate ───────────────────────────────────────────────────────────

export function useFabRotate() {
  const rotation = useSharedValue(0);
  const [isOpen, setIsOpen] = React.useState(false);
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));
  const toggle = () => {
    const next = !isOpen;
    setIsOpen(next);
    rotation.value = withSpring(next ? 45 : 0, SPRING_SNAPPY);
  };
  return { iconStyle, toggle, isOpen };
}

// ─── Delete collapse ───────────────────────────────────────────────────────────

export function useCollapse(initialHeight = 80) {
  const height = useSharedValue(initialHeight);
  const opacity = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
    opacity: opacity.value,
    overflow: 'hidden',
  }));
  const collapse = (onDone) => {
    opacity.value = withTiming(0, { duration: 200 });
    height.value = withTiming(0, {
      duration: 250,
      easing: Easing.in(Easing.ease),
    });
    // Note: For native driver, we can't use callback. Use setTimeout instead.
    const timeoutId = setTimeout(() => onDone(), 250);
    return () => clearTimeout(timeoutId);
  };
  return { animatedStyle, collapse };
}

// ─── Nav tab bounce ────────────────────────────────────────────────────────────

export function useNavBounce() {
  const scale = useSharedValue(1);
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const bounce = () => {
    scale.value = withSequence(
      withSpring(1.28, SPRING_BOUNCY),
      withSpring(1, SPRING_SNAPPY)
    );
  };
  return { iconStyle, bounce };
}

// ─── Balance flash ─────────────────────────────────────────────────────────────

export function useBalanceFlash() {
  const bg = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: `rgba(29, 158, 117, ${bg.value * 0.18})`,
    borderRadius: 8,
  }));
  const flash = () => {
    bg.value = withSequence(
      withTiming(1, { duration: 180 }),
      withTiming(0, { duration: 600 })
    );
  };
  return { animatedStyle, flash };
}

// ─── Bell shake ────────────────────────────────────────────────────────────────

export function useBellShake() {
  const rotate = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotate.value}deg` }],
  }));
  const shake = () => {
    rotate.value = withSequence(
      withTiming(-18, { duration: 80 }),
      withTiming(18, { duration: 80 }),
      withTiming(-14, { duration: 80 }),
      withTiming(14, { duration: 80 }),
      withTiming(-8, { duration: 80 }),
      withTiming(0, { duration: 80 })
    );
  };
  return { animatedStyle, shake };
}
