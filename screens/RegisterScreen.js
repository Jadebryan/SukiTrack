import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useMemo, useState } from 'react';
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
import {
  OnboardingHeader,
  OnboardingStepPill,
  ONBOARDING_STEP_REGISTER,
  ONBOARDING_TOTAL_STEPS,
} from '@/components/OnboardingStepChrome';
import { isApiConfigured } from '@/constants/apiConfig';
import { font } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import * as authApi from '@/services/authApi';
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
  err: '#e74c3c',
};

const HERO_PAD_BOTTOM = 44;

/** @returns {{ bars: number, labelKey: string | null }} */
function passwordStrength(pw) {
  const len = pw.length;
  if (!len) return { bars: 0, labelKey: null };
  const hasNum = /\d/.test(pw);
  const hasLetter = /[a-zA-Z]/.test(pw);
  const hasSpecial = /[^a-zA-Z0-9]/.test(pw);
  let bars = 0;
  if (len >= 4) bars = 1;
  if (len >= 6) bars = 2;
  if (len >= 8 && hasNum && hasLetter) bars = 3;
  else if (len >= 8) bars = 2;
  if (
    len >= 10 &&
    hasNum &&
    hasLetter &&
    (hasSpecial || len >= 12)
  ) {
    bars = 4;
  }
  const keys = [null, 'register_pwWeak', 'register_pwFair', 'register_pwGood', 'register_pwStrong'];
  return { bars, labelKey: keys[bars] };
}

