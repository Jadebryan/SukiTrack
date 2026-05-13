import { isApiConfigured } from '@/constants/apiConfig';
import { apiFetch } from '@/services/apiClient';
import { fetchBootstrap } from '@/services/remoteApi';
import {
  loadOutbox,
  remapCustomerIdInOutbox,
  remapInventoryIdInOutbox,
  saveOutbox,
} from '@/services/outboxService';
import { isOnline } from '@/services/networkStatus';
import { loadShopCache, saveShopCache } from '@/services/localCacheService';
import { notifyShopCacheDirty } from '@/services/shopCacheNotify';
import { readImageUriAsBase64 } from '@/services/inventoryImageApi';
import {
  deleteLocalInventoryImageFile,
  remapLocalInventoryImage,
} from '@/services/inventoryImageStorage';
import { mergeBootstrapWithLocalInventoryImages } from '@/utils/shopPayloadMerge';
import {
  remoteAddPageItem,
  remoteAddPagePayment,
  remoteClearCustomerRecords,
  remoteCreateCustomer,
  remoteDeleteCustomer,
  remoteDeletePageItem,
  remoteDeletePagePayment,
  remoteUpdateCustomer,
  remoteUpdatePageItem,
  remoteUpdatePagePayment,
} from '@/services/remoteApi';

let syncLock = null;

