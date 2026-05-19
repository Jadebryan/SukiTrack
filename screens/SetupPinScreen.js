import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text as RNText,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { APP_PIN_LENGTH } from '@/constants/appPin';
import {
  OnboardingHeader,
  OnboardingStepPill,
  ONBOARDING_STEP_SETUP_PIN,
  ONBOARDING_TOTAL_STEPS,
} from '@/components/OnboardingStepChrome';
import { font } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { useSensitiveScreenCapture } from '@/hooks/useSensitiveScreenCapture';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import * as pinService from '@/services/pinService';
import { getAuthPinNumpadMetrics } from '@/utils/authPinNumpadLayout';
import { authStackBottomPads } from '@/utils/authScreenLayout';

const C = {
  greenDark: '#1a5c2e',
  greenMid: '#2d8a4e',
  greenBright: '#3cb96a',
  greenLight: '#a8e6be',
  greenPale: '#e8f7ee',
  charcoal: '#1a1f1c',
  graySoft: '#6b7a72',
  pageBg: '#f0f4f1',
  white: '#ffffff',
  inputBorder: '#e2ede7',
  clearBg: '#fff0f0',
  clearFg: '#c0392b',
  err: '#e74c3c',
};

const PIN_SLOTS = APP_PIN_LENGTH;

const DIAL_SUB = {
  2: 'ABC',
  3: 'DEF',
  4: 'GHI',
  5: 'JKL',
  6: 'MNO',
  7: 'PQRS',
  8: 'TUV',
  9: 'WXYZ',
};

function digitsOnly(s) {
  return String(s || '').replace(/\D/g, '').slice(0, APP_PIN_LENGTH);
}

