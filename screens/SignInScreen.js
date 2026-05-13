import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
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
import { authStackBottomPads } from '@/utils/authScreenLayout';

/** Same tokens as `LoginScreen` (Welcome back). */
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

export function SignInScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useLocale();
  const { signIn, refreshPinState } = useAuth();
  const keyboardPad = useKeyboardHeight(true);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const { scrollContentPaddingBottom, cardPaddingBottom: cardPadBottom } =
    authStackBottomPads(insets.bottom, keyboardPad);

  const onBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/welcome');
  };

  const submit = async () => {
    setError('');
    if (!isApiConfigured()) {
      setError(t('signIn_errApi'));
      return;
    }
    const em = String(email).trim().toLowerCase();
    if (!em || !password) {
      setError(t('signIn_errNeedCreds'));
      return;
    }
    setBusy(true);
    try {
      const data = await authApi.loginAccount({ email: em, password });
      await signIn({
        token: data.token,
        refreshToken: data.refreshToken,
        ownerId: data.ownerId,
        email: data.email,
      });
      await refreshPinState();
      router.replace('/');
    } catch (e) {
      setError(e?.message || t('signIn_errFail'));
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
          title={t('nav_signIn')}
          showProgress={false}
          insets={insets}
          onBack={onBack}
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

            <View style={styles.logoIcon}>
              <MaterialCommunityIcons name="account" size={32} color={C.white} />
            </View>
            <RNText style={styles.brand}>
              Suki
              <RNText
                style={{
                  color: C.greenLight,
                  fontFamily: font.extraBold,
                  fontSize: 32,
                  letterSpacing: -0.5,
                }}
              >
                Track
              </RNText>
            </RNText>
            <RNText style={styles.tagline}>{t('login_tagline')}</RNText>
          </View>

          <View style={[styles.card, { marginTop: -22, paddingBottom: cardPadBottom }]}>
            <RNText style={styles.greeting}>{t('login_welcomeBack')}</RNText>
            <RNText style={styles.cardHint}>{t('signIn_cardHint')}</RNText>

            <RNText style={styles.inputLabel}>
              {t('signIn_email').toUpperCase()}
            </RNText>
            <View
              style={[
                styles.fieldWrap,
                styles.fieldWrapEmail,
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

            <RNText style={[styles.inputLabel, styles.inputLabelAfterField]}>
              {t('signIn_password').toUpperCase()}
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
                  size={18}
                  color={C.graySoft}
                />
              </Pressable>
            </View>

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
              accessibilityLabel={t('signIn_submitBtn')}
            >
              {busy ? (
                <ActivityIndicator color={C.white} />
              ) : (
                <RNText style={styles.btnPrimaryText}>{t('signIn_submitBtn')}</RNText>
              )}
            </Pressable>

            <View style={styles.footerRow}>
              <Pressable
                onPress={() => router.push('/forgot-pin')}
                hitSlop={8}
                accessibilityRole="link"
              >
                <RNText style={styles.linkMuted}>{t('login_forgotPin')}</RNText>
              </Pressable>
              <Pressable
                onPress={() => router.push('/register')}
                hitSlop={8}
                accessibilityRole="link"
              >
                <RNText style={styles.linkPrimary}>{t('signIn_noAccount')}</RNText>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  kav: { flex: 1 },
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
    alignItems: 'center',
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
  logoIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  brand: {
    fontFamily: font.extraBold,
    fontSize: 32,
    color: C.white,
    letterSpacing: -0.5,
  },
  tagline: {
    fontFamily: font.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 6,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  card: {
    backgroundColor: C.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 28,
    paddingTop: 22,
  },
  greeting: {
    fontFamily: font.extraBold,
    fontSize: 20,
    color: C.charcoal,
    marginBottom: 8,
  },
  cardHint: {
    fontFamily: font.regular,
    fontSize: 13,
    color: C.graySoft,
    lineHeight: 19,
    marginBottom: 20,
  },
  inputLabel: {
    fontFamily: font.semiBold,
    fontSize: 11,
    color: C.greenMid,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  inputLabelAfterField: {
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
  fieldWrapEmail: {
    marginBottom: 4,
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
  err: {
    fontFamily: font.medium,
    fontSize: 14,
    color: C.err,
    marginTop: 14,
    textAlign: 'center',
  },
  btnPrimary: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.greenDark,
    borderRadius: 16,
    paddingVertical: 15,
    marginTop: 22,
    marginBottom: 20,
    minHeight: 52,
  },
  btnPrimaryText: {
    fontFamily: font.semiBold,
    fontSize: 16,
    color: C.white,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  linkPrimary: {
    fontFamily: font.semiBold,
    fontSize: 13,
    color: C.greenMid,
    textDecorationLine: 'underline',
    textDecorationStyle: 'dotted',
  },
  linkMuted: {
    fontFamily: font.medium,
    fontSize: 13,
    color: C.graySoft,
  },
});
