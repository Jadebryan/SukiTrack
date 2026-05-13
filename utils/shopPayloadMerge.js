/**
 * Merge server bootstrap with persisted local-only inventory images (file:// paths).
 * Drops local entries when the server row has an HTTPS imageUrl, or when the row is gone.
 */
export function mergeBootstrapWithLocalInventoryImages(serverData, previousCache) {
  const inv = serverData.inventory || [];
  const prevLocals = previousCache?.inventoryLocalImages || {};
  const nextLocals = { ...prevLocals };
  const ids = new Set(inv.map((r) => r.id));
  for (const k of Object.keys(nextLocals)) {
    if (!ids.has(k)) delete nextLocals[k];
  }
  for (const row of inv) {
    const u = row.imageUrl && String(row.imageUrl).trim();
    if (u && /^https:\/\//i.test(u)) {
      delete nextLocals[row.id];
    }
  }
  return {
    ...serverData,
    inventory: inv,
    inventoryLocalImages: nextLocals,
  };
}
