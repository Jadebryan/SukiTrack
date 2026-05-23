import NetInfo from '@react-native-community/netinfo';
import React, {
  createContext,
  startTransition,
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
import { prepareShopPayload } from '@/utils/prepareShopPayload';

const ShopMetaContext = createContext(null);
const ShopCustomersContext = createContext([]);
const ShopPagesContext = createContext([]);
const ShopInventoryContext = createContext([]);

const POLL_MS = 22000;

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
    const prepared = prepareShopPayload(payload);
    setCustomers(prepared.customers);
    startTransition(() => {
      setInventory(prepared.inventory);
      setPages(prepared.pages);
    });
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

  const metaValue = useMemo(
    () => ({
      loading,
      error,
      refresh,
      pendingOutboxCount,
    }),
    [loading, error, refresh, pendingOutboxCount]
  );

  return (
    <ShopMetaContext.Provider value={metaValue}>
      <ShopCustomersContext.Provider value={customers}>
        <ShopPagesContext.Provider value={pages}>
          <ShopInventoryContext.Provider value={inventory}>
            {children}
          </ShopInventoryContext.Provider>
        </ShopPagesContext.Provider>
      </ShopCustomersContext.Provider>
    </ShopMetaContext.Provider>
  );
}

export function useShopMeta() {
  const ctx = useContext(ShopMetaContext);
  if (!ctx) {
    throw new Error('useShopMeta must be used within ShopDataProvider');
  }
  return ctx;
}

export function useShopCustomers() {
  return useContext(ShopCustomersContext);
}

export function useShopPages() {
  return useContext(ShopPagesContext);
}

export function useShopInventory() {
  return useContext(ShopInventoryContext);
}

/** Full shop snapshot — prefer slice hooks on Home / Inventory for fewer re-renders. */
export function useShopData() {
  const meta = useShopMeta();
  const customers = useShopCustomers();
  const pages = useShopPages();
  const inventory = useShopInventory();
  return {
    ...meta,
    customers,
    pages,
    inventory,
  };
}
