/** Inventory hub design tokens (light + dark). */
export function getInventoryHubPalette(isDark) {
  const shared = {
    green600: '#1D9E75',
    green700: '#0F6E56',
    green800: '#085041',
    red800: '#A32D2D',
    green100: '#9FE1CB',
    green50: '#E1F5EE',
    amber700: '#854F0B',
    amber100: '#FAC775',
    amber50: '#FAEEDA',
  };

  if (isDark) {
    return {
      ...shared,
      bg: '#1D1D1D',
      surface: '#3D3D3D',
      surfaceMuted: '#2a2a2a',
      border: 'rgba(255,255,255,0.10)',
      text: '#FFFFFF',
      textSecondary: '#B0B0B0',
      textFaint: '#6B6B6B',
      searchBg: '#3D3D3D',
      statPillBg: '#2a2a2a',
      cardDefault: '#3D3D3D',
      cardGreenBg: '#0F6E5626',
      cardGreenBorder: '#1D9E7544',
      cardAmberBg: '#854F0B22',
      cardAmberBorder: '#BA751744',
      iconBtnBg: '#3D3D3D',
      newCatBtnBg: '#0F6E5633',
      newCatBtnBorder: '#1D9E7555',
    };
  }

  return {
    ...shared,
    bg: '#F7F7F7',
    surface: '#FFFFFF',
    surfaceMuted: '#F0F0F0',
    border: 'rgba(0,0,0,0.10)',
    text: '#1D1D1D',
    textSecondary: '#6B6B6B',
    textFaint: '#B0B0B0',
    searchBg: '#FFFFFF',
    statPillBg: '#F7F7F7',
    cardDefault: '#FFFFFF',
    cardGreenBg: '#E1F5EE',
    cardGreenBorder: '#9FE1CB',
    cardAmberBg: '#FAEEDA',
    cardAmberBorder: '#FAC775',
    iconBtnBg: '#FFFFFF',
    newCatBtnBg: '#E1F5EE',
    newCatBtnBorder: '#9FE1CB',
  };
}
