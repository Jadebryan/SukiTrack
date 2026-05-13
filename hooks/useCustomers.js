import { useShopData } from '@/contexts/ShopDataContext';

export function useCustomers(ownerId) {
  const { customers, loading, error, refresh, pendingOutboxCount } = useShopData();
  const ready = Boolean(ownerId);
  return {
    customers: ready ? customers : [],
    loading: ready && loading,
    error: ready ? error : null,
    refresh,
    pendingOutboxCount: ready ? pendingOutboxCount : 0,
  };
}
