import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { getApiBaseUrl } from '@/constants/apiConfig';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { t } from '@/i18n/strings';

/** JWT access token (short-lived). */
const SECURE_AUTH_TOKEN_KEY = 'utang_ph_secure_auth_token';
/** Opaque refresh token (rotated server-side). */
const SECURE_REFRESH_TOKEN_KEY = 'utang_ph_secure_refresh_token';

let refreshPromise = null;

function assertHttpsInProduction(baseUrl) {
  if (typeof __DEV__ !== 'undefined' && __DEV__) return;
  if (String(baseUrl || '').toLowerCase().startsWith('http://')) {
    throw new Error(t('api_insecureUrl'));
  }
}

async function parseJsonBody(res) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * POST /auth/refresh once; concurrent callers share the same in-flight refresh.
 * @returns {Promise<boolean>}
 */
export function tryRefreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const base = getApiBaseUrl();
        if (!base) return false;
        assertHttpsInProduction(base);
        const session = await loadSession();
        const refr = session?.refreshToken;
        if (!refr) return false;
        const url = `${base}/auth/refresh`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken: refr }),
        });
        const data = await parseJsonBody(res);
        if (!res.ok || !data?.token || !data?.refreshToken) return false;
        await saveSession({
          token: data.token,
          refreshToken: data.refreshToken,
          ownerId: data.ownerId ?? session.ownerId,
          email: data.email ?? session.email,
        });
        return true;
      } catch {
        return false;
      }
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export async function saveSession({ token, refreshToken, ownerId, email }) {
  const tok = String(token || '');
  const refr = refreshToken != null ? String(refreshToken) : '';
  try {
    await SecureStore.setItemAsync(SECURE_AUTH_TOKEN_KEY, tok, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED,
    });
    if (refr) {
      await SecureStore.setItemAsync(SECURE_REFRESH_TOKEN_KEY, refr, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED,
      });
    } else {
      try {
        await SecureStore.deleteItemAsync(SECURE_REFRESH_TOKEN_KEY);
      } catch {
        /* noop */
      }
    }
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.AUTH_TOKEN,
      STORAGE_KEYS.REFRESH_TOKEN,
    ]);
  } catch {
    await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, tok);
    if (refr) {
      await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refr);
    } else {
      await AsyncStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    }
    try {
      await SecureStore.deleteItemAsync(SECURE_REFRESH_TOKEN_KEY);
    } catch {
      /* noop */
    }
  }
  await AsyncStorage.multiSet([
    [STORAGE_KEYS.OWNER_ID, ownerId],
    [STORAGE_KEYS.USER_EMAIL, email || ''],
  ]);
}

export async function loadSession() {
  let token = null;
  try {
    token = await SecureStore.getItemAsync(SECURE_AUTH_TOKEN_KEY);
  } catch {
    token = null;
  }
  if (!token) {
    const legacy = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    if (legacy) {
      try {
        await SecureStore.setItemAsync(SECURE_AUTH_TOKEN_KEY, legacy, {
          keychainAccessible: SecureStore.WHEN_UNLOCKED,
        });
        await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      } catch {
        /* use legacy from AsyncStorage for this session */
      }
      token = legacy;
    }
  }

  let refreshToken = null;
  try {
    refreshToken = await SecureStore.getItemAsync(SECURE_REFRESH_TOKEN_KEY);
  } catch {
    refreshToken = null;
  }
  if (!refreshToken) {
    refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    if (refreshToken) {
      try {
        await SecureStore.setItemAsync(SECURE_REFRESH_TOKEN_KEY, refreshToken, {
          keychainAccessible: SecureStore.WHEN_UNLOCKED,
        });
        await AsyncStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      } catch {
        /* keep AsyncStorage copy */
      }
    }
  }

  const [[, ownerId], [, email]] = await AsyncStorage.multiGet([
    STORAGE_KEYS.OWNER_ID,
    STORAGE_KEYS.USER_EMAIL,
  ]);
  if (!token || !ownerId) return null;
  return { token, refreshToken: refreshToken || '', ownerId, email: email || '' };
}

export async function clearSession() {
  try {
    await SecureStore.deleteItemAsync(SECURE_AUTH_TOKEN_KEY);
  } catch {
    /* noop */
  }
  try {
    await SecureStore.deleteItemAsync(SECURE_REFRESH_TOKEN_KEY);
  } catch {
    /* noop */
  }
  await AsyncStorage.multiRemove([
    STORAGE_KEYS.AUTH_TOKEN,
    STORAGE_KEYS.REFRESH_TOKEN,
    STORAGE_KEYS.OWNER_ID,
    STORAGE_KEYS.USER_EMAIL,
  ]);
}
