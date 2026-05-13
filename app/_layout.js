import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/poppins';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import 'react-native-reanimated';
import { useTheme } from 'react-native-paper';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { AppThemeProvider, useAppTheme } from '@/contexts/AppThemeContext';
import { LocaleProvider, useLocale } from '@/contexts/LocaleContext';
import { ShopDataProvider } from '@/contexts/ShopDataContext';
import {
  getHeaderScreenOptions,
  getStackContentStyle,
  getStackSceneBackground,
} from '@/constants/navigationHeader';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'index',
};

SplashScreen.preventAutoHideAsync();

function DataShell({ children }) {
  const { pinUnlocked, user } = useAuth();
  /** Keep provider mounted so screens using useShopData never throw during lock/sign-out. */
  const ownerId =
    pinUnlocked && user?.ownerId && user?.token ? user.ownerId : null;
  return (
    <ShopDataProvider ownerId={ownerId}>{children}</ShopDataProvider>
  );
}

function ThemedStack() {
  const { isDark } = useAppTheme();
  const { t } = useLocale();
  const theme = useTheme();
  const headerOptions = getHeaderScreenOptions(theme, isDark);
  const sceneBg = getStackSceneBackground(theme, isDark);

  return (
    <View style={{ flex: 1, backgroundColor: sceneBg }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          ...headerOptions,
          contentStyle: getStackContentStyle(theme, isDark),
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen
          name="welcome"
          options={{ headerShown: false, title: 'Welcome' }}
        />
        <Stack.Screen
          name="register"
          options={{
            headerShown: false,
            title: t('nav_register'),
            headerBackTitle: t('nav_back'),
          }}
        />
        <Stack.Screen
          name="sign-in"
          options={{
            headerShown: false,
            title: t('nav_signIn'),
            headerBackTitle: t('nav_back'),
          }}
        />
        <Stack.Screen
          name="setup-pin"
          options={{ headerShown: false, title: 'PIN' }}
        />
        <Stack.Screen
          name="forgot-pin"
          options={{
            headerShown: false,
            title: t('nav_resetPin'),
            headerBackTitle: t('nav_back'),
          }}
        />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen
          name="change-password"
          options={{
            headerShown: false,
            title: t('nav_changePassword'),
            headerBackTitle: t('nav_back'),
          }}
        />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="customer/[id]"
          options={{ headerShown: true, title: t('nav_customer') }}
        />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <AppThemeProvider>
      <LocaleProvider>
        <AuthProvider>
          <DataShell>
            <ThemedStack />
          </DataShell>
        </AuthProvider>
      </LocaleProvider>
    </AppThemeProvider>
  );
}
