/** Pastel sticker fills (icon drawn white on top). */
export const STICKER_PRESET = {
  _: {
    icon: 'package-variant-closed',
    bg: '#90A4AE',
    rotate: -6,
  },
  inv_cat_groceries: {
    icon: 'fruit-grapes',
    bg: '#66BB6A',
    rotate: 5,
  },
  inv_cat_beverages: {
    icon: 'cup',
    bg: '#42A5F5',
    rotate: -4,
  },
  inv_cat_snacks: {
    icon: 'cookie',
    bg: '#FF8A65',
    rotate: 7,
  },
  inv_cat_household: {
    icon: 'spray-bottle',
    bg: '#26A69A',
    rotate: -5,
  },
  inv_cat_frozen: {
    icon: 'snowflake',
    bg: '#4FC3F7',
    rotate: 4,
  },
  inv_cat_personal: {
    icon: 'lotion',
    bg: '#AB47BC',
    rotate: -7,
  },
  inv_cat_other: {
    icon: 'star-four-points',
    bg: '#FFA726',
    rotate: 6,
  },
};

const CUSTOM_STICKER_CYCLE = [
  { icon: 'tag-heart', bg: '#EC407A', rotate: -5 },
  { icon: 'shape', bg: '#7E57C2', rotate: 6 },
  { icon: 'label-outline', bg: '#5C6BC0', rotate: -4 },
  { icon: 'heart-circle', bg: '#EF5350', rotate: 5 },
  { icon: 'flash', bg: '#FFCA28', rotate: -6 },
  { icon: 'leaf', bg: '#26C6DA', rotate: 7 },
];

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * Ordered rules: first matching keyword wins (put longer / more specific phrases first).
 * Icons are MaterialCommunityIcons names.
 */
const KEYWORD_STICKER_RULES = [
  {
    kw: [
      'ice cream',
      'icecream',
      'sorbetes',
      'gelato',
    ],
    icon: 'ice-cream',
    bg: '#81D4FA',
    rotate: 5,
  },
  {
    kw: [
      'sigarilyo',
      'cigarette',
      'cigaret',
      'ciggaret',
      'ciggarete',
      'cigaretts',
      'cigarillo',
      'tobacco',
      'nicotine',
      'yosi',
      'vape',
      'vaping',
      'e-cig',
      'ecig',
      'cigar',
    ],
    icon: 'smoking',
    bg: '#78909C',
    rotate: -4,
  },
  {
    kw: ['coffee', 'kape', 'espresso', 'latte', 'cappuccino'],
    icon: 'coffee',
    bg: '#8D6E63',
    rotate: -5,
  },
  {
    kw: ['beer', 'wine', 'liquor', 'alcohol', 'brandy', 'vodka', 'rum', 'gin', 'whiskey', 'whisky', 'lager'],
    icon: 'glass-wine',
    bg: '#7E57C2',
    rotate: 4,
  },
  {
    kw: ['milk', 'dairy', 'cheese', 'yogurt', 'gatas'],
    icon: 'cheese',
    bg: '#FFCA28',
    rotate: -6,
  },
  {
    kw: ['rice', 'bigas', 'kanin'],
    icon: 'rice',
    bg: '#AED581',
    rotate: 7,
  },
  {
    kw: ['bread', 'bakery', 'pandesal', 'pandisal', 'tinapay'],
    icon: 'bread-slice',
    bg: '#D7CCC8',
    rotate: -3,
  },
  {
    kw: ['seafood', 'shrimp', 'tuna', 'salmon', 'shellfish', 'hipon', 'isda'],
    icon: 'fish',
    bg: '#4FC3F7',
    rotate: 5,
  },
  {
    kw: ['chicken', 'pork', 'beef', 'meat', 'poultry', 'manok', 'baboy', 'baka'],
    icon: 'food-drumstick',
    bg: '#FF8A65',
    rotate: -4,
  },
  {
    kw: ['candy', 'chocolate', 'sweet', 'snack', 'gummy', 'tsokolate'],
    icon: 'candy-outline',
    bg: '#F48FB1',
    rotate: 6,
  },
  {
    kw: ['stationery', 'school supply', 'papel', 'notebook', 'ballpen', 'lapis'],
    icon: 'school',
    bg: '#5C6BC0',
    rotate: -5,
  },
  {
    kw: [
      'electronics',
      'gadget',
      'charger',
      'cellphone',
      'smartphone',
      'iphone',
      'android',
      'laptop',
      'computer',
      'tablet',
      'tablet pc',
    ],
    icon: 'cellphone',
    bg: '#546E7A',
    rotate: 4,
  },
  {
    kw: [
      'medicine',
      'vitamin',
      'pharma',
      'prescription',
      'pharmacy',
      'capsule',
      'antibiotic',
      'meds',
      'gamot',
    ],
    icon: 'pill',
    bg: '#9575CD',
    rotate: 6,
  },
  {
    kw: ['fuel', 'diesel', 'gasoline', 'petrol', 'gas station'],
    icon: 'gas-station',
    bg: '#90A4AE',
    rotate: -6,
  },
  {
    kw: ['toy', 'laruan'],
    icon: 'toy-brick-outline',
    bg: '#FFAB91',
    rotate: 5,
  },
  {
    kw: ['book', 'magazine', 'aklat'],
    icon: 'book-open-page-variant',
    bg: '#A1887F',
    rotate: -4,
  },
  {
    kw: ['flower', 'plant', 'garden', 'halaman', 'bulaklak'],
    icon: 'flower',
    bg: '#66BB6A',
    rotate: 7,
  },
  {
    kw: ['dog food', 'cat food', 'pet food', 'aso', 'pusa'],
    icon: 'paw',
    bg: '#A1887F',
    rotate: -3,
  },
];

