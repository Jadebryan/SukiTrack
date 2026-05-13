import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  Text as RNText,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OnboardingHeader } from '@/components/OnboardingStepChrome';
import { isApiConfigured } from '@/constants/apiConfig';
import { font } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import * as authApi from '@/services/authApi';
import * as pinService from '@/services/pinService';
import { authStackBottomPads } from '@/utils/authScreenLayout';

const C = {
  greenDark: '#1a5c2e',
  greenMid: '#2d8a4e',
  greenBright: '#3cb96a',
  greenPale: '#e8f7ee',
  charcoal: '#1a1f1c',
  graySoft: '#6b7a72',
  pageBg: '#f0f4f1',
  white: '#ffffff',
  inputBorder: '#e2ede7',
  err: '#e74c3c',
};

const HERO_PAD_BOTTOM = 44;

export function ForgotPinScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useLocale();
  const { signIn, refreshPinState, lockSession } = useAuth();
  const keyboardPad = useKeyboardHeight(true);

  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [resendDeadline, setResendDeadline] = useState(0);
  const [, resendTick] = useState(0);

  useEffect(() => {
    if (!resendDeadline || Date.now() >= resendDeadline) return undefined;
    const id = setInterval(() => {
      resendTick((n) => n + 1);
      if (Date.now() >= resendDeadline) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [resendDeadline]);

  const resendSec =
    resendDeadline > Date.now()
      ? Math.max(0, Math.ceil((resendDeadline - Date.now()) / 1000))
      : 0;

  const { scrollContentPaddingBottom, cardPaddingBottom: cardPadBottom } =
    authStackBottomPads(insets.bottom, keyboardPad);

  const onBackNav = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/welcome');
  };

  const handleHeaderBack = () => {
    if (step === 'code') {
      setStep('email');
      setCode('');
      setError('');
      setInfo('');
      return;
    }
    onBackNav();
  };

  const sendResetCode = async () => {
    setError('');
    setInfo('');
    if (!isApiConfigured()) {
      setError(t('forgot_errApi'));
      return;
    }
    const em = String(email).trim().toLowerCase();
    if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      setError(t('forgot_errNeedEmail'));
      return;
    }
    setBusy(true);
    try {
      await authApi.requestForgotPinCode({ email: em });
      setStep('code');
      setInfo(t('forgot_codeSentHint'));
      setResendDeadline(Date.now() + 60_000);
    } catch (e) {
      setError(e?.message || t('forgot_errSendEmail'));
    } finally {
      setBusy(false);
    }
  };

  const verifySubmit = async () => {
    setError('');
    if (!isApiConfigured()) {
      setError(t('forgot_errApi'));
      return;
    }
    const em = String(email).trim().toLowerCase();
    const digits = String(code).replace(/\D/g, '');
    if (digits.length !== 6) {
      setError(t('forgot_errNeedCode'));
      return;
    }
    setBusy(true);
    try {
      const data = await authApi.verifyForgotPinCode({ email: em, code: digits });
      await signIn({
        token: data.token,
        refreshToken: data.refreshToken,
        ownerId: data.ownerId,
        email: data.email,
      });
      await pinService.clearPin();
      await refreshPinState();
      lockSession();
      router.replace({ pathname: '/setup-pin', params: { flow: 'reset' } });
    } catch (e) {
      setError(e?.message || t('forgot_errFail'));
    } finally {
      setBusy(false);
    }
  };

  const primaryAction = step === 'email' ? sendResetCode : verifySubmit;
  const primaryLabel =
    step === 'email' ? t('forgot_sendCodeBtn') : t('forgot_submitBtn');
  const primaryIcon =
    step === 'email' ? 'email-outline' : 'shield-check-outline';

  return (
    <KeyboardAvoidingView
      style={styles.kav}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.root}>
        <StatusBar style="dark" />
        <OnboardingHeader
          title={t('forgot_title')}
          showProgress={false}
          insets={insets}
          onBack={handleHeaderBack}
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
                paddingBottom: HERO_PAD_BOTTOM,
                paddingTop: 16,
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

            <RNText style={styles.heroTitle}>{t('forgot_heroTitle')}</RNText>
            <RNText style={styles.heroSub}>{t('forgot_heroSub')}</RNText>
          </View>

          <View style={[styles.card, { marginTop: -22, paddingBottom: cardPadBottom }]}>
            <View style={styles.infoBox}>
              <View style={styles.infoIconWrap}>
                <MaterialCommunityIcons
                  name="information"
                  size={18}
                  color={C.white}
                />
              </View>
              <RNText style={styles.infoText}>{t('forgot_infoBox')}</RNText>
            </View>

            <RNText style={styles.fieldLabel}>
              {t('forgot_emailLabel').toUpperCase()}
            </RNText>
            <View
              style={[
                styles.fieldWrap,
                {
                  borderColor: C.inputBorder,
                  backgroundColor: C.greenPale,
                  opacity: step === 'code' ? 0.72 : 1,
                },
              ]}
            >
              <TextInput
                style={styles.fieldInput}
                value={email}
                onChangeText={(v) => {
                  setEmail(v);
                  setError('');
                  setInfo('');
                }}
                placeholder={t('forgot_emailPlaceholder')}
                placeholderTextColor="#aac0b2"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                editable={step === 'email'}
              />
            </View>

            {step === 'code' ? (
              <>
                <RNText style={[styles.fieldLabel, styles.fieldLabelSpaced]}>
                  {t('forgot_codeLabel').toUpperCase()}
                </RNText>
                <View
                  style={[
                    styles.fieldWrap,
                    {
                      borderColor: C.inputBorder,
                      backgroundColor: C.greenPale,
                    },
                  ]}
                >
                  <TextInput
                    style={styles.fieldInput}
                    value={code}
                    onChangeText={(v) => {
                      const d = String(v).replace(/\D/g, '').slice(0, 6);
                      setCode(d);
                      setError('');
                    }}
                    placeholder={t('forgot_codePlaceholder')}
                    placeholderTextColor="#aac0b2"
                    keyboardType="number-pad"
                    maxLength={6}
                    autoFocus
                  />
                </View>
                {info ? <RNText style={styles.okHint}>{info}</RNText> : null}
                <Pressable
                  onPress={() => {
                    setStep('email');
                    setCode('');
                    setError('');
                    setInfo('');
                  }}
                  hitSlop={10}
                  accessibilityRole="button"
                  style={styles.secondaryLinkWrap}
                >
                  <RNText style={styles.secondaryLink}>
                    {t('forgot_changeEmail')}
                  </RNText>
                </Pressable>
                <Pressable
                  onPress={sendResetCode}
                  disabled={busy || resendSec > 0}
                  hitSlop={10}
                  accessibilityRole="button"
                  style={styles.secondaryLinkWrap}
                >
                  <RNText
                    style={[
                      styles.secondaryLink,
                      (busy || resendSec > 0) && styles.secondaryLinkDisabled,
                    ]}
                  >
                    {resendSec > 0
                      ? t('forgot_resendWait', { s: resendSec })
                      : t('forgot_resendCode')}
                  </RNText>
                </Pressable>
              </>
            ) : null}

            {error ? <RNText style={styles.err}>{error}</RNText> : null}

            <Pressable
              onPress={primaryAction}
              disabled={busy}
              style={({ pressed }) => [
                styles.btnWrap,
                {
                  opacity: busy ? 0.65 : pressed ? 0.92 : 1,
                  transform: [{ scale: pressed && !busy ? 0.98 : 1 }],
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={primaryLabel}
            >
              <LinearGradient
                colors={[C.greenDark, C.greenMid, C.greenBright]}
                locations={[0, 0.45, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.btnInner}>
                {busy ? (
                  <ActivityIndicator color={C.white} />
                ) : (
                  <>
                    <MaterialCommunityIcons
                      name={primaryIcon}
                      size={22}
                      color={C.white}
                    />
                    <RNText style={styles.btnPrimaryText}>{primaryLabel}</RNText>
                  </>
                )}
              </View>
            </Pressable>

            <Pressable
              onPress={() => router.replace('/sign-in')}
              hitSlop={10}
              accessibilityRole="link"
              style={styles.footerLinkWrap}
            >
              <RNText style={styles.footerMuted}>{t('forgot_backSignIn')}</RNText>
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
  scroll: {
    flex: 1,
    alignSelf: 'stretch',
    backgroundColor: C.white,
  },
  scrollContent: {
    flexGrow: 1,
  },
  blobTop: {
    position: 'absolute',
    top: -100,
    right: -80,
    width: 280,
    height: 280,
    borderRadius: 999,
    backgroundColor: 'rgba(60,185,106,0.14)',
  },
  blobBottom: {
    position: 'absolute',
    bottom: -60,
    left: -60,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: 'rgba(45,138,78,0.1)',
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
    bottom: -100,
    right: -50,
    width: 220,
    height: 220,
    borderRadius: 110,
  },
  heroTitle: {
    fontFamily: font.extraBold,
    fontSize: 26,
    color: C.white,
    letterSpacing: -0.4,
    lineHeight: 32,
    marginBottom: 10,
    textAlign: 'left',
    alignSelf: 'stretch',
  },
  heroSub: {
    fontFamily: font.regular,
    fontSize: 14,
    color: 'rgba(255,255,255,0.88)',
    lineHeight: 21,
    maxWidth: 340,
    textAlign: 'left',
    alignSelf: 'stretch',
  },
  card: {
    backgroundColor: C.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 28,
    paddingTop: 22,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  infoIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ea580c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    flex: 1,
    fontFamily: font.regular,
    fontSize: 13,
    color: '#9a3412',
    lineHeight: 19,
  },
  fieldLabel: {
    fontFamily: font.semiBold,
    fontSize: 11,
    color: C.greenMid,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  fieldLabelSpaced: {
    marginTop: 16,
  },
  fieldWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 14,
    paddingVertical: 4,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  fieldInput: {
    flex: 1,
    fontFamily: font.medium,
    fontSize: 16,
    color: C.charcoal,
    paddingVertical: 8,
    minHeight: 40,
  },
  okHint: {
    fontFamily: font.medium,
    fontSize: 13,
    color: C.greenMid,
    marginTop: 12,
    lineHeight: 19,
  },
  secondaryLinkWrap: {
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  secondaryLink: {
    fontFamily: font.semiBold,
    fontSize: 14,
    color: C.greenMid,
  },
  secondaryLinkDisabled: {
    color: C.graySoft,
  },
  err: {
    fontFamily: font.medium,
    fontSize: 14,
    color: C.err,
    marginTop: 14,
    textAlign: 'center',
  },
  btnWrap: {
    borderRadius: 16,
    overflow: 'hidden',
    minHeight: 52,
    marginTop: 22,
    marginBottom: 18,
  },
  btnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 15,
  },
  btnPrimaryText: {
    fontFamily: font.semiBold,
    fontSize: 16,
    color: C.white,
  },
  footerLinkWrap: {
    alignSelf: 'center',
    paddingVertical: 6,
    marginBottom: 4,
  },
  footerMuted: {
    fontFamily: font.medium,
    fontSize: 14,
    color: C.graySoft,
    textAlign: 'center',
  },
});
