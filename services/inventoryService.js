import { apiFetch } from '@/services/apiClient';
import { t } from '@/i18n/strings';
import { loadShopCache, saveShopCache } from '@/services/localCacheService';
import {
  appendOutbox,
  loadOutbox,
  purgeOutboxForInventory,
  saveOutbox,
} from '@/services/outboxService';
import { generateLocalObjectId } from '@/services/localObjectId';
import { isOnline } from '@/services/networkStatus';
import {
  applyOfflineCreateInventory,
  applyOfflineDeleteInventory,
  applyOfflineUpdateInventory,
  emptyPayload,
  newOpId,
} from '@/services/offlinePayload';
import { readImageUriAsBase64, uploadInventoryImageToServer } from '@/services/inventoryImageApi';
import {
  deleteLocalInventoryImageFile,
  persistLocalInventoryImage,
} from '@/services/inventoryImageStorage';
import { notifyShopCacheDirty } from '@/services/shopCacheNotify';
import { loadSession } from '@/services/sessionService';

async function cacheBase(ownerId) {
  return (await loadShopCache(ownerId)) || emptyPayload();
}

async function tryUploadPickedImage(pickedUri) {
  try {
    const { base64, mimeType } = await readImageUriAsBase64(pickedUri);
    const up = await uploadInventoryImageToServer(base64, mimeType);
    if (up?.url && /^https:\/\//i.test(String(up.url))) return String(up.url);
  } catch {
    /* Cloudinary off or network */
  }
  return null;
}

async function attachLocalImageToCache(ownerId, inventoryId, fileUri) {
  const base = await cacheBase(ownerId);
  const next = {
    ...base,
    inventoryLocalImages: {
      ...(base.inventoryLocalImages || {}),
      [inventoryId]: fileUri,
    },
  };
  await saveShopCache(ownerId, next);
  notifyShopCacheDirty(ownerId);
}

export async function createInventoryItem(payload) {
  const session = await loadSession();
  const ownerId = session?.ownerId;
  if (!ownerId) {
    throw new Error(t('api_loggedOut'));
  }
  const body = {
    name: String(payload.name || '').trim(),
    category: String(payload.category || '').trim(),
    unitPrice: payload.unitPrice,
  };
  const pickedUri = payload.pickedImageUri ? String(payload.pickedImageUri) : null;

  if (await isOnline()) {
    let imageUrl = null;
    if (pickedUri) {
      imageUrl = await tryUploadPickedImage(pickedUri);
      if (!imageUrl) {
        const rowDraft = await apiFetch('/inventory', {
          method: 'POST',
          body: JSON.stringify({ ...body, imageUrl: null }),
        });
        const localUri = await persistLocalInventoryImage(ownerId, rowDraft.id, pickedUri);
        await attachLocalImageToCache(ownerId, rowDraft.id, localUri);
        return { ...rowDraft, imageUrl: null };
      }
    }
    return apiFetch('/inventory', {
      method: 'POST',
      body: JSON.stringify({ ...body, imageUrl }),
    });
  }

  const tempId = await generateLocalObjectId();
  let localUri = null;
  if (pickedUri) {
    localUri = await persistLocalInventoryImage(ownerId, tempId, pickedUri);
  }
  await appendOutbox(ownerId, {
    type: 'CREATE_INVENTORY',
    opId: newOpId(),
    tempInventoryId: tempId,
    name: body.name,
    category: body.category,
    unitPrice: body.unitPrice,
    localImageUri: localUri || undefined,
  });
  const next = applyOfflineCreateInventory(await cacheBase(ownerId), ownerId, tempId, {
    name: body.name,
    category: body.category,
    unitPrice: body.unitPrice,
    localImageUri: localUri,
  });
  await saveShopCache(ownerId, next);
  notifyShopCacheDirty(ownerId);
  return {
    id: tempId,
    ownerId,
    name: body.name,
    category: body.category,
    unitPrice: body.unitPrice,
    imageUrl: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function updateInventoryItem(id, payload) {
  const session = await loadSession();
  const ownerId = session?.ownerId;
  if (!ownerId) {
    throw new Error(t('api_loggedOut'));
  }
  const body = {
    name: String(payload.name || '').trim(),
    category:
      payload.category != null ? String(payload.category).trim() : undefined,
    unitPrice: payload.unitPrice,
  };
  const pickedUri = payload.pickedImageUri ? String(payload.pickedImageUri) : null;
  const clearProductImage = Boolean(payload.clearProductImage);

  if (await isOnline()) {
    let imageUrlPatch = undefined;
    if (clearProductImage) {
      imageUrlPatch = null;
    } else if (pickedUri) {
      const uploaded = await tryUploadPickedImage(pickedUri);
      if (uploaded) {
        imageUrlPatch = uploaded;
        const base = await cacheBase(ownerId);
        const loc = { ...(base.inventoryLocalImages || {}) };
        delete loc[id];
        await saveShopCache(ownerId, { ...base, inventoryLocalImages: loc });
      } else {
        const localUri = await persistLocalInventoryImage(ownerId, id, pickedUri);
        await attachLocalImageToCache(ownerId, id, localUri);
      }
    }
    const patchBody = {
      name: body.name,
      category: body.category,
      unitPrice: body.unitPrice,
    };
    if (clearProductImage || pickedUri || imageUrlPatch !== undefined) {
      patchBody.imageUrl = imageUrlPatch === undefined ? undefined : imageUrlPatch;
    }
    if (clearProductImage) {
      await deleteLocalInventoryImageFile(ownerId, id);
      const base = await cacheBase(ownerId);
      const loc = { ...(base.inventoryLocalImages || {}) };
      delete loc[id];
      await saveShopCache(ownerId, { ...base, inventoryLocalImages: loc });
    }
    return apiFetch(`/inventory/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patchBody),
    });
  }

  let localUri = null;
  if (clearProductImage) {
    await deleteLocalInventoryImageFile(ownerId, id);
  } else if (pickedUri) {
    localUri = await persistLocalInventoryImage(ownerId, id, pickedUri);
  }
  await appendOutbox(ownerId, {
    type: 'UPDATE_INVENTORY',
    opId: newOpId(),
    inventoryId: id,
    name: body.name,
    category: body.category ?? '',
    unitPrice: body.unitPrice,
    localImageUri: localUri || undefined,
    clearProductImage: clearProductImage || undefined,
  });
  const next = applyOfflineUpdateInventory(await cacheBase(ownerId), id, {
    name: body.name,
    category: body.category,
    unitPrice: body.unitPrice,
    localImageUri: localUri || undefined,
    clearProductImage,
  });
  await saveShopCache(ownerId, next);
  notifyShopCacheDirty(ownerId);
}

export async function deleteInventoryItem(id) {
  const session = await loadSession();
  const ownerId = session?.ownerId;
  if (!ownerId) {
    throw new Error(t('api_loggedOut'));
  }
  await deleteLocalInventoryImageFile(ownerId, id);
  if (await isOnline()) {
    return apiFetch(`/inventory/${id}`, { method: 'DELETE' });
  }
  let queue = await loadOutbox(ownerId);
  if (queue.some((o) => o.type === 'CREATE_INVENTORY' && o.tempInventoryId === id)) {
    queue = purgeOutboxForInventory(queue, id);
    await saveOutbox(ownerId, queue);
  } else {
    await appendOutbox(ownerId, {
      type: 'DELETE_INVENTORY',
      opId: newOpId(),
      inventoryId: id,
    });
  }
  const next = applyOfflineDeleteInventory(await cacheBase(ownerId), id);
  await saveShopCache(ownerId, next);
  notifyShopCacheDirty(ownerId);
}
