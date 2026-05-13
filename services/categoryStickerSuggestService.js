import { matchInventoryLabelToSticker } from '@/constants/inventoryCategoryStickers';
import { isOnline } from '@/services/networkStatus';
import {
  getCategoryStickerOverrides,
  setCategoryStickerOverride,
} from '@/services/preferencesService';

const DATAMUSE_TIMEOUT_MS = 9000;

/** Avoid hammering Datamuse after a miss for the same normalized label (session-only). */
const networkStickerMiss = new Set();

export function forgetNetworkStickerMissForLabel(label) {
  networkStickerMiss.delete(normKey(label));
}

function normKey(label) {
  return String(label || '').toLowerCase().trim();
}

async function fetchJson(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), DATAMUSE_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/**
 * Uses Datamuse (network) to expand the label with spelling suggestions and
 * semantically related words, then maps through local keyword → icon rules.
 * @param {string} label
 * @returns {Promise<{ icon: string, bg: string, rotate: number } | null>}
 */
export async function fetchSmartStickerFromDatamuse(label) {
  const trimmed = String(label || '').trim().slice(0, 80);
  if (!trimmed) return null;
  if (!(await isOnline())) return null;

  const q = encodeURIComponent(trimmed);
  const [sug, ml] = await Promise.all([
    fetchJson(`https://api.datamuse.com/sug?s=${q}&max=10`),
    fetchJson(`https://api.datamuse.com/words?ml=${q}&max=14`),
  ]);

  const words = new Set();
  words.add(trimmed.toLowerCase());
  for (const x of Array.isArray(sug) ? sug : []) {
    if (x && x.word) words.add(String(x.word).toLowerCase());
  }
  for (const x of Array.isArray(ml) ? ml : []) {
    if (x && x.word) words.add(String(x.word).toLowerCase());
  }

  const blob = Array.from(words).join(' ');
  return matchInventoryLabelToSticker(blob);
}

/**
 * @typedef {'cache' | 'local' | 'network' | 'offline' | 'none'} CategoryStickerSuggestSource
 */

/**
 * When online, may call Datamuse and persist a sticker override for obscure labels.
 * @returns {Promise<{ visual: { icon: string, bg: string, rotate: number } | null, source: CategoryStickerSuggestSource }>}
 */
export async function suggestAndPersistCategorySticker(ownerId, label) {
  const trimmed = String(label || '').trim().slice(0, 80);
  if (!trimmed || !ownerId) {
    return { visual: null, source: 'none' };
  }
  const nk = normKey(trimmed);

  const existing = await getCategoryStickerOverrides(ownerId);
  if (existing[nk]?.icon) {
    return { visual: existing[nk], source: 'cache' };
  }

  if (matchInventoryLabelToSticker(trimmed)) {
    return { visual: null, source: 'local' };
  }

  if (networkStickerMiss.has(nk)) {
    return { visual: null, source: 'none' };
  }
  if (!(await isOnline())) {
    return { visual: null, source: 'offline' };
  }

  const visual = await fetchSmartStickerFromDatamuse(trimmed);
  if (!visual) {
    networkStickerMiss.add(nk);
    return { visual: null, source: 'none' };
  }

  networkStickerMiss.delete(nk);
  await setCategoryStickerOverride(ownerId, trimmed, visual);
  return { visual, source: 'network' };
}
