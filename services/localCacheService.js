import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  clearShopCacheCryptoKey,
  decryptShopPayload,
  encryptShopPayload,
} from '@/services/shopCacheCrypto';

function key(ownerId) {
  return `utang_ph_shop_cache_${ownerId}`;
}

export async function loadShopCache(ownerId) {
  if (!ownerId) return null;
  const raw = await AsyncStorage.getItem(key(ownerId));
  if (!raw) return null;
  const text = await decryptShopPayload(ownerId, raw);
  if (text == null) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function saveShopCache(ownerId, payload) {
  if (!ownerId) return;
  const json = JSON.stringify(payload);
  const toStore = await encryptShopPayload(ownerId, json);
  await AsyncStorage.setItem(key(ownerId), toStore);
}

export async function clearShopCache(ownerId) {
  if (!ownerId) return;
  await AsyncStorage.removeItem(key(ownerId));
  await clearShopCacheCryptoKey(ownerId);
}
