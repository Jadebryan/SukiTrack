import CryptoJS from 'crypto-js';
import * as SecureStore from 'expo-secure-store';

const V1_PREFIX = 'v1:';

function secureStoreKey(ownerId) {
  return `utang_ph_shop_cache_aes_v1_${ownerId}`;
}

export function isShopCacheEncryptionEnabled() {
  return String(process.env.EXPO_PUBLIC_ENCRYPT_SHOP_CACHE || '').trim() === '1';
}

export async function clearShopCacheCryptoKey(ownerId) {
  if (!ownerId) return;
  try {
    await SecureStore.deleteItemAsync(secureStoreKey(ownerId));
  } catch {
    /* noop */
  }
}

async function getAesKeyWordArray(ownerId) {
  let hex = null;
  try {
    hex = await SecureStore.getItemAsync(secureStoreKey(ownerId));
  } catch {
    hex = null;
  }
  if (!hex || hex.length < 64) {
    const w = CryptoJS.lib.WordArray.random(32);
    hex = CryptoJS.enc.Hex.stringify(w);
    await SecureStore.setItemAsync(secureStoreKey(ownerId), hex, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED,
    });
  }
  return CryptoJS.enc.Hex.parse(hex);
}

/**
 * @param {string} ownerId
 * @param {string} jsonString UTF-8 JSON
 * @returns {Promise<string>} plaintext or v1: envelope
 */
export async function encryptShopPayload(ownerId, jsonString) {
  if (!isShopCacheEncryptionEnabled()) return jsonString;
  const key = await getAesKeyWordArray(ownerId);
  const iv = CryptoJS.lib.WordArray.random(128 / 8);
  const enc = CryptoJS.AES.encrypt(jsonString, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  const payload = {
    iv: CryptoJS.enc.Base64.stringify(iv),
    ct: CryptoJS.enc.Base64.stringify(enc.ciphertext),
  };
  return V1_PREFIX + JSON.stringify(payload);
}

/**
 * @param {string} ownerId
 * @param {string} raw AsyncStorage value
 * @returns {Promise<string|null>} JSON string, or null if unreadable
 */
export async function decryptShopPayload(ownerId, raw) {
  if (raw == null || typeof raw !== 'string') return null;
  if (!raw.startsWith(V1_PREFIX)) return raw;
  if (!isShopCacheEncryptionEnabled()) return null;
  let payload;
  try {
    payload = JSON.parse(raw.slice(V1_PREFIX.length));
  } catch {
    return null;
  }
  if (!payload?.iv || !payload?.ct) return null;
  try {
    const key = await getAesKeyWordArray(ownerId);
    const iv = CryptoJS.enc.Base64.parse(payload.iv);
    const ciphertext = CryptoJS.enc.Base64.parse(payload.ct);
    const decrypted = CryptoJS.AES.decrypt({ ciphertext }, key, {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
    const s = decrypted.toString(CryptoJS.enc.Utf8);
    return s || null;
  } catch {
    return null;
  }
}
