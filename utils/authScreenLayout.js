/**
 * Hero + ScrollView + white card auth flows used to add bottom padding on both
 * the ScrollView content and the card, which doubled home-indicator and keyboard space.
 *
 * @param {number} insetsBottom from `useSafeAreaInsets().bottom`
 * @param {number} keyboardPad from `useKeyboardHeight(true)`
 * @returns {{ scrollContentPaddingBottom: number, cardPaddingBottom: number }}
 */
export function authStackBottomPads(insetsBottom, keyboardPad) {
  const inset = Math.max(insetsBottom, 0);
  const kb = Math.max(keyboardPad, 0);
  const scrollContentPaddingBottom = kb > 0 ? kb + 10 : 0;
  const cardPaddingBottom = 10 + Math.max(inset, 6);
  return { scrollContentPaddingBottom, cardPaddingBottom };
}
