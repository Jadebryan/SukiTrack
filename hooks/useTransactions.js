import { useMemo } from 'react';
import { useShopData } from '@/contexts/ShopDataContext';

export function useCustomerPages(ownerId, customerId) {
  const { pages, loading, error, refresh } = useShopData();
  const filtered = useMemo(() => {
    if (!customerId) return [];
    return pages.filter((p) => p.customerId === customerId);
  }, [pages, customerId]);
  const ready = Boolean(ownerId && customerId);
  return {
    pages: ready ? filtered : [],
    loading: ready && loading,
    error: ready ? error : null,
    refresh,
  };
}

export function useAllPages(ownerId) {
  const { pages, inventory, loading, error, refresh } = useShopData();
  const ready = Boolean(ownerId);
  return {
    pages: ready ? pages : [],
    inventory: ready ? inventory : [],
    loading: ready && loading,
    error: ready ? error : null,
    refresh,
  };
}
