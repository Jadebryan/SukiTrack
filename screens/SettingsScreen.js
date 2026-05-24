import Constants from 'expo-constants';
import * as Clipboard from 'expo-clipboard';
import { useFocusEffect, useRouter } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { useCallback, useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  Button,
  Dialog,
  Portal,
  Switch,
  Text,
  useTheme,
} from 'react-native-paper';
import { AppChoiceDialog } from '@/components/AppChoiceDialog';
import { AppConfirmDialog } from '@/components/AppConfirmDialog';
import { VerifyPinModal } from '@/components/VerifyPinModal';
import { getApiDisplayHost, isApiConfigured } from '@/constants/apiConfig';
import { APP_DISPLAY_NAME } from '@/constants/appInfo';
import { font } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useAppTheme } from '@/contexts/AppThemeContext';
import { useLocale } from '@/contexts/LocaleContext';
import { useShopData } from '@/contexts/ShopDataContext';
import { useToast } from '@/contexts/ToastContext';
import { useCustomers } from '@/hooks/useCustomers';
import { useAllPages } from '@/hooks/useTransactions';
import { exportJsonToShare } from '@/services/exportService';
import { clearShopCache } from '@/services/localCacheService';
import * as pinService from '@/services/pinService';
import * as preferencesService from '@/services/preferencesService';
import { formatDateTime } from '@/utils/date';

function emailUsername(email) {
  const s = String(email || '').trim();
  const at = s.indexOf('@');
  return at > 0 ? s.slice(0, at) : s;
}

function emailDomain(email) {
  const s = String(email || '').trim();
  const at = s.indexOf('@');
  return at >= 0 ? s.slice(at) : '';
}

function RowIcon({ name, bg, color }) {
  return (
    <View style={[styles.rowIcon, { backgroundColor: bg }]}>
      <MaterialCommunityIcons name={name} size={18} color={color} />
    </View>
  );
}

function SettingsRow({
  icon,
  iconBg,
  iconColor,
  title,
  subtitle,
  danger,
  right,
  onPress,
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.92 }]}
      accessibilityRole="button"
    >
      <RowIcon name={icon} bg={iconBg} color={iconColor} />
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, danger && styles.rowTitleDanger]}>
          {title}
        </Text>
        {subtitle ? <Text style={styles.rowSub}>{subtitle}</Text> : null}
      </View>
      {right || <MaterialCommunityIcons name="chevron-right" size={18} color="#9ab09e" />}
    </Pressable>
  );
}