async function executeOp(op, ownerId) {
  switch (op.type) {
    case 'CREATE_CUSTOMER': {
      const res = await remoteCreateCustomer({
        name: op.name,
        phone: op.phone,
        address: op.address,
      });
      return { remapCustomer: { from: op.tempCustomerId, to: res.id } };
    }
    case 'UPDATE_CUSTOMER':
      await remoteUpdateCustomer(op.customerId, {
        name: op.name,
        phone: op.phone,
        address: op.address,
      });
      return {};
    case 'DELETE_CUSTOMER':
      await remoteDeleteCustomer(op.customerId);
      return {};
    case 'CLEAR_CUSTOMER_RECORDS':
      await remoteClearCustomerRecords(op.customerId);
      return {};
    case 'ADD_PAGE_ITEM':
      await remoteAddPageItem(op.customerId, {
        amount: op.amount,
        description: op.description,
        note: op.note,
      });
      return {};
    case 'ADD_PAGE_PAYMENT':
      await remoteAddPagePayment(op.customerId, {
        amount: op.amount,
        note: op.note,
      });
      return {};
    case 'UPDATE_PAGE_ITEM':
      await remoteUpdatePageItem(op.customerId, op.itemId, {
        amount: op.amount,
        description: op.description,
        note: op.note,
      });
      return {};
    case 'DELETE_PAGE_ITEM':
      await remoteDeletePageItem(op.customerId, op.itemId);
      return {};
    case 'UPDATE_PAGE_PAYMENT':
      await remoteUpdatePagePayment(op.customerId, op.paymentId, {
        amount: op.amount,
        note: op.note,
      });
      return {};
    case 'DELETE_PAGE_PAYMENT':
      await remoteDeletePagePayment(op.customerId, op.paymentId);
      return {};
    case 'CREATE_INVENTORY': {
      let imageUrl = null;
      if (op.localImageUri) {
        try {
          const { base64, mimeType } = await readImageUriAsBase64(op.localImageUri);
          const up = await apiFetch('/inventory/upload-image', {
            method: 'POST',
            body: JSON.stringify({ base64, mimeType }),
          });
          if (up?.url && /^https:\/\//i.test(String(up.url))) {
            imageUrl = String(up.url);
          }
        } catch {
          /* Cloudinary unavailable */
        }
      }
      const row = await apiFetch('/inventory', {
        method: 'POST',
        body: JSON.stringify({
          name: op.name,
          category: op.category,
          unitPrice: op.unitPrice,
          imageUrl,
        }),
      });
      if (op.localImageUri) {
        if (imageUrl) {
          await deleteLocalInventoryImageFile(ownerId, op.tempInventoryId);
          const base = (await loadShopCache(ownerId)) || {};
          const loc = { ...(base.inventoryLocalImages || {}) };
          delete loc[op.tempInventoryId];
          await saveShopCache(ownerId, { ...base, inventoryLocalImages: loc });
        } else {
          const newUri = await remapLocalInventoryImage(
            ownerId,
            op.tempInventoryId,
            row.id
          );
          if (newUri) {
            const base = (await loadShopCache(ownerId)) || {};
            const loc = { ...(base.inventoryLocalImages || {}) };
            delete loc[op.tempInventoryId];
            loc[row.id] = newUri;
            await saveShopCache(ownerId, { ...base, inventoryLocalImages: loc });
          }
        }
        notifyShopCacheDirty(ownerId);
      }
      return { remapInventory: { from: op.tempInventoryId, to: row.id } };
    }
    case 'UPDATE_INVENTORY': {
      const patch = {
        name: op.name,
        category: op.category,
        unitPrice: op.unitPrice,
      };
      if (op.clearProductImage) {
        patch.imageUrl = null;
      } else if (op.localImageUri) {
        let uploaded = null;
        try {
          const { base64, mimeType } = await readImageUriAsBase64(op.localImageUri);
          const up = await apiFetch('/inventory/upload-image', {
            method: 'POST',
            body: JSON.stringify({ base64, mimeType }),
          });
          if (up?.url && /^https:\/\//i.test(String(up.url))) {
            uploaded = String(up.url);
          }
        } catch {
          /* keep local only */
        }
        if (uploaded) {
          patch.imageUrl = uploaded;
          await deleteLocalInventoryImageFile(ownerId, op.inventoryId);
          const base = (await loadShopCache(ownerId)) || {};
          const loc = { ...(base.inventoryLocalImages || {}) };
          delete loc[op.inventoryId];
          await saveShopCache(ownerId, { ...base, inventoryLocalImages: loc });
        }
      }
      await apiFetch(`/inventory/${op.inventoryId}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
      return {};
    }
    case 'DELETE_INVENTORY':
      await apiFetch(`/inventory/${op.inventoryId}`, { method: 'DELETE' });
      return {};
    default:
      throw new Error(`Unknown outbox op: ${op.type}`);
  }
}

/**
 * Push queued mutations to the server, then replace local cache from bootstrap.
 * No-op when offline, missing API URL, or queue empty.
 */
export async function processOutbox(ownerId) {
  if (!ownerId || !isApiConfigured()) return { ok: true, processed: 0 };
  if (!(await isOnline())) return { ok: true, processed: 0 };

  if (syncLock) {
    await syncLock.catch(() => {});
  }

  syncLock = (async () => {
    let n = 0;
    let queue = await loadOutbox(ownerId);
    while (queue.length > 0) {
      const op = queue[0];
      const hint = (await executeOp(op, ownerId)) || {};
      queue = queue.slice(1);
      if (hint.remapCustomer) {
        queue = remapCustomerIdInOutbox(
          queue,
          hint.remapCustomer.from,
          hint.remapCustomer.to
        );
      }
      if (hint.remapInventory) {
        queue = remapInventoryIdInOutbox(
          queue,
          hint.remapInventory.from,
          hint.remapInventory.to
        );
      }
      await saveOutbox(ownerId, queue);
      n += 1;
    }
    let data;
    try {
      data = await fetchBootstrap();
    } catch (firstErr) {
      try {
        data = await fetchBootstrap();
      } catch {
        throw firstErr;
      }
    }
    const prev = await loadShopCache(ownerId);
    const merged = mergeBootstrapWithLocalInventoryImages(data, prev);
    await saveShopCache(ownerId, merged);
    notifyShopCacheDirty(ownerId);
    return n;
  })();

  try {
    const processed = await syncLock;
    return { ok: true, processed };
  } catch (e) {
    return { ok: false, processed: 0, error: e };
  } finally {
    syncLock = null;
  }
}
