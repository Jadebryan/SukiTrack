/**
 * Public API base URL only (e.g. https://host:3847/api/v1).
 * Never put server secrets or private keys here — EXPO_PUBLIC_* is bundled into the app.
 */
export function getApiBaseUrl() {
  const raw = process.env.EXPO_PUBLIC_API_URL ?? '';
  return String(raw).replace(/\/$/, '');
}

export function isApiConfigured() {
  return Boolean(getApiBaseUrl());
}

/** Hostname (and port) for settings / diagnostics, or empty if missing. */
export function getApiDisplayHost() {
  const base = getApiBaseUrl();
  if (!base) return '';
  try {
    const u = new URL(base.includes('://') ? base : `http://${base}`);
    return u.host || base;
  } catch {
    return String(base)
      .replace(/^https?:\/\//i, '')
      .split('/')[0]
      .trim();
  }
}