export function SettingsScreen() {
  const router = useRouter();
  const { t, locale, setLocale } = useLocale();
  const { showToast } = useToast();
  const { user, lockSession, signOut } = useAuth();
  const { isDark, setDarkMode } = useAppTheme();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { refresh } = useShopData();
  const { customers } = useCustomers(user?.ownerId);
  const { pages, inventory } = useAllPages(user?.ownerId);
  const [exporting, setExporting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [backupOpen, setBackupOpen] = useState(false);
  const [lastExportIso, setLastExportIso] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmCfg, setConfirmCfg] = useState(null);
  const [pinStepUp, setPinStepUp] = useState(null);
  const [pinTimeoutMs, setPinTimeoutMs] = useState(0);
  const [pinTimeoutOpen, setPinTimeoutOpen] = useState(false);
  const [pinTimeoutDraft, setPinTimeoutDraft] = useState(0);
  const [langOpen, setLangOpen] = useState(false);
  const [langDraft, setLangDraft] = useState(locale);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const loadLastExport = useCallback(async () => {
    const v = await preferencesService.getLastExportAt();
    setLastExportIso(v);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadLastExport();
    }, [loadLastExport])
  );

  const lastExportLabel = lastExportIso
    ? t('settings_lastExportAt', { date: formatDateTime(lastExportIso) })
    : t('settings_lastExportNever');

  const dataSummary = t('settings_dataSummary', {
    customers: customers.length,
    pages: pages.length,
    products: inventory.length,
  });

  /** @returns {Promise<boolean>} true if export succeeded */
  const runExport = async () => {
    setExporting(true);
    try {
      await exportJsonToShare({
        customers,
        pages,
        inventory,
        meta: {
          ownerId: user?.ownerId,
          email: user?.email,
          version: Constants.expoConfig?.version || '1.0.0',
        },
      });
      const iso = new Date().toISOString();
      await preferencesService.setLastExportAt(iso);
      setLastExportIso(iso);
      showToast({ type: 'success', message: t('toast_exportReady') });
      return true;
    } catch (e) {
      showToast({
        type: 'error',
        message: e?.message || t('settings_exportErr'),
      });
      return false;
    } finally {
      setExporting(false);
    }
  };

  const onSyncData = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const result = await refresh();
      if (result?.ok) {
        showToast({ type: 'success', message: t('toast_syncDone') });
      } else {
        showToast({
          type: 'error',
          message: result?.error?.message || t('common_error'),
        });
      }
    } finally {
      setSyncing(false);
    }
  };

  const requestExport = (closeBackupAfter) => {
    if (exporting) return;
    void (async () => {
      if (await pinService.hasPin()) {
        setPinStepUp({ kind: 'export', closeBackupAfter: !!closeBackupAfter });
        return;
      }
      const ok = await runExport();
      if (ok && closeBackupAfter) setBackupOpen(false);
    })();
  };

  const onOpenChangePassword = () => {
    if (!user?.token) {
      showToast({ type: 'error', message: t('cp_needSession') });
      return;
    }
    void (async () => {
      if (await pinService.hasPin()) {
        setPinStepUp({ kind: 'changePw' });
        return;
      }
      router.push('/change-password');
    })();
  };

  const onCopyAccountEmail = async () => {
    const em = String(user?.email || '').trim();
    if (!em) return;
    try {
      await Clipboard.setStringAsync(em);
      showToast({ type: 'success', message: t('toast_emailCopied') });
    } catch {
      showToast({ type: 'error', message: t('common_error') });
    }
  };

  const onClearCache = () => {
    if (!user?.ownerId) return;
    setConfirmCfg({
      title: t('settings_clearCacheConfirmTitle'),
      message: t('settings_clearCacheConfirmMsg'),
      destructive: false,
      confirmText: t('common_yes'),
      cancelText: t('common_no'),
      onConfirm: async () => {
        try {
          await clearShopCache(user.ownerId);
          await refresh();
          showToast({
            type: 'success',
            message: t('settings_clearCacheDone'),
          });
        } catch (e) {
          showToast({
            type: 'error',
            message: e?.message || t('common_error'),
          });
        }
      },
    });
    setConfirmOpen(true);
  };

  const onLock = () => {
    lockSession();
    router.replace('/login');
  };

  const onSignOut = () => {
    setConfirmCfg({
      title: t('settings_signOutConfirmTitle'),
      message: t('settings_signOutConfirmMsg'),
      destructive: true,
      confirmText: t('common_yes'),
      cancelText: t('common_no'),
      onConfirm: async () => {
        await signOut();
        router.replace('/welcome');
      },
    });
    setConfirmOpen(true);
  };

  const version =
    Constants.expoConfig?.version ||
    Constants.nativeAppVersion ||
    '1.0.0';
  const apiStatus = isApiConfigured()
    ? t('settings_apiHost', { host: getApiDisplayHost() })
    : t('settings_apiMissingShort');

  const username = useMemo(() => emailUsername(user?.email), [user?.email]);
  const domain = useMemo(() => emailDomain(user?.email), [user?.email]);

  const C = useMemo(() => {
    const fallbackBg = isDark ? theme.colors.background : '#f0f4f1';
    const fallbackBorder = isDark ? theme.colors.outlineVariant || theme.colors.outline : '#dde8df';
    const sub = isDark ? theme.colors.onSurfaceVariant : '#9ab09e';
    const sub2 = isDark ? theme.colors.onSurfaceVariant : '#5a7060';
    return {
      bg: fallbackBg,
      surface: theme.colors.surface,
      border: fallbackBorder,
      text: theme.colors.onSurface,
      text2: sub2,
      text3: sub,
      green: '#2d8a4e',
      greenLight: '#e8f5ed',
      amber: '#f59e0b',
      amberLight: '#fef3c7',
      red: '#ef4444',
      redLight: '#fee2e2',
      surface2: isDark ? theme.colors.elevation?.level2 || theme.colors.surfaceVariant : '#f0f4f1',
    };
  }, [isDark, theme]);

  // load PIN timeout preference
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void (async () => {
        const v = await preferencesService.getPinUnlockTimeoutMs();
        if (!alive) return;
        setPinTimeoutMs(v || 0);
        setPinTimeoutDraft(v || 0);
      })();
      return () => {
        alive = false;
      };
    }, [])
  );

  function formatPinTimeoutLabel(ms) {
    if (!ms || ms <= 0) return 'Require PIN every login';
    const mins = Math.round(ms / 60000);
    if (mins < 60) return `Require PIN after ${mins} minute${mins === 1 ? '' : 's'}`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `Require PIN after ${hours} hour${hours === 1 ? '' : 's'}`;
    const days = Math.round(hours / 24);
    return `Require PIN after ${days} day${days === 1 ? '' : 's'}`;
  }

  return (
    <View style={[styles.screen, { backgroundColor: C.bg }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.pad,
          { paddingTop: Math.max(insets.top, 10), backgroundColor: C.bg },
        ]}
      >
        <View style={[styles.topbar, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
          <View style={{ width: 32, height: 32 }} />
          <Text style={styles.pageTitle}>{t('tab_settings')}</Text>
          <View style={{ width: 32, height: 32 }} />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { marginBottom: 6 }]}>
            {t('settings_accountTitle')}
          </Text>
        </View>

        <Pressable
          onPress={() => setAccountOpen(true)}
          style={({ pressed }) => [styles.profileCard, pressed && { opacity: 0.92 }]}
          accessibilityRole="button"
          accessibilityLabel={t('settings_accountA11y', {
            email: user?.email || t('settings_accountNoEmail'),
          })}
        >
          <View style={styles.profileAvatar}>
            <MaterialCommunityIcons name="account" size={20} color="#ffffff" />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.profileName} numberOfLines={1}>
              {username || APP_DISPLAY_NAME}
            </Text>
            <Text style={styles.profileEmail} numberOfLines={1}>
              {domain || user?.email || ''}
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={18} color="rgba(255,255,255,0.75)" />
        </Pressable>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('settings_data')}</Text>
          <View style={[styles.group, { backgroundColor: C.surface, borderColor: C.border }]}>
            <SettingsRow
              icon="database-export"
              iconBg={C.greenLight}
              iconColor={C.green}
              title={t('settings_exportTitle')}
              subtitle={t('settings_exportDesc')}
              onPress={() => {
                if (!exporting) requestExport(false);
              }}
              right={
                <MaterialCommunityIcons name="chevron-right" size={18} color="#9ab09e" />
              }
            />
            <View style={[styles.div, { backgroundColor: C.border }]} />
            <SettingsRow
              icon="sync"
              iconBg={C.greenLight}
              iconColor={C.green}
              title={t('settings_syncTitle')}
              subtitle={t('settings_syncDesc')}
              onPress={onSyncData}
              right={
                syncing ? (
                  <ActivityIndicator animating size={18} color={C.green} />
                ) : (
                  <MaterialCommunityIcons name="chevron-right" size={18} color="#9ab09e" />
                )
              }
            />
            <View style={[styles.div, { backgroundColor: C.border }]} />
            <SettingsRow
              icon="backup-restore"
              iconBg={C.amberLight}
              iconColor={C.amber}
              title={t('settings_backupTitle')}
              subtitle={`${lastExportLabel} · ${t('settings_backupTapHint')}`}
              onPress={() => setBackupOpen(true)}
            />
            <View style={[styles.div, { backgroundColor: C.border }]} />
            <SettingsRow
              icon="database-off-outline"
              iconBg={C.surface2}
              iconColor={C.text2}
              title={t('settings_clearCacheTitle')}
              subtitle={t('settings_clearCacheDesc')}
              onPress={onClearCache}
              right={
                <MaterialCommunityIcons name="chevron-right" size={18} color="#9ab09e" />
              }
            />
            <View style={[styles.div, { backgroundColor: C.border }]} />
            <Text style={[styles.datamuseFootnote, { color: C.text3 }]}>
              {t('settings_datamusePrivacy')}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('settings_appearance')}</Text>
          <View style={[styles.group, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={styles.row}>
              <RowIcon name="moon-waxing-crescent" bg={C.surface2} color={C.text2} />
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{t('settings_darkTitle')}</Text>
                <Text style={styles.rowSub}>{t('settings_darkDesc')}</Text>
              </View>
              <Switch value={isDark} onValueChange={(v) => setDarkMode(v)} />
            </View>
            <View style={[styles.div, { backgroundColor: C.border }]} />
            <SettingsRow
              icon="translate"
              iconBg={C.greenLight}
              iconColor={C.green}
              title={t('settings_language')}
              subtitle={locale === 'tl' ? t('settings_langFilipino') : t('settings_langEnglish')}
              onPress={() => {
                setLangDraft(locale);
                setLangOpen(true);
              }}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('settings_security')}</Text>
          <View style={[styles.group, { backgroundColor: C.surface, borderColor: C.border }]}>
            <SettingsRow
              icon="lock-outline"
              iconBg={C.greenLight}
              iconColor={C.green}
              title={t('settings_lockTitle')}
              subtitle={t('settings_lockDesc')}
              onPress={onLock}
            />
            <View style={[styles.div, { backgroundColor: C.border }]} />
            <SettingsRow
              icon="timer-sand"
              iconBg={C.surface2}
              iconColor={C.text2}
              title={'PIN timeout'}
              subtitle={formatPinTimeoutLabel(pinTimeoutMs)}
              onPress={() => setPinTimeoutOpen(true)}
            />
            <View style={[styles.div, { backgroundColor: C.border }]} />
            <SettingsRow
              icon="key-variant"
              iconBg={C.amberLight}
              iconColor={C.amber}
              title={t('settings_changePassTitle')}
              onPress={onOpenChangePassword}
            />
            <View style={[styles.div, { backgroundColor: C.border }]} />
            <SettingsRow
              icon="logout"
              iconBg={C.redLight}
              iconColor={C.red}
              title={t('settings_signOutTitle')}
              subtitle={t('settings_signOutDesc')}
              danger
              onPress={onSignOut}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('settings_privacySection')}</Text>
          <View style={[styles.group, { backgroundColor: C.surface, borderColor: C.border }]}>
            <SettingsRow
              icon="shield-account-outline"
              iconBg={C.surface2}
              iconColor={C.text2}
              title={t('settings_privacyTitle')}
              subtitle={t('settings_privacySubtitle')}
              onPress={() => setPrivacyOpen(true)}
            />
          </View>
        </View>

        <View style={[styles.aboutCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={styles.aboutLabel}>{t('settings_aboutTitle')}</Text>
          <Text style={styles.aboutApp}>{APP_DISPLAY_NAME}</Text>
          <Text style={styles.aboutMeta}>{t('settings_versionLabel', { version })}</Text>
          <Text style={[styles.aboutMeta, !isApiConfigured() && styles.aboutWarn]}>
            {apiStatus}
          </Text>
          <Text style={styles.aboutDesc}>{t('settings_aboutBody')}</Text>
          <View style={styles.aboutActions}>
            <Button
              mode="outlined"
              compact
              onPress={() =>
                Linking.openURL('https://www.mongodb.com/docs/atlas/getting-started/')
              }
            >
              {t('settings_mongoBtn')}
            </Button>
          </View>
        </View>
      </ScrollView>

      <Portal>
        <Dialog
          visible={backupOpen}
          onDismiss={() => {
            if (!exporting) setBackupOpen(false);
          }}
          dismissable={!exporting}
          style={[styles.dialog, { backgroundColor: C.surface, borderColor: C.border }]}
        >
          <Dialog.Title style={{ fontFamily: font.extraBold }}>
            {t('settings_backupAlertTitle')}
          </Dialog.Title>
          <Dialog.ScrollArea>
            <ScrollView
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
              style={styles.dialogScroll}
              contentContainerStyle={styles.dialogScrollContent}
            >
              <Text variant="bodyMedium" style={styles.dialogBlock}>
                {t('settings_backupAlertMsg')}
              </Text>
              <View style={styles.backupCard}>
                <View style={styles.backupRow}>
                  <View style={[styles.backupDot, { backgroundColor: C.green }]} />
                  <Text style={styles.backupRowLabel}>{t('settings_exportTitle')}</Text>
                </View>
                <Text style={styles.backupRowSub}>{t('settings_exportDesc')}</Text>
                <View style={[styles.div, { backgroundColor: C.border, marginVertical: 12 }]} />
                <Text style={styles.dialogSummary}>{dataSummary}</Text>
                <Text style={styles.dialogMeta}>{lastExportLabel}</Text>
              </View>
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions style={{ paddingHorizontal: 12, paddingBottom: 10, gap: 8, flexWrap: 'wrap' }}>
            <Button onPress={() => setBackupOpen(false)} disabled={exporting}>
              {t('common_cancel')}
            </Button>
            <Button
              mode="contained"
              onPress={() => {
                if (exporting) return;
                void (async () => {
                  if (await pinService.hasPin()) {
                    setPinStepUp({ kind: 'export', closeBackupAfter: true });
                    return;
                  }
                  const ok = await runExport();
                  if (ok) setBackupOpen(false);
                })();
              }}
              loading={exporting}
              disabled={exporting}
              buttonColor={C.green}
            >
              {t('settings_exportTitle')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <AppChoiceDialog
        visible={pinTimeoutOpen}
        title={'PIN timeout'}
        message={'Choose how long the app should remember your PIN unlock before asking again.'}
        choices={[
          { id: '0', title: 'Require PIN every login', icon: 'lock', iconBg: C.surface2, iconColor: C.text2 },
          { id: String(60_000), title: 'Require PIN after 1 minute', icon: 'timer', iconBg: C.surface2, iconColor: C.text2 },
          { id: String(5 * 60_000), title: 'Require PIN after 5 minutes', icon: 'timer', iconBg: C.surface2, iconColor: C.text2 },
          { id: String(30 * 60_000), title: 'Require PIN after 30 minutes', icon: 'timer', iconBg: C.surface2, iconColor: C.text2 },
          { id: String(24 * 60 * 60_000), title: 'Require PIN after 1 day', icon: 'timer-outline', iconBg: C.surface2, iconColor: C.text2 },
        ]}
        value={String(pinTimeoutDraft)}
        onChange={(v) => setPinTimeoutDraft(Number(v))}
        cancelText={t('common_cancel')}
        confirmText={t('common_ok')}
        onCancel={() => setPinTimeoutOpen(false)}
        onConfirm={async () => {
          await preferencesService.setPinUnlockTimeoutMs(pinTimeoutDraft);
          setPinTimeoutMs(pinTimeoutDraft);
          setPinTimeoutOpen(false);
          showToast({ type: 'success', message: 'PIN timeout updated' });
        }}
      />

      <Portal>
        <Dialog
          visible={accountOpen}
          onDismiss={() => setAccountOpen(false)}
          style={[styles.dialog, { backgroundColor: C.surface, borderColor: C.border }]}
        >
          <Dialog.Title style={{ fontFamily: font.extraBold }}>
            {t('settings_accountTitle')}
          </Dialog.Title>
          <Dialog.Content>
            <Text variant="bodySmall" style={[styles.rowSub, { marginBottom: 8 }]}>
              {t('settings_accountSignedIn')}
            </Text>
            <Text
              variant="bodyLarge"
              selectable
              style={{ fontFamily: font.semiBold, color: C.text }}
            >
              {user?.email || '—'}
            </Text>
          </Dialog.Content>
          <Dialog.Actions style={{ paddingHorizontal: 12, paddingBottom: 10, gap: 8, flexWrap: 'wrap' }}>
            <Button onPress={() => setAccountOpen(false)}>{t('common_cancel')}</Button>
            <Button mode="outlined" onPress={() => void onCopyAccountEmail()}>
              {t('settings_copyEmail')}
            </Button>
            <Button
              mode="contained"
              buttonColor={C.green}
              onPress={() => {
                setAccountOpen(false);
                onOpenChangePassword();
              }}
            >
              {t('settings_changePassTitle')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Portal>
        <Dialog
          visible={privacyOpen}
          onDismiss={() => setPrivacyOpen(false)}
          style={[styles.dialog, { backgroundColor: C.surface, borderColor: C.border }]}
        >
          <Dialog.Title style={{ fontFamily: font.extraBold }}>
            {t('settings_privacyDialogTitle')}
          </Dialog.Title>
          <Dialog.ScrollArea>
            <ScrollView
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
              style={styles.dialogScroll}
              contentContainerStyle={styles.dialogScrollContent}
            >
              <Text variant="bodyMedium" style={styles.dialogBlock}>
                {t('settings_privacyBody')}
              </Text>
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions style={{ paddingHorizontal: 12, paddingBottom: 10 }}>
            <Button mode="contained" onPress={() => setPrivacyOpen(false)} buttonColor={C.green}>
              {t('common_ok')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <AppConfirmDialog
        visible={confirmOpen}
        title={confirmCfg?.title || ''}
        message={confirmCfg?.message || ''}
        confirmText={confirmCfg?.confirmText || t('common_yes')}
        cancelText={confirmCfg?.cancelText || t('common_no')}
        destructive={!!confirmCfg?.destructive}
        onCancel={() => {
          setConfirmOpen(false);
          setConfirmCfg(null);
        }}
        onConfirm={async () => {
          const fn = confirmCfg?.onConfirm;
          setConfirmOpen(false);
          setConfirmCfg(null);
          if (fn) await fn();
        }}
      />

      <AppChoiceDialog
        visible={langOpen}
        title={t('settings_language')}
        message={t('settings_langDesc')}
        choices={[
          {
            id: 'en',
            title: t('settings_langEnglish'),
            subtitle: 'United States',
            icon: 'alphabetical-variant',
            iconBg: C.greenLight,
            iconColor: C.green,
          },
          {
            id: 'tl',
            title: t('settings_langFilipino'),
            subtitle: 'Philippines',
            icon: 'translate',
            iconBg: C.surface2,
            iconColor: C.text2,
          },
        ]}
        value={langDraft}
        onChange={setLangDraft}
        cancelText={t('common_cancel')}
        confirmText={t('common_ok')}
        onCancel={() => setLangOpen(false)}
        onConfirm={async () => {
          const next = langDraft === 'tl' ? 'tl' : 'en';
          await setLocale(next);
          setLangOpen(false);
        }}
      />

      <VerifyPinModal
        visible={pinStepUp != null}
        onDismiss={() => setPinStepUp(null)}
        title={
          pinStepUp?.kind === 'export'
            ? t('settings_stepUpExportTitle')
            : t('settings_stepUpChangePwTitle')
        }
        message={
          pinStepUp?.kind === 'export'
            ? t('settings_stepUpExportMsg')
            : t('settings_stepUpChangePwMsg')
        }
        cancelText={t('common_cancel')}
        confirmText={
          pinStepUp?.kind === 'export'
            ? t('settings_exportTitle')
            : t('common_ok')
        }
        onConfirmed={async () => {
          const step = pinStepUp;
          if (!step) return;
          if (step.kind === 'export') {
            const ok = await runExport();
            if (ok && step.closeBackupAfter) setBackupOpen(false);
          } else if (step.kind === 'changePw') {
            router.push('/change-password');
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  pad: { paddingBottom: 32 },
  topbar: {
    borderBottomWidth: 1,
    marginHorizontal: 0,
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
  profileCard: {
    marginTop: 6,
    marginHorizontal: 16,
    backgroundColor: '#2d8a4e',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileAvatar: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: { fontFamily: font.extraBold, fontSize: 15, color: '#ffffff' },
  profileEmail: { fontFamily: font.medium, fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 2 },

  section: { marginTop: 14, marginHorizontal: 16 },
  sectionLabel: {
    fontFamily: font.semiBold,
    fontSize: 11,
    color: '#9ab09e',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  group: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  datamuseFootnote: {
    fontFamily: font.medium,
    fontSize: 11,
    lineHeight: 16,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
  },
  div: { height: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 16 },
  rowIcon: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, minWidth: 0 },
  rowTitle: { fontFamily: font.semiBold, fontSize: 14, color: '#1a2e1f' },
  rowTitleDanger: { color: '#ef4444' },
  rowSub: { fontFamily: font.medium, fontSize: 11, color: '#9ab09e', marginTop: 1 },

  aboutCard: {
    marginTop: 14,
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  aboutLabel: {
    fontFamily: font.semiBold,
    fontSize: 11,
    color: '#9ab09e',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  aboutApp: { fontFamily: font.extraBold, fontSize: 16, color: '#1a2e1f' },
  aboutMeta: { fontFamily: font.medium, fontSize: 12, color: '#9ab09e', marginTop: 3 },
  aboutWarn: { color: '#ef4444' },
  aboutDesc: { fontFamily: font.medium, fontSize: 12, color: '#5a7060', marginTop: 10, lineHeight: 18 },
  aboutActions: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  dialog: { maxHeight: '88%', alignSelf: 'center', width: '92%', maxWidth: 400 },
  dialogScroll: { maxHeight: 280 },
  dialogScrollContent: { paddingBottom: 8 },
  dialogBlock: { marginBottom: 12, lineHeight: 22 },
  dialogSummary: { fontFamily: font.semiBold, marginBottom: 8 },
  dialogMeta: { opacity: 0.85 },

  // language dialog moved into AppChoiceDialog
});
