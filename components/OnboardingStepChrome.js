import React from 'react';
import { StyleSheet, Text as RNText, View } from 'react-native';
import { AppBackButton, AppBackButtonPlaceholder } from '@/components/AppBackButton';
import { font } from '@/constants/theme';

const C = {
  greenMid: '#2d8a4e',
  greenBright: '#3cb96a',
  greenLight: '#a8e6be',
  charcoal: '#1a1f1c',
  white: '#ffffff',
  progressTrack: '#e5e7eb',
};

/**
 * Major onboarding screens only (not substeps inside one screen).
 * Bump this and add `ONBOARDING_STEP_*` when you insert new screens (e.g. verify email).
 */
export const ONBOARDING_TOTAL_STEPS = 2;

/** 1-based index for each screen’s header / pill; must satisfy 1 ≤ step ≤ ONBOARDING_TOTAL_STEPS. */
export const ONBOARDING_STEP_REGISTER = 1;
export const ONBOARDING_STEP_SETUP_PIN = 2;

/** @param {number} index 0-based segment */
function segmentKind(index, currentStep) {
  if (index < currentStep - 1) return 'done';
  if (index === currentStep - 1) return 'active';
  return 'track';
}

/**
 * White header: back, centered title, step progress segments.
 * @param {object} props
 * @param {string} props.title
 * @param {number} [props.currentStep] 1-based (required if `showProgress`)
 * @param {number} [props.totalSteps]
 * @param {boolean} [props.showProgress]
 * @param {{ top: number }} props.insets
 * @param {() => void} props.onBack
 * @param {(k: string, p?: Record<string, string>) => string} props.t
 */
export function OnboardingHeader({
  title,
  currentStep = 1,
  totalSteps = ONBOARDING_TOTAL_STEPS,
  showProgress = true,
  insets,
  onBack,
  t,
}) {
  return (
    <View
      style={[
        styles.topShell,
        {
          paddingTop: Math.max(insets.top, 8),
          borderBottomColor: 'rgba(46, 125, 50, 0.12)',
          paddingBottom: showProgress ? 10 : 12,
        },
      ]}
    >
      <View style={styles.topBar}>
        <View style={[styles.topBarSide, { justifyContent: 'flex-start' }]}>
          <AppBackButton onPress={onBack} accessibilityLabel={t('nav_back')} />
        </View>
        <View style={styles.topTitleWrap} pointerEvents="none">
          <RNText style={styles.topTitle}>{title}</RNText>
        </View>
        <View style={[styles.topBarSide, { justifyContent: 'flex-end' }]}>
          <AppBackButtonPlaceholder />
        </View>
      </View>
      {showProgress ? (
        <OnboardingProgressRow currentStep={currentStep} totalSteps={totalSteps} />
      ) : null}
    </View>
  );
}

export function OnboardingProgressRow({ currentStep, totalSteps = ONBOARDING_TOTAL_STEPS }) {
  return (
    <View style={styles.progressRow}>
      {Array.from({ length: totalSteps }).map((_, i) => {
        const kind = segmentKind(i, currentStep);
        return (
          <View
            key={i}
            style={[
              styles.progressSeg,
              kind === 'done' && styles.progressDone,
              kind === 'active' && styles.progressActive,
            ]}
          />
        );
      })}
    </View>
  );
}

/**
 * Pill used on green hero: "Step n of m"
 * @param {object} props
 * @param {number} props.currentStep
 * @param {number} [props.totalSteps]
 * @param {(k: string, p?: Record<string, string>) => string} props.t
 */
export function OnboardingStepPill({
  currentStep,
  totalSteps = ONBOARDING_TOTAL_STEPS,
  t,
  align = 'start',
}) {
  return (
    <View
      style={[styles.heroBadge, align === 'center' && { alignSelf: 'center' }]}
    >
      <View style={styles.heroBadgeDot} />
      <RNText style={styles.heroBadgeText}>
        {t('onboarding_stepBadge', {
          current: String(currentStep),
          total: String(totalSteps),
        })}
      </RNText>
    </View>
  );
}

const styles = StyleSheet.create({
  topShell: {
    backgroundColor: C.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    zIndex: 4,
  },
  topBar: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
  },
  topBarSide: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  topTitleWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    fontFamily: font.extraBold,
    fontSize: 16,
    color: C.charcoal,
    letterSpacing: -0.2,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
    paddingHorizontal: 8,
  },
  progressSeg: {
    flex: 1,
    height: 4,
    borderRadius: 99,
    backgroundColor: C.progressTrack,
  },
  progressDone: {
    backgroundColor: C.greenMid,
  },
  progressActive: {
    backgroundColor: C.greenBright,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    borderRadius: 99,
    paddingVertical: 5,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  heroBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.greenLight,
  },
  heroBadgeText: {
    fontFamily: font.semiBold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.88)',
    letterSpacing: 0.5,
  },
});
