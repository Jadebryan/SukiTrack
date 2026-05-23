import { useRouter } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { useState } from 'react';
import { Pressable, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Text, TextInput } from 'react-native-paper';
import { AppBackButton } from '@/components/AppBackButton';
import { font } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { useSensitiveScreenCapture } from '@/hooks/useSensitiveScreenCapture';
import * as authApi from '@/services/authApi';
import { safeRouterBack } from '@/utils/safeRouterBack';

const backToSettings = (router) => safeRouterBack(router, '/(tabs)/settings');

export function ChangePasswordScreen() {
  useSensitiveScreenCapture(true);
  const router = useRouter();
  const { t } = useLocale();
  const { user, signIn } = useAuth();
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const topPadding = Math.max(insets.top, 10);

  if (!user?.token) {
    return (
      <View style={styles.screen}>
        <StatusBar barStyle="dark-content" />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.pad, { paddingTop: topPadding }]}
        >
          <View style={styles.topbar}>
            <AppBackButton onPress={() => backToSettings(router)} accessibilityLabel={t('nav_back')} />
            <Text style={styles.pageTitle}>{t('cp_title')}</Text>
            <View style={{ width: 36, height: 36 }} />
          </View>

          <View style={styles.card}>
            <View style={styles.stateIcon}>
              <MaterialCommunityIcons name="shield-alert-outline" size={22} color="#ef4444" />
            </View>
            <Text style={styles.stateTitle}>{t('cp_needSession')}</Text>
            <Button
              mode="contained"
              onPress={() => backToSettings(router)}
              style={styles.primaryBtn}
              contentStyle={styles.primaryBtnContent}
            >
              {t('nav_back')}
            </Button>
          </View>
        </ScrollView>
      </View>
    );
  }

  const submit = async () => {
    setError('');
    if (!next || next.length < 8) {
      setError(t('cp_errPwShort'));
      return;
    }
    if (next.length > 128) {
      setError(t('cp_errPwLong'));
      return;
    }
    if (!/[A-Za-z]/.test(next)) {
      setError(t('cp_errPwNeedLetter'));
      return;
    }
    if (!/\d/.test(next)) {
      setError(t('cp_errPwNeedDigit'));
      return;
    }
    if (next !== confirm) {
      setError(t('cp_errMismatch'));
      return;
    }
    setBusy(true);
    try {
      const data = await authApi.changePassword({
        token: user.token,
        currentPassword: current,
        newPassword: next,
      });
      if (data?.token && data?.refreshToken && data?.ownerId) {
        await signIn({
          token: data.token,
          refreshToken: data.refreshToken,
          ownerId: data.ownerId,
          email: data.email || user.email,
        });
      }
      setDone(true);
    } catch (e) {
      setError(e?.message || t('cp_errFail'));
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <View style={styles.screen}>
        <StatusBar barStyle="dark-content" />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.pad, { paddingTop: topPadding }]}
        >
          <View style={styles.topbar}>
            <AppBackButton onPress={() => backToSettings(router)} accessibilityLabel={t('nav_back')} />
            <Text style={styles.pageTitle}>{t('cp_title')}</Text>
            <View style={{ width: 36, height: 36 }} />
          </View>

          <View style={styles.card}>
            <View style={[styles.stateIcon, { backgroundColor: '#e8f5ed' }]}>
              <MaterialCommunityIcons name="check" size={22} color="#2d8a4e" />
            </View>
            <Text style={styles.stateTitle}>{t('cp_done')}</Text>
            <Button
              mode="contained"
              onPress={() => backToSettings(router)}
              style={styles.primaryBtn}
              contentStyle={styles.primaryBtnContent}
            >
              {t('cp_doneBtn')}
            </Button>
          </View>
        </ScrollView>
      </View>
    );
  }

  const pwIcon = (visible, setVisible) => (
    <TextInput.Icon
      icon={visible ? 'eye-outline' : 'eye-off-outline'}
      onPress={() => setVisible((v) => !v)}
      accessibilityLabel={
        visible ? t('auth_hidePassword') : t('auth_showPassword')
      }
    />
  );

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.pad, { paddingTop: topPadding }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topbar}>
          <AppBackButton onPress={() => backToSettings(router)} accessibilityLabel={t('nav_back')} />
          <Text style={styles.pageTitle}>{t('cp_title')}</Text>
          <View style={{ width: 36, height: 36 }} />
        </View>

        <View style={styles.card}>
          <Text style={styles.heroTitle}>{t('cp_title')}</Text>
          <Text style={styles.heroSub}>{t('cp_errPwShort')}</Text>

          <View style={{ height: 14 }} />

          <TextInput
            mode="outlined"
            label={t('cp_current')}
            value={current}
            onChangeText={setCurrent}
            secureTextEntry={!showCurrent}
            right={pwIcon(showCurrent, setShowCurrent)}
            style={styles.input}
            outlineStyle={styles.inputOutline}
            contentStyle={styles.inputContent}
            autoCapitalize="none"
          />
          <TextInput
            mode="outlined"
            label={t('cp_new')}
            value={next}
            onChangeText={setNext}
            secureTextEntry={!showNext}
            right={pwIcon(showNext, setShowNext)}
            style={styles.input}
            outlineStyle={styles.inputOutline}
            contentStyle={styles.inputContent}
            autoCapitalize="none"
          />
          <TextInput
            mode="outlined"
            label={t('cp_newAgain')}
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry={!showConfirm}
            right={pwIcon(showConfirm, setShowConfirm)}
            style={styles.input}
            outlineStyle={styles.inputOutline}
            contentStyle={styles.inputContent}
            autoCapitalize="none"
          />

          {error ? (
            <View style={styles.errBox}>
              <MaterialCommunityIcons name="alert-circle" size={18} color="#b42318" />
              <Text style={styles.errText}>{error}</Text>
            </View>
          ) : null}

          <Button
            mode="contained"
            onPress={submit}
            loading={busy}
            disabled={busy}
            style={styles.primaryBtn}
            contentStyle={styles.primaryBtnContent}
          >
            {t('cp_submit')}
          </Button>

          <Pressable onPress={() => backToSettings(router)} style={styles.cancelLink}>
            <Text style={styles.cancelText}>{t('common_cancel')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f0f4f1' },
  scroll: { flex: 1 },
  pad: { paddingBottom: 28 },

  topbar: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#dde8df',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pageTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: font.extraBold,
    fontSize: 18,
    color: '#1a2e1f',
    letterSpacing: -0.3,
  },

  stateIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  stateTitle: {
    fontFamily: font.semiBold,
    fontSize: 13,
    color: '#1a2e1f',
    lineHeight: 18,
    marginBottom: 14,
  },

  card: {
    marginTop: 14,
    marginHorizontal: 16,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#dde8df',
    padding: 16,
  },
  heroTitle: { fontFamily: font.extraBold, fontSize: 18, color: '#1a2e1f' },
  heroSub: { fontFamily: font.medium, fontSize: 12, color: '#5a7060', marginTop: 6, lineHeight: 18 },

  input: { marginBottom: 12, backgroundColor: '#ffffff' },
  inputOutline: { borderRadius: 14, borderColor: '#cfe6d6' },
  inputContent: { paddingLeft: 2 },

  errBox: {
    borderWidth: 1,
    borderColor: '#f9c7c7',
    backgroundColor: '#fee2e2',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  errText: { flex: 1, fontFamily: font.medium, color: '#7a271a', lineHeight: 18 },

  primaryBtn: { borderRadius: 14, marginTop: 6, backgroundColor: '#2d8a4e' },
  primaryBtnContent: { paddingVertical: 10 },

  cancelLink: { alignSelf: 'center', marginTop: 10, paddingVertical: 8, paddingHorizontal: 8 },
  cancelText: { fontFamily: font.semiBold, color: '#2d8a4e' },
});
