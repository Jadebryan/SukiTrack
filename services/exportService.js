import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { APP_DISPLAY_NAME } from '@/constants/appInfo';
import { t } from '@/i18n/strings';

function stableReplacer(key, value) {
  if (value && typeof value === 'object' && value.seconds !== undefined) {
    try {
      return value.toDate ? value.toDate().toISOString() : value;
    } catch {
      return String(value);
    }
  }
  return value;
}

export async function exportJsonToShare({ customers, pages, inventory, meta }) {
  const payload = {
    exportedAt: new Date().toISOString(),
    app: APP_DISPLAY_NAME,
    meta: meta || {},
    customers,
    pages,
    inventory: inventory || [],
  };
  const json = JSON.stringify(payload, stableReplacer, 2);
  const path = `${FileSystem.cacheDirectory}sukitrack-export.json`;
  await FileSystem.writeAsStringAsync(path, json);
  const can = await Sharing.isAvailableAsync();
  if (!can) {
    throw new Error(t('export_unavailable'));
  }
  await Sharing.shareAsync(path, {
    mimeType: 'application/json',
    dialogTitle: t('export_dialogTitle'),
  });
}