export function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useLocale();
  const { signIn } = useAuth();
  const keyboardPad = useKeyboardHeight(true);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const strength = useMemo(() => passwordStrength(password), [password]);
  const { scrollContentPaddingBottom, cardPaddingBottom: cardPadBottom } =
    authStackBottomPads(insets.bottom, keyboardPad);

  const onBackNav = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/welcome');
  };

  const submit = async () => {
    setError('');
    if (!isApiConfigured()) {
      setError(t('register_errApi'));
      return;
    }
    const em = String(email).trim().toLowerCase();
    if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      setError(t('register_errEmailInvalid'));
      return;
    }
    if (!password || password.length < 8) {
      setError(t('register_errPwShort'));
      return;
    }
    if (password.length > 128) {
      setError(t('register_errPwLong'));
      return;
    }
    if (!/[A-Za-z]/.test(password)) {
      setError(t('register_errPwNeedLetter'));
      return;
    }
    if (!/\d/.test(password)) {
      setError(t('register_errPwNeedDigit'));
      return;
    }
    if (password !== confirmPw) {
      setError(t('register_errMismatch'));
      return;
    }
    setBusy(true);
    try {
      const data = await authApi.registerAccount({ email: em, password });
      await signIn({
        token: data.token,
        refreshToken: data.refreshToken,
        ownerId: data.ownerId,
        email: data.email,
      });
      router.replace({ pathname: '/setup-pin', params: { flow: 'create' } });
    } catch (e) {
      setError(e?.message || t('register_errFail'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.kav}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.root}>
        <StatusBar style="dark" />
        <OnboardingHeader
          title={t('nav_register')}
          currentStep={ONBOARDING_STEP_REGISTER}
          totalSteps={ONBOARDING_TOTAL_STEPS}
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

            <OnboardingStepPill
              currentStep={ONBOARDING_STEP_REGISTER}
              totalSteps={ONBOARDING_TOTAL_STEPS}
              t={t}
            />
            <RNText style={styles.heroTitle}>{t('register_heroTitle')}</RNText>
            <RNText style={styles.heroSub}>{t('register_heroSub')}</RNText>
          </View>

          <View style={[styles.card, { marginTop: -22, paddingBottom: cardPadBottom }]}>
            <RNText style={styles.fieldLabel}>
              {t('register_emailLabel').toUpperCase()}
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
                value={email}
                onChangeText={(v) => {
                  setEmail(v);
                  setError('');
                }}
                placeholder="name@example.com"
                placeholderTextColor="#aac0b2"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
              />
            </View>

            <RNText style={[styles.fieldLabel, styles.fieldLabelSpaced]}>
              {t('register_password').toUpperCase()}
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
                value={password}
                onChangeText={(v) => {
                  setPassword(v);
                  setError('');
                }}
                placeholder="••••••••"
                placeholderTextColor="#aac0b2"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Pressable
                style={styles.eyeBtn}
                onPress={() => setShowPassword((v) => !v)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={
                  showPassword ? t('auth_hidePassword') : t('auth_showPassword')
                }
              >
                <MaterialCommunityIcons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color={C.graySoft}
                />
              </Pressable>
            </View>

            {password.length > 0 ? (
              <View style={styles.meterWrap}>
                <View style={styles.meterRow}>
                  {[0, 1, 2, 3].map((i) => (
                    <View
                      key={i}
                      style={[
                        styles.meterSeg,
                        {
                          backgroundColor:
                            i < strength.bars ? C.greenMid : '#d5e0da',
                        },
                      ]}
                    />
                  ))}
                </View>
                {strength.labelKey ? (
                  <RNText style={styles.meterLabel}>
                    {t(strength.labelKey)}
                  </RNText>
                ) : null}
              </View>
            ) : null}

            <RNText style={[styles.fieldLabel, styles.fieldLabelSpaced]}>
              {t('register_passwordAgain').toUpperCase()}
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
                value={confirmPw}
                onChangeText={(v) => {
                  setConfirmPw(v);
                  setError('');
                }}
                placeholder={t('register_confirmPlaceholder')}
                placeholderTextColor="#aac0b2"
                secureTextEntry={!showConfirmPw}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Pressable
                style={styles.eyeBtn}
                onPress={() => setShowConfirmPw((v) => !v)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={
                  showConfirmPw ? t('auth_hidePassword') : t('auth_showPassword')
                }
              >
                <MaterialCommunityIcons
                  name={showConfirmPw ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color={C.graySoft}
                />
              </Pressable>
            </View>
            <RNText style={styles.confirmHint}>{t('register_confirmHint')}</RNText>

            {error ? <RNText style={styles.err}>{error}</RNText> : null}

            <Pressable
              onPress={submit}
              disabled={busy}
              style={({ pressed }) => [
                styles.btnPrimary,
                {
                  opacity: busy ? 0.65 : pressed ? 0.92 : 1,
                  transform: [{ scale: pressed && !busy ? 0.98 : 1 }],
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={t('register_nextPin')}
            >
              {busy ? (
                <ActivityIndicator color={C.white} />
              ) : (
                <>
                  <MaterialCommunityIcons
                    name="checkbox-marked-circle-outline"
                    size={22}
                    color={C.white}
                  />
                  <RNText style={styles.btnPrimaryText}>
                    {t('register_nextPin')}
                  </RNText>
                </>
              )}
            </Pressable>

            <View style={styles.footerRow}>
              <RNText style={styles.footerMuted}>
                {t('register_haveFooter')}{' '}
              </RNText>
              <Pressable
                onPress={() => router.push('/sign-in')}
                hitSlop={8}
                accessibilityRole="link"
                accessibilityLabel={t('signIn_title')}
              >
                <RNText style={styles.footerLink}>{t('register_signInCta')}</RNText>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  kav: {
    flex: 1,
  },
  boot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: C.pageBg,
  },
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
  eyeBtn: {
    padding: 6,
  },
  meterWrap: {
    marginTop: 10,
    marginBottom: 0,
  },
  meterRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  meterSeg: {
    flex: 1,
    height: 5,
    borderRadius: 3,
  },
  meterLabel: {
    fontFamily: font.semiBold,
    fontSize: 13,
    color: C.greenMid,
  },
  confirmHint: {
    fontFamily: font.regular,
    fontSize: 12,
    color: C.graySoft,
    marginTop: 8,
    lineHeight: 17,
  },
  err: {
    fontFamily: font.medium,
    fontSize: 14,
    color: C.err,
    marginTop: 14,
    textAlign: 'center',
  },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: C.greenDark,
    borderRadius: 16,
    paddingVertical: 15,
    marginTop: 22,
    marginBottom: 16,
    minHeight: 52,
  },
  btnPrimaryText: {
    fontFamily: font.semiBold,
    fontSize: 16,
    color: C.white,
  },
  footerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  footerMuted: {
    fontFamily: font.regular,
    fontSize: 14,
    color: C.graySoft,
  },
  footerLink: {
    fontFamily: font.semiBold,
    fontSize: 14,
    color: C.greenMid,
    textDecorationLine: 'underline',
    textDecorationStyle: 'dotted',
  },
});
