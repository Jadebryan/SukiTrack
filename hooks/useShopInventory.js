import { useShopInventory, useShopMeta } from '@/contexts/ShopDataContext';

/** Inventory list + sync meta without subscribing to customers/pages. */
export function useInventoryShopData() {
  const inventory = useShopInventory();
  const { loading, error, refresh, pendingOutboxCount } = useShopMeta();
  return { inventory, loading, error, refresh, pendingOutboxCount };
}
