/** ShopDataProvider registers here so offline mutations refresh UI from AsyncStorage cache. */
let listener = null;

export function setShopCacheListener(fn) {
  listener = fn;
}

export function notifyShopCacheDirty(ownerId) {
  try {
    listener?.(ownerId);
  } catch {
    /* noop */
  }
}
