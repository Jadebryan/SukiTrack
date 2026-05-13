import { getApiBaseUrl } from '@/constants/apiConfig';
import { t } from '@/i18n/strings';
import { loadSession, tryRefreshAccessToken } from '@/services/sessionService';

function assertHttpsInProduction(baseUrl) {
  if (typeof __DEV__ !== 'undefined' && __DEV__) return;
  if (String(baseUrl || '').toLowerCase().startsWith('http://')) {
    throw new Error(t('api_insecureUrl'));
  }
}

async function parseBody(res) {
  if (res.status === 204) return null;
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Authenticated API call (JWT from session, or pass tokenOverride).
 */
export async function apiFetch(path, options = {}) {
  const { tokenOverride, _didRefresh, ...fetchOpts } = options;
  const base = getApiBaseUrl();
  if (!base) {
    throw new Error(t('api_missingUrl'));
  }
  assertHttpsInProduction(base);
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;

  const session = await loadSession();
  const token = tokenOverride ?? session?.token;
  if (!token) {
    throw new Error(t('api_loggedOut'));
  }
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    ...(fetchOpts.headers || {}),
  };
  const res = await fetch(url, { ...fetchOpts, headers });
  const body = await parseBody(res);

  if (
    res.status === 401 &&
    !tokenOverride &&
    !_didRefresh
  ) {
    const refreshed = await tryRefreshAccessToken();
    if (refreshed) {
      return apiFetch(path, { ...options, _didRefresh: true });
    }
  }

  if (!res.ok) {
    let msg =
      (body && body.error) ||
      (typeof body === 'string' ? body : null) ||
      res.statusText ||
      'Request failed';
    if (res.status === 404 && String(url).includes('/pages/')) {
      msg = `${msg}${t('api_pages404Hint')}`;
    }
    throw new Error(msg);
  }
  return body;
}
