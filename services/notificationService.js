import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/constants/storageKeys';

function makeRandomDeviceId() {
  if (typeof global?.crypto?.randomUUID === 'function') {
    return global.crypto.randomUUID();
  }
  return `dev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function getDeviceId() {
  const existing = await AsyncStorage.getItem(STORAGE_KEYS.DEVICE_ID);
  if (existing) return existing;
  const next = makeRandomDeviceId();
  await AsyncStorage.setItem(STORAGE_KEYS.DEVICE_ID, next);
  return next;
}

export async function getDeviceHeadersAsync() {
  const deviceId = await getDeviceId();
  const headers = {};
  if (deviceId) {
    headers['X-Device-Id'] = deviceId;
  }
  return headers;
}
