import { getApiBaseUrl } from '@/constants/apiConfig';
import { t } from '@/i18n/strings';

const MISSING_URL_MSG =
  'Kulang ang EXPO_PUBLIC_API_URL. Ilagay sa .env at i-restart ang Expo.';

function assertHttpsInProduction(baseUrl) {
  if (typeof __DEV__ !== 'undefined' && __DEV__) return;
  if (String(baseUrl || '').toLowerCase().startsWith('http://')) {
    throw new Error(t('api_insecureUrl'));
  }
}

async function parseBody(res) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function authFetch(path, { method = 'POST', body, token } = {}) {
  const base = getApiBaseUrl();
  if (!base) {
    throw new Error(MISSING_URL_MSG);
  }
  assertHttpsInProduction(base);
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const res = await fetch(url, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const data = await parseBody(res);
  if (!res.ok) {
    const msg =
      (data && data.error) ||
      (typeof data === 'string' ? data : null) ||
      res.statusText ||
      'Request failed';
    throw new Error(msg);
  }
  return data;
}

export async function registerAccount({ email, password }) {
  return authFetch('/auth/register', {
    body: { email: String(email || '').trim().toLowerCase(), password },
  });
}

export async function loginAccount({ email, password }) {
  return authFetch('/auth/login', {
    body: {
      email: String(email || '').trim().toLowerCase(),
      password,
    },
  });
}

export async function changePassword({ token, currentPassword, newPassword }) {
  return authFetch('/auth/change-password', {
    token,
    body: { currentPassword, newPassword },
  });
}

export async function logout({ token }) {
  return authFetch('/auth/logout', {
    method: 'POST',
    token,
    body: {},
  });
}

/** Hinihiling ang 6-digit na code sa email (generic OK mula sa server). */
export async function requestForgotPinCode({ email }) {
  return authFetch('/auth/forgot-pin/request', {
    body: { email: String(email || '').trim().toLowerCase() },
  });
}

/** Pinapatunayan ang code; bumabalik tulad ng login: token, ownerId, email. */
export async function verifyForgotPinCode({ email, code }) {
  const digits = String(code || '').replace(/\D/g, '');
  return authFetch('/auth/forgot-pin/verify', {
    body: {
      email: String(email || '').trim().toLowerCase(),
      code: digits,
    },
  });
}