/** Phrase or multi-token: substring match. Single token: word boundary (avoids "rice" in "price"). */
function labelMatchesKeyword(t, kw) {
  const k = String(kw || '').toLowerCase().trim();
  if (!k) return false;
  if (/\s/.test(k)) return t.includes(k);
  const escaped = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(t);
}

export function matchInventoryLabelToSticker(label) {
  const t = String(label || '').toLowerCase().trim();
  if (!t) return null;
  for (const rule of KEYWORD_STICKER_RULES) {
    for (const kw of rule.kw) {
      if (labelMatchesKeyword(t, kw)) {
        return { icon: rule.icon, bg: rule.bg, rotate: rule.rotate };
      }
    }
  }
  return null;
}

/**
 * @param {string} cardKey from hub list (`_`, `p-inv_cat_*`, `c-{label}`)
 * @param {string} [categoryTitle] display label for custom tiles — used to pick a themed icon
 * @param {{ icon: string, bg: string, rotate: number } | null | undefined} [stickerOverride] persisted / network-assisted visual
 */
export function getCategoryStickerVisual(
  cardKey,
  categoryTitle = '',
  stickerOverride = null
) {
  if (cardKey === '_') return STICKER_PRESET._;
  if (cardKey.startsWith('p-')) {
    const presetKey = cardKey.slice(2);
    if (STICKER_PRESET[presetKey]) return STICKER_PRESET[presetKey];
  }
  if (String(cardKey).startsWith('c-')) {
    if (stickerOverride?.icon && stickerOverride?.bg) {
      return {
        icon: stickerOverride.icon,
        bg: stickerOverride.bg,
        rotate:
          typeof stickerOverride.rotate === 'number' ? stickerOverride.rotate : 0,
      };
    }
    const fromLabel = matchInventoryLabelToSticker(categoryTitle);
    if (fromLabel) return fromLabel;
  }
  const idx = hashStr(cardKey) % CUSTOM_STICKER_CYCLE.length;
  return CUSTOM_STICKER_CYCLE[idx];
}
