import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text as RNText,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppConfirmDialog } from '@/components/AppConfirmDialog';
import { font } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { useSensitiveScreenCapture } from '@/hooks/useSensitiveScreenCapture';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import * as pinService from '@/services/pinService';
import { authStackBottomPads } from '@/utils/authScreenLayout';

/** Design tokens (from SukiTrack login artifact) */
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
};

const PIN_SLOTS = 6;
const PIN_VERIFY_DEBOUNCE_MS = 420;
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

/** PIN unlock only (account session already restored). */
export function LoginScreen() {
  useSensitiveScreenCapture(true);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: winW } = Dimensions.get('window');
  const { t } = useLocale();
  const { user, unlockSession, refreshPinState, signOut, sessionLoading } =
    useAuth();
  const keyboardPad = useKeyboardHeight(true);
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [changeAcctOpen, setChangeAcctOpen] = useState(false);
  const pinRef = useRef(pin);
  pinRef.current = pin;

  const emailInitial =
    String(user?.email || '?')
      .trim()
      .charAt(0)
      .toUpperCase() || '?';

  useEffect(() => {
    if (sessionLoading) return;
    if (!user?.token || !user?.ownerId) {
      router.replace('/welcome');
    }
  }, [sessionLoading, user?.token, user?.ownerId, router]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const ms = await pinService.getPinLockoutRemainingMs();
      if (!alive || ms <= 0) return;
      const mins = Math.max(1, Math.ceil(ms / 60000));
      setError(t('login_pinLocked', { minutes: String(mins) }));
    })();
    return () => {
      alive = false;
    };
  }, [t]);

  useEffect(() => {
    if (busy) return;
    const len = pin.length;
    if (len < 4 || len > 6) return;

    const id = setTimeout(() => {
      const p = pinRef.current;
      if (p.length < 4 || p.length > 6) return;

      (async () => {
        if (!user?.token || !user?.ownerId) return;
        setError('');
        setBusy(true);
        try {
          const lockMs = await pinService.getPinLockoutRemainingMs();
          if (lockMs > 0) {
            const mins = Math.max(1, Math.ceil(lockMs / 60000));
            setError(t('login_pinLocked', { minutes: String(mins) }));
            setPin('');
            return;
          }
          const result = await pinService.verifyPinWithLockout(p);
          if (result.locked) {
            const mins = Math.max(
              1,
              Math.ceil((result.remainingMs || 0) / 60000)
            );
            setError(t('login_pinLocked', { minutes: String(mins) }));
            setPin('');
            return;
          }
          if (!result.ok) {
            setError(t('login_errWrongPin'));
            setPin('');
            return;
          }
          await refreshPinState();
          unlockSession();
          router.replace('/(tabs)');
        } catch (e) {
          setError(e?.message || t('login_errGeneric'));
          setPin('');
        } finally {
          setBusy(false);
        }
      })();
    }, PIN_VERIFY_DEBOUNCE_MS);

    return () => clearTimeout(id);
  }, [pin, busy, t, router, refreshPinState, unlockSession, user?.token, user?.ownerId]);

  const onChangeAccount = () => {
    setChangeAcctOpen(true);
  };

  const appendDigit = (d) => {
    if (busy) return;
    setError('');
    if (pin.length >= PIN_SLOTS) return;
    setPin((p) => p + d);
  };

  const backspace = () => {
    if (busy) return;
    setError('');
    setPin((p) => p.slice(0, -1));
  };

  const keyGap = 10;
  const cardPad = 28;
  const keySize = Math.min(
    80,
    (winW - cardPad * 2 - keyGap * 2) / 3
  );

  const pinDisplay =
    pin.length === 0 ? '••••••' : showPin ? pin : '•'.repeat(pin.length);

  const { scrollContentPaddingBottom, cardPaddingBottom } = authStackBottomPads(
    insets.bottom,
    keyboardPad,
  );

  const keypadRow = (keys, rowId, { isLast } = {}) => (
    <View style={[styles.keyRow, { gap: keyGap }, isLast && { marginBottom: 0 }]}>
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
              <View style={{ height: 14 }} />
            )}
          </Pressable>
        );
      })}
    </View>
  );

  const heroPadBottom = 44;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
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
        {/* Hero */}
        <View
          style={[
            styles.hero,
            {
              paddingBottom: heroPadBottom,
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
            <RNText style={styles.tagline}>{t('login_tagline')}</RNText>
          </View>

          {/* Card */}
          <View
            style={[
              styles.card,
              {
                marginTop: -22,
                paddingBottom: cardPaddingBottom,
              },
            ]}
          >
            <RNText style={styles.greeting}>{t('login_welcomeBack')}</RNText>

            {user?.email ? (
              <View style={styles.accountInfo}>
                <LinearGradient
                  colors={[C.greenMid, C.greenBright]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.avatarSm}
                >
                  <RNText style={styles.avatarSmLetter}>{emailInitial}</RNText>
                </LinearGradient>
                <RNText
                  style={styles.accountEmail}
                  numberOfLines={1}
                >
                  {user.email}
                </RNText>
                <Pressable
                  onPress={onChangeAccount}
                  disabled={busy}
                  hitSlop={8}
                  style={({ pressed }) => [
                    styles.switchAccountPress,
                    { opacity: pressed ? 0.75 : busy ? 0.45 : 1 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={t('login_changeAccount')}
                >
                  <RNText style={styles.switchAccountText}>
                    {t('login_changeAccount')}
                  </RNText>
                </Pressable>
              </View>
            ) : (
              <View style={styles.accountRowSwitchOnly}>
                <Pressable
                  onPress={onChangeAccount}
                  disabled={busy}
                  hitSlop={8}
                  style={({ pressed }) => [
                    styles.switchAccountPress,
                    { opacity: pressed ? 0.75 : busy ? 0.45 : 1 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={t('login_changeAccount')}
                >
                  <RNText style={styles.switchAccountText}>
                    {t('login_changeAccount')}
                  </RNText>
                </Pressable>
              </View>
            )}

            <View style={styles.pinDots}>
              {Array.from({ length: PIN_SLOTS }).map((_, i) => {
                const filled = i < pin.length;
                return (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      {
                        backgroundColor: filled ? C.greenMid : 'transparent',
                        borderColor: filled ? C.greenMid : C.greenBright,
                        transform: [{ scale: filled ? 1.1 : 1 }],
                      },
                    ]}
                  />
                );
              })}
            </View>

            <RNText style={styles.inputLabel}>{t('login_enterPin')}</RNText>

            <View
              style={[
                styles.inputFieldWrap,
                {
                  borderColor: C.inputBorder,
                  backgroundColor: C.greenPale,
                },
              ]}
            >
              <RNText
                style={[
                  styles.inputFieldText,
                  {
                    color: pin ? C.charcoal : '#aac0b2',
                    letterSpacing: showPin ? 2 : 4,
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
                  size={18}
                  color={C.graySoft}
                />
              </Pressable>
            </View>

            <View style={styles.pinFieldFooter}>
              <Pressable
                onPress={() => router.push('/forgot-pin')}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.forgotPinPress,
                  { opacity: pressed ? 0.75 : 1 },
                ]}
                accessibilityRole="link"
                accessibilityLabel={t('login_forgotPin')}
              >
                <RNText style={styles.linkPrimary}>{t('login_forgotPin')}</RNText>
              </Pressable>
              <RNText style={styles.hint}>{t('login_pinHint')}</RNText>
            </View>

            {error ? <RNText style={styles.err}>{error}</RNText> : null}

            {busy ? (
              <View style={styles.verifyingRow}>
                <ActivityIndicator color={C.greenMid} />
                <RNText style={[styles.verifyingText, { color: C.graySoft }]}>
                  {t('login_verifying')}
                </RNText>
              </View>
            ) : null}

            <View style={styles.numpad}>
              {keypadRow([1, 2, 3], 'r1')}
              {keypadRow([4, 5, 6], 'r2')}
              {keypadRow([7, 8, 9], 'r3')}
              {keypadRow([{ type: 'bs' }, '0', null], 'r4', { isLast: true })}
            </View>
          </View>
      </ScrollView>

      <AppConfirmDialog
        visible={changeAcctOpen}
        title={t('login_changeAccountTitle')}
        message={t('login_changeAccountMsg')}
        confirmText={t('common_yes')}
        cancelText={t('common_cancel')}
        destructive
        onCancel={() => setChangeAcctOpen(false)}
        onConfirm={async () => {
          setChangeAcctOpen(false);
          await signOut();
          router.replace('/welcome');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.pageBg,
  },
  /**
   * flex:1 fills the screen; content is shorter, so the viewport shows empty space below
   * the card — paint it white so it reads as part of the sheet (not a grey “void”).
   */
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
  greeting: {
    fontFamily: font.extraBold,
    fontSize: 20,
    color: C.charcoal,
    marginBottom: 4,
  },
  accountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 22,
    flexWrap: 'nowrap',
  },
  accountRowSwitchOnly: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 22,
  },
  switchAccountPress: {
    flexShrink: 0,
    paddingVertical: 4,
    paddingLeft: 8,
  },
  switchAccountText: {
    fontFamily: font.semiBold,
    fontSize: 13,
    color: C.greenMid,
  },
  avatarSm: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSmLetter: {
    fontFamily: font.extraBold,
    fontSize: 10,
    color: C.white,
  },
  accountEmail: {
    flex: 1,
    fontFamily: font.medium,
    fontSize: 13,
    color: C.graySoft,
    minWidth: 0,
  },
  pinDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
  },
  dot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2,
  },
  inputLabel: {
    fontFamily: font.semiBold,
    fontSize: 11,
    color: C.greenMid,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  inputFieldWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 14,
    paddingVertical: 10,
    paddingLeft: 14,
    paddingRight: 10,
    minHeight: 44,
    marginBottom: 6,
  },
  pinFieldFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 20,
  },
  forgotPinPress: {
    flexShrink: 0,
    alignSelf: 'flex-start',
  },
  inputFieldText: {
    flex: 1,
    fontFamily: font.bold,
    fontSize: 17,
  },
  eyeBtn: {
    padding: 6,
    marginRight: 2,
  },
  hint: {
    flex: 1,
    fontSize: 12,
    fontFamily: font.medium,
    color: C.graySoft,
    textAlign: 'right',
    minWidth: 0,
  },
  err: {
    color: '#e74c3c',
    marginBottom: 12,
    textAlign: 'center',
    fontFamily: font.medium,
  },
  verifyingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 16,
  },
  verifyingText: {
    fontFamily: font.medium,
    fontSize: 14,
  },
  numpad: {
    marginBottom: 0,
  },
  keyRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
  },
  numBtn: {
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 2,
  },
  numBtnClear: {
    backgroundColor: C.clearBg,
  },
  keyNum: {
    fontFamily: font.semiBold,
    fontSize: 22,
    lineHeight: 26,
  },
  keySub: {
    fontFamily: font.regular,
    fontSize: 8,
    letterSpacing: 1,
    marginTop: 2,
  },
  linkPrimary: {
    fontFamily: font.semiBold,
    fontSize: 13,
    color: C.greenMid,
  },
});
