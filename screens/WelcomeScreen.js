import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text as RNText,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useFadeSlideIn, usePressScale } from '@/utils/animations';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isApiConfigured } from '@/constants/apiConfig';
import { font } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { getSessionResumeHref } from '@/utils/authResumePath';
import { authStackBottomPads } from '@/utils/authScreenLayout';

/** Same palette + hero/card rhythm as `LoginScreen` (Welcome back). */
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
  warnBg: '#fff3e0',
  warnFg: '#b45309',
};

const HERO_PAD_BOTTOM = 44;

export function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useLocale();
  const {
    authReady,
    sessionLoading,
    pinReady,
    pinUnlocked,
    hasPin,
    user,
  } = useAuth();
  const apiOk = isApiConfigured();

  if (!authReady || sessionLoading || !pinReady) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const resumeHref = getSessionResumeHref({ user, hasPin, pinUnlocked });
  if (resumeHref) {
    return <Redirect href={resumeHref} />;
  }

  const steps = [
    {
      n: 1,
      title: t('welcome_step1Title'),
      desc: t('welcome_step1Desc'),
    },
    {
      n: 2,
      title: t('welcome_step2Title'),
      desc: t('welcome_step2Desc'),
    },
    {
      n: 3,
      title: t('welcome_step3Title'),
      desc: t('welcome_step3Desc'),
    },
  ];

  const screenStyle = useFadeSlideIn();

  const { cardPaddingBottom: cardPadBottom } = authStackBottomPads(
    insets.bottom,
    0,
  );

  const { animatedStyle: btnPrimaryStyle, onPressIn: onPrimaryIn, onPressOut: onPrimaryOut } = usePressScale(0.96);
  const { animatedStyle: btnSecondaryStyle, onPressIn: onSecondaryIn, onPressOut: onSecondaryOut } = usePressScale(0.96);

  return (
    <Animated.View style={[styles.root, screenStyle]}>
      <StatusBar style="light" />
      <View pointerEvents="none" style={styles.blobTop} />
      <View pointerEvents="none" style={styles.blobBottom} />

      <ScrollView
        style={styles.scroll}
        bounces={false}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View
          style={[
            styles.hero,
            {
              paddingBottom: HERO_PAD_BOTTOM,
              paddingTop: Math.max(insets.top, 16) + 20,
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
          <RNText style={styles.tagline}>{t('welcome_tagline')}</RNText>
        </View>

        <View style={[styles.card, { marginTop: -22, paddingBottom: cardPadBottom }]}>
          <RNText style={styles.sectionLabel}>{t('welcome_howItWorks')}</RNText>

          {steps.map((s) => (
            <View key={s.n} style={styles.stepCard}>
              <View style={styles.stepNum}>
                <RNText style={styles.stepNumText}>{s.n}</RNText>
              </View>
              <View style={styles.stepBody}>
                <RNText style={styles.stepTitle}>{s.title}</RNText>
                <RNText style={styles.stepDesc}>{s.desc}</RNText>
              </View>
            </View>
          ))}

          {!apiOk ? (
            <View style={styles.warnBox}>
              <MaterialCommunityIcons
                name="alert-circle-outline"
                size={18}
                color={C.warnFg}
              />
              <RNText style={styles.warnText}>{t('welcome_warnApi')}</RNText>
            </View>
          ) : null}

          <Animated.View style={btnPrimaryStyle}>
            <Pressable
              onPress={() => router.push('/register')}
              onPressIn={onPrimaryIn}
              onPressOut={onPrimaryOut}
              style={styles.btnPrimary}
              accessibilityRole="button"
              accessibilityLabel={t('welcome_createAccount')}
            >
              <MaterialCommunityIcons
                name="account-plus"
                size={22}
                color={C.white}
              />
              <RNText style={styles.btnPrimaryText}>
                {t('welcome_createAccount')}
              </RNText>
            </Pressable>
          </Animated.View>

          <Animated.View style={btnSecondaryStyle}>
            <Pressable
              onPress={() => router.push('/sign-in')}
              onPressIn={onSecondaryIn}
              onPressOut={onSecondaryOut}
              style={styles.btnSecondary}
              accessibilityRole="button"
              accessibilityLabel={t('welcome_haveAccount')}
            >
              <RNText style={styles.btnSecondaryText}>
                {t('welcome_haveAccount')}
              </RNText>
            </Pressable>
          </Animated.View>
        </View>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
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
    flexGrow: 0,
    paddingBottom: 0,
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
    paddingHorizontal: 32,
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
  /** Same as login `inputLabel` (green caps). */
  sectionLabel: {
    fontFamily: font.semiBold,
    fontSize: 11,
    color: C.greenMid,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.greenPale,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
    gap: 12,
    borderWidth: 1,
    borderColor: C.inputBorder,
  },
  stepNum: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.greenDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: {
    fontFamily: font.extraBold,
    fontSize: 16,
    color: C.white,
  },
  stepBody: {
    flex: 1,
    minWidth: 0,
  },
  stepTitle: {
    fontFamily: font.semiBold,
    fontSize: 15,
    color: C.charcoal,
    marginBottom: 2,
  },
  stepDesc: {
    fontFamily: font.regular,
    fontSize: 13,
    color: C.graySoft,
    lineHeight: 18,
  },
  warnBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: C.warnBg,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(180,83,9,0.2)',
  },
  warnText: {
    flex: 1,
    fontFamily: font.medium,
    fontSize: 12,
    color: C.warnFg,
    lineHeight: 17,
  },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: C.greenDark,
    borderRadius: 16,
    paddingVertical: 14,
    marginTop: 8,
    marginBottom: 12,
  },
  btnPrimaryText: {
    fontFamily: font.semiBold,
    fontSize: 16,
    color: C.white,
  },
  btnSecondary: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: C.greenMid,
    backgroundColor: C.white,
    marginBottom: 0,
  },
  btnSecondaryText: {
    fontFamily: font.semiBold,
    fontSize: 15,
    color: C.greenMid,
  },
});
