import { INVENTORY_CATEGORY_PRESET_KEYS } from '@/constants/inventoryCategories';
import { categoryToSlug } from '@/utils/categoryRoute';

function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .trim();
}

/**
 * Build category grid cards + product counts in one pass over inventory rows.
 */
export function buildInventoryHubCards({
  rows,
  rowsMatchingQuery,
  extraCategories,
  t,
  uncategorizedLabel,
}) {
  const presetLabelsTranslated = Object.fromEntries(
    INVENTORY_CATEGORY_PRESET_KEYS.map((k) => [k, t(k)])
  );
  const productCountByCategoryNorm = new Map();
  let uncCount = 0;

  for (const it of rowsMatchingQuery) {
    const cat = String(it.category || '').trim();
    if (!cat) {
      uncCount += 1;
      continue;
    }
    const nk = normalize(cat);
    productCountByCategoryNorm.set(nk, (productCountByCategoryNorm.get(nk) || 0) + 1);
  }

  const presetLabels = new Set(
    INVENTORY_CATEGORY_PRESET_KEYS.map((k) => normalize(presetLabelsTranslated[k]))
  );

  const list = [
    {
      key: '_',
      slug: '_',
      title: uncategorizedLabel,
      count: uncCount,
    },
  ];

  for (const presetKey of INVENTORY_CATEGORY_PRESET_KEYS) {
    const label = presetLabelsTranslated[presetKey];
    list.push({
      key: `p-${presetKey}`,
      slug: categoryToSlug(label, t),
      title: label,
      count: productCountByCategoryNorm.get(normalize(label)) || 0,
    });
  }

  const customNamesNorm = new Set();
  const customNames = [];

  const addCustom = (label) => {
    const trimmed = String(label || '').trim();
    if (!trimmed) return;
    const nk = normalize(trimmed);
    if (presetLabels.has(nk) || customNamesNorm.has(nk)) return;
    customNamesNorm.add(nk);
    customNames.push(trimmed);
  };

  for (const it of rows) {
    addCustom(it.category);
  }
  for (const lab of extraCategories) {
    addCustom(lab);
  }

  customNames.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  for (const c of customNames) {
    list.push({
      key: `c-${c}`,
      slug: categoryToSlug(c, t),
      title: c,
      count: productCountByCategoryNorm.get(normalize(c)) || 0,
    });
  }

  return list;
}
