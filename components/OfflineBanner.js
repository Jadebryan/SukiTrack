import React from 'react';
import { Banner } from 'react-native-paper';
import { useLocale } from '@/contexts/LocaleContext';

export function OfflineBanner({
  visible,
  onDismiss,
  isOffline = true,
  pendingCount = 0,
}) {
  const { t } = useLocale();
  if (!visible) return null;
  const headline = isOffline
    ? t('offline_msg')
    : pendingCount > 0
      ? t('offline_syncPendingTitle', { count: String(pendingCount) })
      : t('offline_msg');
  const sub = isOffline ? t('offline_pullToSync') : t('offline_syncPendingSub');
  const pendingLine =
    pendingCount > 0 && isOffline
      ? `\n\n${t('offline_pendingLine', { count: String(pendingCount) })}`
      : '';
  return (
    <Banner
      visible
      icon={isOffline ? 'cloud-off-outline' : 'cloud-sync-outline'}
      actions={[{ label: t('common_ok'), onPress: onDismiss }]}
    >
      {headline}
      {'\n\n'}
      {sub}
      {pendingLine}
    </Banner>
  );
}
