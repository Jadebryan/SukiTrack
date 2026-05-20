import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { STORAGE_KEYS } from '@/constants/storageKeys';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

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

export async function getStoredPushToken() {
  return AsyncStorage.getItem(STORAGE_KEYS.PUSH_TOKEN);
}

export async function saveStoredPushToken(token) {
  if (!token) return null;
  const valid = String(token).trim();
  if (!valid) return null;
  await AsyncStorage.setItem(STORAGE_KEYS.PUSH_TOKEN, valid);
  return valid;
}

export async function clearStoredPushToken() {
  await AsyncStorage.removeItem(STORAGE_KEYS.PUSH_TOKEN);
}

export async function requestNotificationPermissionsAsync() {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const request = await Notifications.requestPermissionsAsync();
      finalStatus = request.status;
    }
    return finalStatus === 'granted';
  } catch {
    return false;
  }
}

export async function registerExpoPushTokenAsync() {
  if (!Device.isDevice) {
    return null;
  }
  const permissionGranted = await requestNotificationPermissionsAsync();
  if (!permissionGranted) {
    return null;
  }
  try {
    const tokenResponse = await Notifications.getExpoPushTokenAsync();
    const token = String(tokenResponse.data || tokenResponse).trim();
    if (!token) return null;
    await saveStoredPushToken(token);
    return token;
  } catch {
    return null;
  }
}

export async function getDeviceHeadersAsync() {
  const deviceId = await getDeviceId();
  const pushToken = await getStoredPushToken();
  const headers = {};
  if (deviceId) {
    headers['X-Device-Id'] = deviceId;
  }
  if (pushToken) {
    headers['X-Expo-Push-Token'] = pushToken;
  }
  return headers;
}
