import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { setAppLanguage, t as translate } from '@/i18n/strings';
import * as preferencesService from '@/services/preferencesService';

const LocaleContext = createContext(null);

export function LocaleProvider({ children }) {
  const [locale, setLocaleState] = useState('en');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const lang = await preferencesService.getLanguagePreference();
      setAppLanguage(lang);
      setLocaleState(lang);
      setLoaded(true);
    })();
  }, []);

  const setLocale = useCallback(async (lang) => {
    const next = lang === 'tl' ? 'tl' : 'en';
    setAppLanguage(next);
    setLocaleState(next);
    await preferencesService.setLanguagePreference(next);
  }, []);

  const t = useCallback((key, params) => translate(key, params), [locale]);

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
    }),
    [locale, setLocale, t]
  );

  if (!loaded) {
    return null;
  }

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error('useLocale must be used within LocaleProvider');
  }
  return ctx;
}
