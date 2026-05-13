import { useMemo } from 'react';
import { useShopData } from '@/contexts/ShopDataContext';

export function useCustomer(ownerId, customerId) {
  const { customers, loading, error, refresh } = useShopData();
  const customer = useMemo(() => {
    if (!customerId) return null;
    return customers.find((c) => c.id === customerId) ?? null;
  }, [customers, customerId]);
  const ready = Boolean(ownerId && customerId);
  return {
    customer: ready ? customer : null,
    loading: ready && loading,
    error: ready ? error : null,
    refresh,
  };
}
