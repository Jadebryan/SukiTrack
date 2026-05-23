export const HOME_AVATAR_PALETTE = [
  { bg: '#FFE0B2', text: '#E65100' },
  { bg: '#E1F5EE', text: '#085041' },
  { bg: '#EDE7F6', text: '#4527A0' },
  { bg: '#FCE4EC', text: '#880E4F' },
  { bg: '#E8F5E9', text: '#1B5E20' },
  { bg: '#E3F2FD', text: '#0D47A1' },
];

export function getHomePalette(isDark) {
  const shared = {
    green700: '#0F6E56',
    green600: '#1D9E75',
    green100: '#9FE1CB',
    green50: '#E1F5EE',
    red800: '#A32D2D',
    red50: '#FCEBEB',
    amber700: '#854F0B',
    amber50: '#FAEEDA',
  };

  if (isDark) {
    return {
      ...shared,
      bg: '#121212',
      surface: '#252525',
      surfaceElevated: '#2e2e2e',
      border: 'rgba(255,255,255,0.10)',
      text: '#FFFFFF',
      textSecondary: '#888780',
      textFaint: '#6B6B6B',
      searchBg: '#252525',
      pillBg: '#252525',
      pillText: '#D3D1C7',
      cardBg: '#252525',
      iconBtnBg: '#252525',
      chipBg: '#2e2e2e',
      chipText: '#D3D1C7',
      tipsBg: '#0F6E5626',
      tipsBorder: '#1D9E7544',
    };
  }

  return {
    ...shared,
    bg: '#F7F7F7',
    surface: '#FFFFFF',
    surfaceElevated: '#F0F0F0',
    border: 'rgba(0,0,0,0.10)',
    text: '#1D1D1D',
    textSecondary: '#5F5E5A',
    textFaint: '#888780',
    searchBg: '#FFFFFF',
    pillBg: '#FFFFFF',
    pillText: '#5F5E5A',
    cardBg: '#FFFFFF',
    iconBtnBg: '#FFFFFF',
    chipBg: '#FFFFFF',
    chipText: '#5F5E5A',
    tipsBg: '#E1F5EE',
    tipsBorder: '#9FE1CB',
  };
}

export function homeAvatarColor(name) {
  const s = String(name || 'A');
  const idx = s.charCodeAt(0) % HOME_AVATAR_PALETTE.length;
  return HOME_AVATAR_PALETTE[idx];
}
