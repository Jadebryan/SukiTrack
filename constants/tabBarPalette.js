/** Bottom tab bar tokens (aligned with Home / Inventory hub). */
export function getTabBarPalette(isDark) {
  if (isDark) {
    return {
      barBg: '#121212',
      border: 'rgba(255,255,255,0.10)',
      active: '#1D9E75',
      inactive: '#6B6B6B',
    };
  }
  return {
    barBg: '#FFFFFF',
    border: 'rgba(0,0,0,0.10)',
    active: '#1D9E75',
    inactive: '#888780',
  };
}
