import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as ScreenCapture from 'expo-screen-capture';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text, TextInput, useTheme } from 'react-native-paper';
import { KeyboardAwareOverlayModal } from '@/components/KeyboardAwareOverlayModal';
import { font } from '@/constants/theme';
import { useLocale } from '@/contexts/LocaleContext';
import * as pinService from '@/services/pinService';

/**
 * PIN-gated confirmation modal.
 *
 * @param {object} props
 * @param {boolean} props.visible
 * @param {() => void} props.onDismiss
 * @param {string} props.title
 * @param {string} props.message
 * @param {string} props.confirmText
 * @param {string} props.cancelText
 * @param {() => Promise<void> | void} props.onConfirmed
 */
export function VerifyPinModal({
  visible,
  onDismiss,
  title,
  message,
  confirmText,
  cancelText,
  onConfirmed,
}) {
  const { t } = useLocale();
  const theme = useTheme();
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const pinOk = useMemo(() => pin.length >= 4 && pin.length <= 6, [pin]);

  useEffect(() => {
    if (!visible) return;
    setPin('');
    setBusy(false);
    let alive = true;
    setErr('');
    (async () => {
      const ms = await pinService.getPinLockoutRemainingMs();
      if (!alive) return;
      if (ms > 0) {
        const mins = Math.max(1, Math.ceil(ms / 60000));
        setErr(t('login_pinLocked', { minutes: String(mins) }));
      }
    })();
    return () => {
      alive = false;
    };
  }, [visible, t]);

  useEffect(() => {
    if (!visible) {
      void ScreenCapture.allowScreenCaptureAsync().catch(() => {});
      return undefined;
    }
    void ScreenCapture.preventScreenCaptureAsync().catch(() => {});
    return () => {
      void ScreenCapture.allowScreenCaptureAsync().catch(() => {});
    };
  }, [visible]);

  const submit = async () => {
    if (!pinOk || busy) return;
    setBusy(true);
    setErr('');
    try {
      const result = await pinService.verifyPinWithLockout(pin);
      if (result.locked) {
        const mins = Math.max(
          1,
          Math.ceil((result.remainingMs || 0) / 60000)
        );
        setErr(t('login_pinLocked', { minutes: String(mins) }));
        return;
      }
      if (!result.ok) {
        setErr(t('login_errWrongPin'));
        return;
      }
      await onConfirmed?.();
      onDismiss();
    } catch (e) {
      setErr(e?.message || t('common_error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAwareOverlayModal
      visible={visible}
      onDismiss={onDismiss}
      dismissable={!busy}
      renderContent={({ sheetMaxHeight }) => (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={{ maxHeight: sheetMaxHeight }}
          contentContainerStyle={styles.sheet}
        >
          <View style={styles.head}>
            <View style={styles.iconBubble}>
              <MaterialCommunityIcons
                name="shield-lock-outline"
                size={20}
                color="#ef4444"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{title}</Text>
              <Text style={[styles.msg, { color: theme.colors.onSurfaceVariant }]}>
                {message}
              </Text>
            </View>
          </View>

          <TextInput
            mode="outlined"
            label={t('login_pinLabel')}
            value={pin}
            onChangeText={(v) => setPin(String(v || '').replace(/\D+/g, '').slice(0, 6))}
            keyboardType="number-pad"
            secureTextEntry
            style={styles.input}
          />
          {err ? <Text style={styles.err}>{err}</Text> : null}

          <View style={styles.actions}>
            <Button onPress={onDismiss} disabled={busy}>
              {cancelText}
            </Button>
            <Button
              mode="contained"
              buttonColor="#ef4444"
              onPress={submit}
              loading={busy}
              disabled={busy || !pinOk}
            >
              {confirmText}
            </Button>
          </View>
        </ScrollView>
      )}
    />
  );
}

const styles = StyleSheet.create({
  sheet: { padding: 18, paddingBottom: 16 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  iconBubble: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontFamily: font.extraBold, fontSize: 16 },
  msg: { marginTop: 3, lineHeight: 18, opacity: 0.95, fontSize: 12 },
  input: { marginTop: 8 },
  err: { marginTop: 10, color: '#b42318' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 14 },
});

