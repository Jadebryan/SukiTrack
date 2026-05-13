const formatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatPeso(amount) {
  const n = Number(amount);
  if (Number.isNaN(n)) return '₱0.00';
  return formatter.format(n);
}

/** Whole peso amounts for inputs (no trailing zeros noise). */
export function amountToInputString(n) {
  const x = Math.round((Number(n) || 0) * 100) / 100;
  if (!Number.isFinite(x) || x <= 0) return '';
  return String(x.toFixed(2)).replace(/\.?0+$/, '');
}

export function parseAmountInput(text) {
  if (text == null || text === '') return NaN;
  let s = String(text).trim().replace(/\s/g, '');
  // Allow "1,234.56" (drop thousands commas) or "100,50" → 100.50 if single comma
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) {
    s = s.replace(/,/g, '');
  } else if (/^\d+,\d{1,2}$/.test(s)) {
    s = s.replace(',', '.');
  } else {
    s = s.replace(/,/g, '');
  }
  const cleaned = s.replace(/[^\d.]/g, '');
  const n = parseFloat(cleaned);
  return n;
}
