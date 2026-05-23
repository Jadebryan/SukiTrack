import { useShopCustomers, useShopMeta } from '@/contexts/ShopDataContext';

export function useCustomers(ownerId) {
  const customers = useShopCustomers();
  const { loading, error, refresh, pendingOutboxCount } = useShopMeta();
  const ready = Boolean(ownerId);
  return {
    customers: ready ? customers : [],
    loading: ready && loading,
    error: ready ? error : null,
    refresh,
    pendingOutboxCount: ready ? pendingOutboxCount : 0,
  };
}
