/** Sort + normalize bootstrap payload once per apply (keeps UI thread work predictable). */

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

function sortInventory(rows, locals = {}) {
  return [...rows]
    .sort((a, b) =>
      String(a.name || '').localeCompare(String(b.name || ''), 'en', {
        sensitivity: 'base',
      })
    )
    .map((row) => ({
      ...row,
      imageLocalUri:
        row.imageUrl && /^https:\/\//i.test(String(row.imageUrl).trim())
          ? null
          : locals[row.id] || null,
    }));
}

export function prepareShopPayload(payload) {
  if (!payload) {
    return { customers: [], pages: [], inventory: [] };
  }
  const locals = payload.inventoryLocalImages || {};
  return {
    customers: sortCustomers(payload.customers || []),
    pages: sortPages(payload.pages || []),
    inventory: sortInventory(payload.inventory || [], locals),
  };
}
