import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import * as authApi from '@/services/authApi';
import * as pinService from '@/services/pinService';
import * as sessionService from '@/services/sessionService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [pinReady, setPinReady] = useState(false);
  const [pinUnlocked, setPinUnlocked] = useState(false);
  const [hasPin, setHasPin] = useState(false);

  useEffect(() => {
    setAuthReady(true);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const sess = await sessionService.loadSession();
        if (sess) {
          setUser({
            token: sess.token,
            refreshToken: sess.refreshToken || undefined,
            ownerId: sess.ownerId,
            email: sess.email,
          });
        }
        const hp = await pinService.hasPin();
        setHasPin(hp);
      } finally {
        setPinReady(true);
        setSessionLoading(false);
      }
    })();
  }, []);

  const unlockSession = useCallback(() => setPinUnlocked(true), []);
  const lockSession = useCallback(() => setPinUnlocked(false), []);

  const signIn = useCallback(async ({ token, refreshToken, ownerId, email }) => {
    await sessionService.saveSession({ token, refreshToken, ownerId, email });
    setUser({ token, refreshToken, ownerId, email });
  }, []);

  /** Clears server session; PIN stays on device so after sign-in you only enter PIN again. */
  const signOut = useCallback(async () => {
    try {
      const sess = await sessionService.loadSession();
      if (sess?.token) {
        await authApi.logout({ token: sess.token });
      }
    } catch {
      /* offline or session already invalid */
    }
    await sessionService.clearSession();
    setUser(null);
    setPinUnlocked(false);
    const hp = await pinService.hasPin();
    setHasPin(hp);
  }, []);

  const refreshPinState = useCallback(async () => {
    const hp = await pinService.hasPin();
    setHasPin(hp);
  }, []);

  const value = useMemo(
    () => ({
      user,
      authReady,
      sessionLoading,
      pinReady,
      pinUnlocked,
      hasPin,
      unlockSession,
      lockSession,
      signIn,
      signOut,
      refreshPinState,
    }),
    [
      user,
      authReady,
      sessionLoading,
      pinReady,
      pinUnlocked,
      hasPin,
      unlockSession,
      lockSession,
      signIn,
      signOut,
      refreshPinState,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
