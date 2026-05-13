import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { PaperProvider } from 'react-native-paper';
import { paperDarkTheme, paperLightTheme } from '@/constants/theme';
import { ToastProvider } from '@/contexts/ToastContext';
import * as preferencesService from '@/services/preferencesService';

const AppThemeContext = createContext(null);

export function AppThemeProvider({ children }) {
  const [darkEnabled, setDarkEnabled] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const v = await preferencesService.getDarkModePreference();
      setDarkEnabled(v);
      setLoaded(true);
    })();
  }, []);

  const theme = darkEnabled ? paperDarkTheme : paperLightTheme;

  const setDarkMode = useCallback(async (enabled) => {
    setDarkEnabled(enabled);
    await preferencesService.setDarkModePreference(enabled);
  }, []);

  const value = useMemo(
    () => ({
      isDark: darkEnabled,
      setDarkMode,
    }),
    [darkEnabled, setDarkMode]
  );

  if (!loaded) {
    return null;
  }

  return (
    <AppThemeContext.Provider value={value}>
      <PaperProvider theme={theme}>
        <ToastProvider isDark={darkEnabled}>{children}</ToastProvider>
      </PaperProvider>
    </AppThemeContext.Provider>
  );
}

export function useAppTheme() {
  const ctx = useContext(AppThemeContext);
  if (!ctx) {
    throw new Error('useAppTheme must be used within AppThemeProvider');
  }
  return ctx;
}
