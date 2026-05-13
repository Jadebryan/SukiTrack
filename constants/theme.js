import { configureFonts, MD3DarkTheme, MD3LightTheme } from 'react-native-paper';

export const font = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semiBold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
  extraBold: 'Poppins_800ExtraBold',
};

function poppinsFamilyForVariant(name) {
  if (name.startsWith('display') || name.startsWith('headline')) {
    return font.bold;
  }
  if (name.startsWith('title')) {
    return font.semiBold;
  }
  if (name.startsWith('label')) {
    return font.medium;
  }
  return font.regular;
}

function withPoppinsFonts(md3Fonts) {
  return Object.fromEntries(
    Object.entries(md3Fonts).map(([name, spec]) => {
      const { fontWeight: _w, ...rest } = spec;
      return [
        name,
        {
          ...rest,
          fontFamily: poppinsFamilyForVariant(name),
        },
      ];
    })
  );
}

const poppinsLightFonts = configureFonts({
  isV3: true,
  config: withPoppinsFonts(MD3LightTheme.fonts),
});

const poppinsDarkFonts = configureFonts({
  isV3: true,
  config: withPoppinsFonts(MD3DarkTheme.fonts),
});

/** Shared overlay modal sheet (customers, inventory, transactions). */
export const overlaySheet = {
  maxWidth: 400,
  borderRadius: 18,
  elevation: 5,
};

export const brandGreen = '#2E7D32';
export const brandGreenLight = '#4CAF50';
export const surfaceLight = '#FAFAFA';
export const balanceHigh = '#C62828';
export const balanceMedium = '#F9A825';
export const balancePaid = '#2E7D32';

export const paperLightTheme = {
  ...MD3LightTheme,
  fonts: poppinsLightFonts,
  colors: {
    ...MD3LightTheme.colors,
    primary: brandGreen,
    primaryContainer: '#C8E6C9',
    secondary: brandGreenLight,
    surface: '#FFFFFF',
    surfaceVariant: '#F1F8E9',
    error: balanceHigh,
  },
};

export const paperDarkTheme = {
  ...MD3DarkTheme,
  fonts: poppinsDarkFonts,
  colors: {
    ...MD3DarkTheme.colors,
    primary: brandGreenLight,
    primaryContainer: '#1B5E20',
    secondary: '#81C784',
    surface: '#121212',
    surfaceVariant: '#1E1E1E',
    error: '#EF5350',
  },
};
