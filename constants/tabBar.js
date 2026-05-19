/**
 * Must stay in sync with `app/(tabs)/_layout.js` tab bar vertical sizing so FABs
 * and lists can clear the bar + Android gesture / 3-button nav insets.
 * @param {number} safeBottom `useSafeAreaInsets().bottom`
 */
export function getTabBarOuterHeight(safeBottom) {
  const padBottom = Math.max(safeBottom, 10);
  const padTop = 6;
  const row = 52;
  return padTop + row + padBottom;
}
