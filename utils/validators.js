function safeString(v) {
  return String(v ?? '');
}

/**
 * Keep only letters + spaces (A–Z). Collapses multiple spaces.
 * @param {string} v
 */
export function sanitizeLetters(v) {
  const s = safeString(v).replace(/[^a-zA-Z\s]/g, '');
  return s.replace(/\s+/g, ' ');
}

/**
 * Keep only letters, numbers, and spaces. Collapses multiple spaces.
 * @param {string} v
 */
export function sanitizeAlphanumeric(v) {
  const s = safeString(v).replace(/[^a-zA-Z0-9\s]/g, '');
  return s.replace(/\s+/g, ' ');
}

/**
 * Keep text content with special characters allowed. Collapses multiple spaces.
 * @param {string} v
 */
export function sanitizeText(v) {
  return safeString(v).replace(/\s+/g, ' ');
}

/**
 * Keep only digits (0-9).
 * @param {string} v
 */
export function sanitizeDigits(v) {
  return safeString(v).replace(/[^\d]/g, '');
}

/**
 * Keep only digits and a single decimal dot.
 * @param {string} v
 */
export function sanitizeDecimal(v) {
  let s = safeString(v).replace(/[^\d.]/g, '');
  const firstDot = s.indexOf('.');
  if (firstDot === -1) return s;
  // Remove any additional dots after the first.
  s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, '');
  return s;
}

