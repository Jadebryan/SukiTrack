import { INVENTORY_CATEGORY_PRESET_KEYS } from '@/constants/inventoryCategories';

/** @param {string} str */
function utf8ToB64url(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/** @param {string} s */
function b64urlToUtf8(s) {
  let b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .trim();
}

/**
 * @param {string} category stored value (empty = uncategorized)
 * @param {(k: string) => string} t i18n
 */
export function categoryToSlug(category, t) {
  const c = String(category || '').trim();
  if (!c) return '_';
  const preset = INVENTORY_CATEGORY_PRESET_KEYS.find(
    (k) => normalize(t(k)) === normalize(c)
  );
  if (preset) return `p~${preset}`;
  return `c~${utf8ToB64url(c)}`;
}

/**
 * @param {string} slug route param (may be URL-encoded by the router)
 * @param {(k: string) => string} t
 * @returns {string} stored category string or '' for uncategorized
 */
export function slugToCategory(slug, t) {
  const raw = decodeURIComponent(String(slug || '').trim());
  if (!raw || raw === '_') return '';
  if (raw.startsWith('p~')) {
    const key = raw.slice(2);
    if (INVENTORY_CATEGORY_PRESET_KEYS.includes(key)) return t(key);
    return '';
  }
  if (raw.startsWith('c~')) {
    try {
      return b64urlToUtf8(raw.slice(2)).trim();
    } catch {
      return '';
    }
  }
  return '';
}

export function itemMatchesCategorySlug(item, slug, t) {
  const target = slugToCategory(slug, t);
  const ic = String(item.category || '').trim();
  if (!target) return !ic;
  return normalize(ic) === normalize(target);
}