export function SetupPinScreen() {
  useSensitiveScreenCapture(true);
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();
  const pinLayout = useMemo(
    () => getAuthPinNumpadMetrics(winH, winW),
    [winH, winW]
  );
  const { t } = useLocale();
  const { unlockSession, refreshPinState, user, sessionLoading } = useAuth();
  const keyboardPad = useKeyboardHeight(true);

  const flowRaw = params.flow;
  const pinFlow = Array.isArray(flowRaw) ? flowRaw[0] : flowRaw;
  const isResetFlow = pinFlow === 'reset';
  const ctaLabel = isResetFlow ? t('setupReset_saveAndContinue') : t('setup_startApp');

  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [focusField, setFocusField] = useState('pin');
  const [showPin, setShowPin] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!sessionLoading && (!user?.token || !user?.ownerId)) {
      router.replace('/welcome');
    }
  }, [sessionLoading, user?.token, user?.ownerId, router]);

  useEffect(() => {
    if (pin.length < APP_PIN_LENGTH && focusField === 'confirm') {
      setFocusField('pin');
    }
  }, [pin.length, focusField]);

  useEffect(() => {
    setConfirm((c) => (c.length > pin.length ? c.slice(0, pin.length) : c));
  }, [pin]);

  const keyGap = pinLayout.keyGap;
  const keySize = pinLayout.keySize;

  const pinLen = pin.length;
  const confirmLen = confirm.length;

  const pinHint = useMemo(() => {
    if (pinLen === 0) {
      return { kind: 'info', text: t('setup_hintEnter') };
    }
    if (pinLen < APP_PIN_LENGTH) {
      return {
        kind: 'err',
        text: t('setup_hintMore', {
          count: String(APP_PIN_LENGTH - pinLen),
        }),
      };
    }
    return { kind: 'ok', text: t('setup_hintLenOk') };
  }, [pinLen, t]);

  const confirmHint = useMemo(() => {
    if (confirmLen === 0) {
      return { kind: 'info', text: t('setup_hintReenter') };
    }
    if (
      pinLen === APP_PIN_LENGTH &&
      confirmLen === APP_PIN_LENGTH &&
      confirm === pin
    ) {
      return { kind: 'ok', text: t('setup_hintMatch') };
    }
    if (
      pinLen === APP_PIN_LENGTH &&
      confirmLen >= APP_PIN_LENGTH &&
      confirm !== pin
    ) {
      return { kind: 'err', text: t('setup_errMismatch') };
    }
    return { kind: 'info', text: t('setup_hintTyping') };
  }, [confirm, confirmLen, pin, pinLen, t]);

  const confirmFieldStyle = useMemo(() => {
    if (pinLen < APP_PIN_LENGTH) return 'normal';
    if (confirmLen > 0 && confirmLen >= pinLen && confirm !== pin) {
      return 'error';
    }
    if (
      pinLen === APP_PIN_LENGTH &&
      confirm === pin &&
      confirmLen === APP_PIN_LENGTH
    ) {
      return 'success';
    }
    return 'normal';
  }, [confirm, confirmLen, pin, pinLen]);

  const canSubmit =
    pinLen === APP_PIN_LENGTH &&
    confirmLen === APP_PIN_LENGTH &&
    confirm === pin;

  /** Same major step for enter-PIN and confirm-PIN; substeps are not separate onboarding steps. */
  const onboardingStep = ONBOARDING_STEP_SETUP_PIN;

  const { scrollContentPaddingBottom, cardPaddingBottom: cardPadBottom } =
    authStackBottomPads(insets.bottom, keyboardPad);

  const appendDigit = (d) => {
    if (busy) return;
    setError('');
    const digit = String(d);
    if (focusField === 'pin') {
      if (pin.length >= APP_PIN_LENGTH) return;
      const next = digitsOnly(pin + digit);
      setPin(next);
      if (next.length === APP_PIN_LENGTH) setFocusField('confirm');
      return;
    }
    if (pin.length < APP_PIN_LENGTH) {
      setFocusField('pin');
      return;
    }
    const maxC = pin.length;
    if (confirm.length >= maxC) return;
    setConfirm(digitsOnly(confirm + digit));
  };

  const backspace = () => {
    if (busy) return;
    setError('');
    if (focusField === 'confirm') {
      if (confirm.length > 0) {
        setConfirm((c) => c.slice(0, -1));
        return;
      }
      setFocusField('pin');
      setPin((p) => p.slice(0, -1));
      return;
    }
    setPin((p) => p.slice(0, -1));
  };

  const onBackNav = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/welcome');
  };

  const submit = async () => {
    setError('');
    if (pin.length !== APP_PIN_LENGTH) {
      setError(t('setup_errLength'));
      return;
    }
    if (pin !== confirm) {
      setError(t('setup_errMismatch'));
      return;
    }
    setBusy(true);
    try {
      await pinService.setPin(pin);
      await refreshPinState();
      unlockSession();
      router.replace('/');
    } catch (e) {
      setError(e?.message || t('setup_errGeneric'));
    } finally {
      setBusy(false);
    }
  };

  const pinDisplay =
    pin.length === 0
      ? '•'.repeat(APP_PIN_LENGTH)
      : showPin
        ? pin
        : '•'.repeat(pin.length);
  const confirmSlots = APP_PIN_LENGTH;
  const confirmDisplay =
    confirm.length === 0
      ? '•'.repeat(confirmSlots)
      : showConfirm
        ? confirm
        : '•'.repeat(confirm.length);

  const keypadRow = (keys, rowId, { isLast } = {}) => (
    <View
      style={[
        styles.keyRow,
        { gap: keyGap, marginBottom: isLast ? 0 : pinLayout.keyRowMb },
      ]}
    >
      {keys.map((cell, idx) => {
        if (cell === null) {
          return (
            <View
              key={`sp-${rowId}-${idx}`}
              style={{ width: keySize, height: keySize }}
            />
          );
        }
        if (typeof cell === 'object' && cell !== null && cell.type === 'bs') {
          return (
            <Pressable
              key={`bs-${rowId}`}
              onPress={backspace}
              style={({ pressed }) => [
                styles.numBtn,
                styles.numBtnClear,
                {
                  width: keySize,
                  height: keySize,
                  opacity: pressed ? 0.9 : 1,
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Backspace"
            >
              <MaterialCommunityIcons
                name="backspace-outline"
                size={22}
                color={C.clearFg}
              />
            </Pressable>
          );
        }
        if (typeof cell === 'object' && cell !== null && cell.type === 'go') {
          const enabled = canSubmit && !busy;
          return (
            <Pressable
              key="go"
              onPress={() => {
                if (enabled) submit();
              }}
              style={({ pressed }) => [
                styles.numBtnGo,
                {
                  width: keySize,
                  height: keySize,
                  opacity: pressed && enabled ? 0.92 : enabled ? 1 : 0.45,
                  transform: [{ scale: pressed && enabled ? 0.96 : 1 }],
                },
              ]}
              disabled={!enabled}
              accessibilityRole="button"
              accessibilityLabel={ctaLabel}
            >
              <LinearGradient
                colors={[C.greenMid, C.greenBright]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[StyleSheet.absoluteFillObject, { borderRadius: 14 }]}
              />
              <MaterialCommunityIcons
                name="check"
                size={24}
                color={C.white}
                style={styles.goIcon}
              />
            </Pressable>
          );
        }
        const digit = String(cell);
        return (
          <Pressable
            key={`d-${rowId}-${digit}`}
            onPress={() => appendDigit(digit)}
            style={({ pressed }) => [
              styles.numBtn,
              {
                width: keySize,
                height: keySize,
                backgroundColor: pressed ? C.greenLight : C.greenPale,
                borderWidth: 1.5,
                borderColor: C.inputBorder,
                opacity: pressed ? 0.95 : 1,
                transform: [{ scale: pressed ? 0.94 : 1 }],
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Digit ${digit}`}
          >
            <RNText style={[styles.keyNum, { color: C.charcoal }]}>
              {digit}
            </RNText>
            {DIAL_SUB[digit] ? (
              <RNText style={[styles.keySub, { color: C.graySoft }]}>
                {DIAL_SUB[digit]}
              </RNText>
            ) : (
              <View style={{ height: pinLayout.keySubSpacer }} />
            )}
          </Pressable>
        );
      })}
    </View>
  );

  const hintStyle = (kind) => {
    if (kind === 'ok') return styles.hintOk;
    if (kind === 'err') return styles.hintErr;
    return styles.hintInfo;
  };

  return (
    <KeyboardAvoidingView
      style={styles.kav}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.root}>
        <StatusBar style="dark" />
        <OnboardingHeader
          title={isResetFlow ? t('setupReset_navTitle') : t('setup_title')}
          currentStep={onboardingStep}
          totalSteps={ONBOARDING_TOTAL_STEPS}
          showProgress={!isResetFlow}
          insets={insets}
          onBack={onBackNav}
          t={t}
        />

        <View pointerEvents="none" style={styles.blobTop} />
        <View pointerEvents="none" style={styles.blobBottom} />

        <ScrollView
          style={styles.scroll}
          bounces={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: scrollContentPaddingBottom },
          ]}
        >
          <View
            style={[
              styles.hero,
              {
                paddingBottom: pinLayout.heroPadBottom,
                paddingTop: 8,
              },
            ]}
          >
            <LinearGradient
              colors={[C.greenDark, C.greenMid, C.greenBright]}
              locations={[0, 0.55, 1]}
              start={{ x: 0.15, y: 0 }}
              end={{ x: 0.85, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View
              pointerEvents="none"
              style={[styles.heroRing, { borderColor: 'rgba(255,255,255,0.1)' }]}
            />
            <View
              pointerEvents="none"
              style={[styles.heroBlob, { backgroundColor: 'rgba(255,255,255,0.05)' }]}
            />

            {!isResetFlow ? (
              <OnboardingStepPill
                currentStep={onboardingStep}
                totalSteps={ONBOARDING_TOTAL_STEPS}
                t={t}
              />
            ) : null}
            <RNText
              style={[
                styles.heroTitle,
                {
                  fontSize: pinLayout.setupHeroTitleSize,
                  lineHeight: pinLayout.setupHeroTitleLh,
                  marginBottom: pinLayout.setupHeroTitleMb,
                },
              ]}
            >
              {isResetFlow ? t('setupReset_heroTitle') : t('setup_heroTitle')}
            </RNText>
            <RNText style={styles.heroSub}>
              {isResetFlow ? t('setupReset_heroSub') : t('setup_heroSub')}
            </RNText>
          </View>

          <View
            style={[
              styles.card,
              {
                marginTop: -22,
                paddingBottom: cardPadBottom,
                paddingTop: pinLayout.setupCardPadTop,
              },
            ]}
          >
            <View
              style={[
                styles.tipBox,
                {
                  marginBottom: pinLayout.setupTipMb,
                  paddingVertical: pinLayout.setupTipPv,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="information-outline"
                size={18}
                color={C.greenBright}
                style={styles.tipIcon}
              />
              {isResetFlow ? (
                <RNText style={styles.tipText}>{t('setupReset_tip')}</RNText>
              ) : (
                <RNText style={styles.tipText}>
                  {t('setup_tipPart1')}
                  <RNText style={styles.tipBold}>{t('setup_tipBad1')}</RNText>
                  {t('setup_tipPart2')}
                  <RNText style={styles.tipBold}>{t('setup_tipBad2')}</RNText>
                  {t('setup_tipPart3')}
                </RNText>
              )}
            </View>

            <Pressable
              onPress={() => setFocusField('pin')}
              style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}
            >
              <View style={styles.fieldLabelRow}>
                <RNText
                  style={[
                    styles.fieldLabel,
                    focusField === 'pin' && styles.fieldLabelActive,
                  ]}
                >
                  {t('setup_pin').toUpperCase()}
                </RNText>
                <View style={styles.lenBadge}>
                  <RNText style={styles.lenBadgeText}>
                    {t('setup_pinLengthBadge')}
                  </RNText>
                </View>
              </View>
              <View style={styles.pinDots}>
                {Array.from({ length: PIN_SLOTS }).map((_, i) => {
                  const filled = i < pin.length;
                  return (
                    <View
                      key={`p-${i}`}
                      style={[
                        styles.dot,
                        {
                          backgroundColor: filled ? C.greenMid : 'transparent',
                          borderColor: filled ? C.greenMid : C.greenLight,
                          transform: [{ scale: filled ? 1.1 : 1 }],
                        },
                      ]}
                    />
                  );
                })}
              </View>
              <View
                style={[
                  styles.fieldWrap,
                  focusField === 'pin'
                    ? styles.fieldWrapFocus
                    : styles.fieldWrapIdle,
                ]}
              >
                <RNText
                  style={[
                    styles.fieldDots,
                    {
                      color: pin ? C.charcoal : '#aac0b2',
                      letterSpacing: showPin ? 3 : 6,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {pinDisplay}
                </RNText>
                <Pressable
                  style={styles.eyeBtn}
                  onPress={() => setShowPin((v) => !v)}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={
                    showPin ? t('auth_hidePin') : t('auth_showPin')
                  }
                >
                  <MaterialCommunityIcons
                    name={showPin ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color={C.graySoft}
                  />
                </Pressable>
              </View>
              <RNText style={[styles.fieldHint, hintStyle(pinHint.kind)]}>
                {pinHint.text}
              </RNText>
            </Pressable>

            <Pressable
              onPress={() => {
                if (pin.length >= APP_PIN_LENGTH) setFocusField('confirm');
              }}
              style={({ pressed }) => [
                { marginTop: pinLayout.setupBetweenFieldsMt, opacity: pressed ? 0.92 : 1 },
                pin.length < APP_PIN_LENGTH && { opacity: 0.55 },
              ]}
              disabled={pin.length < APP_PIN_LENGTH}
            >
              <View style={styles.fieldLabelRow}>
                <RNText
                  style={[
                    styles.fieldLabel,
                    pin.length >= APP_PIN_LENGTH &&
                      focusField === 'confirm' &&
                      styles.fieldLabelActive,
                  ]}
                >
                  {t('setup_pinAgain').toUpperCase()}
                </RNText>
                <View style={{ width: 56 }} />
              </View>
              <View style={styles.pinDots}>
                {Array.from({ length: confirmSlots }).map((_, i) => {
                  const filled = i < confirm.length;
                  return (
                    <View
                      key={`c-${i}`}
                      style={[
                        styles.dot,
                        {
                          backgroundColor: filled ? C.greenMid : 'transparent',
                          borderColor: filled ? C.greenMid : C.greenLight,
                          transform: [{ scale: filled ? 1.1 : 1 }],
                        },
                      ]}
                    />
                  );
                })}
              </View>
              <View
                style={[
                  styles.fieldWrap,
                  confirmFieldStyle === 'error' && styles.fieldWrapErr,
                  confirmFieldStyle === 'success' && styles.fieldWrapOk,
                  confirmFieldStyle === 'normal' &&
                    focusField === 'confirm' &&
                    pin.length >= APP_PIN_LENGTH &&
                    styles.fieldWrapFocus,
                  confirmFieldStyle === 'normal' &&
                    !(focusField === 'confirm' && pin.length >= APP_PIN_LENGTH) &&
                    styles.fieldWrapIdle,
                ]}
              >
                <RNText
                  style={[
                    styles.fieldDots,
                    {
                      color: confirm ? C.charcoal : '#aac0b2',
                      letterSpacing: showConfirm ? 3 : 6,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {confirmDisplay}
                </RNText>
                <Pressable
                  style={styles.eyeBtn}
                  onPress={() => setShowConfirm((v) => !v)}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={
                    showConfirm ? t('auth_hidePin') : t('auth_showPin')
                  }
                >
                  <MaterialCommunityIcons
                    name={showConfirm ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color={C.graySoft}
                  />
                </Pressable>
              </View>
              <RNText style={[styles.fieldHint, hintStyle(confirmHint.kind)]}>
                {pin.length < APP_PIN_LENGTH
                  ? t('setup_finishPinFirst')
                  : confirmHint.text}
              </RNText>
            </Pressable>

            {error ? <RNText style={styles.errBanner}>{error}</RNText> : null}

            <View
              style={[
                styles.numpad,
                {
                  marginTop: pinLayout.setupNumpadMt,
                  marginBottom: pinLayout.setupNumpadMb,
                },
              ]}
            >
              {keypadRow([1, 2, 3], 'r1')}
              {keypadRow([4, 5, 6], 'r2')}
              {keypadRow([7, 8, 9], 'r3')}
              {keypadRow([{ type: 'bs' }, '0', { type: 'go' }], 'r4', {
                isLast: true,
              })}
            </View>

            <Pressable
              onPress={submit}
              disabled={!canSubmit || busy}
              style={({ pressed }) => ({
                opacity: !canSubmit || busy ? 0.5 : pressed ? 0.92 : 1,
              })}
            >
              <LinearGradient
                colors={[C.greenDark, C.greenBright]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.ctaGrad,
                  { paddingVertical: pinLayout.setupCtaPv },
                ]}
              >
                {busy ? (
                  <ActivityIndicator color={C.white} />
                ) : (
                  <>
                    <MaterialCommunityIcons
                      name={isResetFlow ? 'shield-lock-outline' : 'lock-outline'}
                      size={18}
                      color={C.white}
                    />
                    <RNText style={styles.ctaText}>{ctaLabel}</RNText>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  kav: { flex: 1 },
  root: {
    flex: 1,
    backgroundColor: C.pageBg,
  },
  blobTop: {
    position: 'absolute',
    top: 120,
    right: -80,
    width: 280,
    height: 280,
    borderRadius: 999,
    backgroundColor: 'rgba(60,185,106,0.12)',
    zIndex: 0,
  },
  blobBottom: {
    position: 'absolute',
    bottom: -60,
    left: -60,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: 'rgba(45,138,78,0.08)',
    zIndex: 0,
  },
  scroll: {
    flex: 1,
    alignSelf: 'stretch',
    backgroundColor: C.white,
    zIndex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  hero: {
    paddingHorizontal: 28,
    alignItems: 'flex-start',
    overflow: 'hidden',
  },
  heroRing: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 2,
  },
  heroBlob: {
    position: 'absolute',
    bottom: -80,
    left: -40,
    width: 240,
    height: 240,
    borderRadius: 120,
  },
  heroTitle: {
    fontFamily: font.extraBold,
    fontSize: 26,
    color: C.white,
    letterSpacing: -0.4,
    lineHeight: 32,
    marginBottom: 8,
  },
  heroSub: {
    fontFamily: font.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.72)',
    lineHeight: 20,
    maxWidth: 300,
  },
  card: {
    backgroundColor: C.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: C.greenPale,
    borderWidth: 1,
    borderColor: C.inputBorder,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 18,
  },
  tipIcon: { marginTop: 1 },
  tipText: {
    flex: 1,
    fontFamily: font.regular,
    fontSize: 12,
    color: C.greenDark,
    lineHeight: 18,
  },
  tipBold: {
    fontFamily: font.semiBold,
    color: C.greenDark,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 7,
  },
  fieldLabel: {
    fontFamily: font.semiBold,
    fontSize: 11,
    color: C.greenMid,
    letterSpacing: 0.7,
  },
  fieldLabelActive: {
    color: C.greenDark,
    fontFamily: font.bold,
  },
  lenBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 99,
    backgroundColor: C.greenPale,
    borderWidth: 1,
    borderColor: C.inputBorder,
  },
  lenBadgeText: {
    fontFamily: font.medium,
    fontSize: 10,
    color: C.greenMid,
  },
  pinDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 6,
  },
  dot: {
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 2,
  },
  fieldWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minHeight: 52,
  },
  fieldWrapIdle: {
    borderColor: C.inputBorder,
    backgroundColor: C.greenPale,
  },
  fieldWrapFocus: {
    borderWidth: 3,
    borderColor: C.greenDark,
    backgroundColor: C.white,
    shadowColor: C.greenMid,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  fieldWrapErr: {
    borderColor: C.err,
    backgroundColor: '#fff5f5',
  },
  fieldWrapOk: {
    borderColor: C.greenMid,
    backgroundColor: C.greenPale,
  },
  fieldDots: {
    flex: 1,
    fontFamily: font.bold,
    fontSize: 22,
    letterSpacing: 6,
  },
  eyeBtn: {
    padding: 6,
  },
  fieldHint: {
    fontFamily: font.medium,
    fontSize: 11,
    marginTop: 6,
  },
  hintInfo: { color: C.graySoft },
  hintOk: { color: C.greenMid },
  hintErr: { color: C.err },
  errBanner: {
    marginTop: 12,
    textAlign: 'center',
    fontFamily: font.medium,
    fontSize: 14,
    color: C.err,
  },
  numpad: {
    marginTop: 18,
    marginBottom: 18,
  },
  keyRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
  },
  numBtn: {
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 2,
  },
  numBtnClear: {
    backgroundColor: C.clearBg,
    borderWidth: 1.5,
    borderColor: '#fecdd3',
  },
  numBtnGo: {
    borderRadius: 14,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goIcon: { zIndex: 1 },
  keyNum: {
    fontFamily: font.semiBold,
    fontSize: 20,
    lineHeight: 24,
  },
  keySub: {
    fontFamily: font.regular,
    fontSize: 7,
    letterSpacing: 1,
    marginTop: 1,
  },
  ctaGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 4,
  },
  ctaText: {
    fontFamily: font.semiBold,
    fontSize: 15,
    color: C.white,
  },
});
