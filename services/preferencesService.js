import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/constants/storageKeys';

/** @returns {Promise<'en' | 'tl'>} */
export async function getLanguagePreference() {
  const v = await AsyncStorage.getItem(STORAGE_KEYS.LANGUAGE);
  return v === 'tl' ? 'tl' : 'en';
}

/** @param {'en' | 'tl'} lang */
export async function setLanguagePreference(lang) {
  await AsyncStorage.setItem(
    STORAGE_KEYS.LANGUAGE,
    lang === 'tl' ? 'tl' : 'en'
  );
}

export async function getDarkModePreference() {
  const v = await AsyncStorage.getItem(STORAGE_KEYS.DARK_MODE);
  return v === '1';
}

export async function setDarkModePreference(enabled) {
  await AsyncStorage.setItem(STORAGE_KEYS.DARK_MODE, enabled ? '1' : '0');
}

/** @returns {Promise<string | null>} ISO date or null */
export async function getLastExportAt() {
  const v = await AsyncStorage.getItem(STORAGE_KEYS.LAST_EXPORT_AT);
  return v && String(v).trim() ? String(v).trim() : null;
}

/** @param {string} isoDate ISO string */
export async function setLastExportAt(isoDate) {
  await AsyncStorage.setItem(STORAGE_KEYS.LAST_EXPORT_AT, String(isoDate));
}

/** @returns {Promise<number>} epoch ms when user dismissed backup nudge, or 0 */
export async function getBackupReminderDismissedAt() {
  const v = await AsyncStorage.getItem(STORAGE_KEYS.BACKUP_REMINDER_DISMISSED_AT);
  const n = v ? Number(v) : 0;
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export async function setBackupReminderDismissedNow() {
  await AsyncStorage.setItem(
    STORAGE_KEYS.BACKUP_REMINDER_DISMISSED_AT,
    String(Date.now())
  );
}

async function readExtraInventoryCategoriesMap() {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.INVENTORY_EXTRA_CATEGORIES);
  if (!raw || !String(raw).trim()) return {};
  try {
    const obj = JSON.parse(raw);
    return obj && typeof obj === 'object' ? obj : {};
  } catch {
    return {};
  }
}

/** @param {string} ownerId */
export async function getExtraInventoryCategories(ownerId) {
  if (!ownerId) return [];
  const obj = await readExtraInventoryCategoriesMap();
  const list = obj[String(ownerId)];
  if (!Array.isArray(list)) return [];
  return list.map((s) => String(s).trim()).filter(Boolean);
}

/**
 * Remember a custom category label before any product uses it (per device).
 * @param {string} ownerId
 * @param {string} label
 * @returns {Promise<{ ok: boolean, reason?: 'empty' | 'dup' }>}
 */
export async function addExtraInventoryCategory(ownerId, label) {
  const trimmed = String(label || '').trim().slice(0, 80);
  if (!trimmed) return { ok: false, reason: 'empty' };
  const id = String(ownerId);
  const obj = await readExtraInventoryCategoriesMap();
  const prev = Array.isArray(obj[id]) ? [...obj[id]] : [];
  const n = trimmed.toLowerCase();
  if (prev.some((x) => String(x).trim().toLowerCase() === n)) {
    return { ok: false, reason: 'dup' };
  }
  prev.push(trimmed);
  obj[id] = prev;
  await AsyncStorage.setItem(
    STORAGE_KEYS.INVENTORY_EXTRA_CATEGORIES,
    JSON.stringify(obj)
  );
  return { ok: true };
}

/**
 * Drop a device-only empty category tile (must still be listed under extras).
 * @param {string} ownerId
 * @param {string} label category title as stored
 * @returns {Promise<{ ok: boolean, reason?: 'empty' | 'missing' }>}
 */
export async function removeExtraInventoryCategory(ownerId, label) {
  const id = String(ownerId || '').trim();
  const n = String(label || '').trim().toLowerCase();
  if (!id || !n) return { ok: false, reason: 'empty' };
  const obj = await readExtraInventoryCategoriesMap();
  const prev = Array.isArray(obj[id]) ? [...obj[id]] : [];
  const next = prev.filter((x) => String(x).trim().toLowerCase() !== n);
  if (next.length === prev.length) return { ok: false, reason: 'missing' };
  obj[id] = next;
  await AsyncStorage.setItem(
    STORAGE_KEYS.INVENTORY_EXTRA_CATEGORIES,
    JSON.stringify(obj)
  );
  return { ok: true };
}

function normCatKey(label) {
  return String(label || '').toLowerCase().trim();
}

async function readStickerOverridesRoot() {
  const raw = await AsyncStorage.getItem(
    STORAGE_KEYS.INVENTORY_CATEGORY_STICKER_OVERRIDES
  );
  if (!raw || !String(raw).trim()) return {};
  try {
    const obj = JSON.parse(raw);
    return obj && typeof obj === 'object' ? obj : {};
  } catch {
    return {};
  }
}

/** @returns {Promise<Record<string, { icon: string, bg: string, rotate: number }>>} keyed by normalized label */
export async function getCategoryStickerOverrides(ownerId) {
  if (!ownerId) return {};
  const root = await readStickerOverridesRoot();
  const row = root[String(ownerId)];
  if (!row || typeof row !== 'object') return {};
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    const nk = normCatKey(k);
    if (!nk || !v || typeof v !== 'object') continue;
    const icon = String(v.icon || '').trim();
    const bg = String(v.bg || '').trim();
    if (!icon || !bg) continue;
    const rotate =
      typeof v.rotate === 'number' && Number.isFinite(v.rotate) ? v.rotate : 0;
    out[nk] = { icon, bg, rotate };
  }
  return out;
}

/**
 * @param {string} ownerId
 * @param {string} label display label (any casing)
 * @param {{ icon: string, bg: string, rotate?: number }} visual
 */
export async function setCategoryStickerOverride(ownerId, label, visual) {
  const id = String(ownerId || '').trim();
  const nk = normCatKey(label);
  if (!id || !nk) return;
  const icon = String(visual?.icon || '').trim();
  const bg = String(visual?.bg || '').trim();
  if (!icon || !bg) return;
  const rotate =
    typeof visual?.rotate === 'number' && Number.isFinite(visual.rotate)
      ? visual.rotate
      : 0;
  const root = await readStickerOverridesRoot();
  const prev = root[id] && typeof root[id] === 'object' ? { ...root[id] } : {};
  prev[nk] = { icon, bg, rotate };
  root[id] = prev;
  await AsyncStorage.setItem(
    STORAGE_KEYS.INVENTORY_CATEGORY_STICKER_OVERRIDES,
    JSON.stringify(root)
  );
}

/** @param {string} ownerId */
export async function removeCategoryStickerOverride(ownerId, label) {
  const id = String(ownerId || '').trim();
  const nk = normCatKey(label);
  if (!id || !nk) return;
  const root = await readStickerOverridesRoot();
  const prev = root[id] && typeof root[id] === 'object' ? { ...root[id] } : {};
  if (!(nk in prev)) return;
  delete prev[nk];
  root[id] = prev;
  await AsyncStorage.setItem(
    STORAGE_KEYS.INVENTORY_CATEGORY_STICKER_OVERRIDES,
    JSON.stringify(root)
  );
}
