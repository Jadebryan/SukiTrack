import NetInfo from '@react-native-community/netinfo';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';
import { isApiConfigured } from '@/constants/apiConfig';
import { t } from '@/i18n/strings';
import { fetchBootstrap } from '@/services/remoteApi';
import { loadShopCache, saveShopCache } from '@/services/localCacheService';
import { loadOutbox } from '@/services/outboxService';
import { processOutbox } from '@/services/syncOutbox';
import { setShopCacheListener } from '@/services/shopCacheNotify';
import { mergeBootstrapWithLocalInventoryImages } from '@/utils/shopPayloadMerge';

const ShopDataContext = createContext(null);

const POLL_MS = 22000;

function sortCustomers(rows) {
  return [...rows].sort((a, b) =>
    String(a.name || '').localeCompare(String(b.name || ''), 'en', {
      sensitivity: 'base',
    })
  );
}

function sortPages(rows) {
  return [...rows].sort((a, b) => {
    const ta = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const tb = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return tb - ta;
  });
}

function sortInventory(rows) {
  return [...rows].sort((a, b) =>
    String(a.name || '').localeCompare(String(b.name || ''), 'en', {
      sensitivity: 'base',
    })
  );
}

export function ShopDataProvider({ ownerId, children }) {
  const [customers, setCustomers] = useState([]);
  const [pages, setPages] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingOutboxCount, setPendingOutboxCount] = useState(0);
  const mounted = useRef(true);

  const bumpPending = useCallback(async () => {
    if (!ownerId) {
      setPendingOutboxCount(0);
      return;
    }
    const q = await loadOutbox(ownerId);
    setPendingOutboxCount(q.length);
  }, [ownerId]);

  const applyPayload = useCallback((payload) => {
    if (!payload) return;
    setCustomers(sortCustomers(payload.customers || []));
    setPages(sortPages(payload.pages || []));
    const locals = payload.inventoryLocalImages || {};
    setInventory(
      sortInventory(
        (payload.inventory || []).map((row) => ({
          ...row,
          imageLocalUri:
            row.imageUrl && /^https:\/\//i.test(String(row.imageUrl).trim())
              ? null
              : locals[row.id] || null,
        }))
      )
    );
  }, []);

  const refresh = useCallback(async () => {
    if (!ownerId) return;
    if (!isApiConfigured()) {
      setError(new Error(t('err_noApiUrl')));
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const syncRes = await processOutbox(ownerId);
      if (!syncRes.ok && syncRes.error && mounted.current) {
        setError(syncRes.error);
      }
      const data = await fetchBootstrap();
      if (!mounted.current) return;
      const prev = await loadShopCache(ownerId);
      const merged = mergeBootstrapWithLocalInventoryImages(data, prev);
      applyPayload(merged);
      await saveShopCache(ownerId, merged);
      setError(null);
    } catch (e) {
      if (mounted.current) {
        setError(e);
      }
    } finally {
      if (mounted.current) {
        setLoading(false);
        bumpPending();
      }
    }
  }, [ownerId, applyPayload, bumpPending]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    setShopCacheListener((oid) => {
      if (oid !== ownerId) return;
      (async () => {
        const cached = await loadShopCache(ownerId);
        if (mounted.current && cached) {
          applyPayload(cached);
        }
        await bumpPending();
      })();
    });
    return () => setShopCacheListener(null);
  }, [ownerId, applyPayload, bumpPending]);

  useEffect(() => {
    bumpPending();
  }, [bumpPending]);

  useEffect(() => {
    if (!ownerId) {
      setCustomers([]);
      setPages([]);
      setInventory([]);
      setLoading(false);
      setError(null);
      setPendingOutboxCount(0);
      return;
    }

    if (!isApiConfigured()) {
      (async () => {
        const cached = await loadShopCache(ownerId);
        if (cached) {
          applyPayload(cached);
        }
        await bumpPending();
      })();
      setLoading(false);
      setError(new Error(t('err_noApiUrlExample')));
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      const cached = await loadShopCache(ownerId);
      if (!cancelled && cached) {
        applyPayload(cached);
        setLoading(false);
      }
      try {
        await processOutbox(ownerId);
        const data = await fetchBootstrap();
        if (!cancelled) {
          const prev = await loadShopCache(ownerId);
          const merged = mergeBootstrapWithLocalInventoryImages(data, prev);
          applyPayload(merged);
          await saveShopCache(ownerId, merged);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          bumpPending();
        }
      }
    })();

    const poll = setInterval(() => {
      if (!isApiConfigured()) return;
      (async () => {
        try {
          await processOutbox(ownerId);
          const data = await fetchBootstrap();
          if (!cancelled && mounted.current) {
            const prev = await loadShopCache(ownerId);
            const merged = mergeBootstrapWithLocalInventoryImages(data, prev);
            applyPayload(merged);
            saveShopCache(ownerId, merged);
          }
        } catch {
          /* keep last good cache */
        } finally {
          if (mounted.current) bumpPending();
        }
      })();
    }, POLL_MS);

    const netSub = NetInfo.addEventListener((state) => {
      if (state.isConnected && isApiConfigured()) {
        (async () => {
          try {
            await processOutbox(ownerId);
            const data = await fetchBootstrap();
            if (!cancelled && mounted.current) {
              const prev = await loadShopCache(ownerId);
              const merged = mergeBootstrapWithLocalInventoryImages(data, prev);
              applyPayload(merged);
              saveShopCache(ownerId, merged);
            }
          } catch {
            /* noop */
          } finally {
            if (mounted.current) bumpPending();
          }
        })();
      }
    });

    const runSyncFromForeground = () => {
      if (!isApiConfigured() || cancelled || !mounted.current) return;
      (async () => {
        try {
          await processOutbox(ownerId);
          const data = await fetchBootstrap();
          if (!cancelled && mounted.current) {
            const prev = await loadShopCache(ownerId);
            const merged = mergeBootstrapWithLocalInventoryImages(data, prev);
            applyPayload(merged);
            saveShopCache(ownerId, merged);
          }
        } catch {
          /* keep cache */
        } finally {
          if (mounted.current) bumpPending();
        }
      })();
    };

    const appSub = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        runSyncFromForeground();
      }
    });

    return () => {
      cancelled = true;
      clearInterval(poll);
      netSub();
      appSub.remove();
    };
  }, [ownerId, applyPayload, bumpPending]);

  const value = useMemo(
    () => ({
      customers,
      pages,
      inventory,
      loading,
      error,
      refresh,
      pendingOutboxCount,
    }),
    [customers, pages, inventory, loading, error, refresh, pendingOutboxCount]
  );

  return (
    <ShopDataContext.Provider value={value}>{children}</ShopDataContext.Provider>
  );
}

export function useShopData() {
  const ctx = useContext(ShopDataContext);
  if (!ctx) {
    throw new Error('useShopData must be used within ShopDataProvider');
  }
  return ctx;
}
