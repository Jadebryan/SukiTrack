import * as Crypto from 'expo-crypto';
import {
  remoteAddPageItem,
  remoteAddPagePayment,
  remoteDeletePageItem,
  remoteDeletePagePayment,
  remoteUpdatePageItem,
  remoteUpdatePagePayment,
} from '@/services/remoteApi';
import { loadShopCache, saveShopCache } from '@/services/localCacheService';
import { appendOutbox } from '@/services/outboxService';
import { generateLocalObjectId } from '@/services/localObjectId';
import { isOnline } from '@/services/networkStatus';
import { t } from '@/i18n/strings';
import {
  applyOfflineAddPageItem,
  applyOfflineAddPagePayment,
  applyOfflineDeletePageItem,
  applyOfflineDeletePagePayment,
  applyOfflineUpdatePageItem,
  applyOfflineUpdatePagePayment,
  emptyPayload,
  newOpId,
  roundMoney,
} from '@/services/offlinePayload';
import { notifyShopCacheDirty } from '@/services/shopCacheNotify';

async function cacheBase(ownerId) {
  return (await loadShopCache(ownerId)) || emptyPayload();
}

function openPageItemsTotal(payload, customerId) {
  const p = payload.pages?.find((x) => x.customerId === customerId && x.status === 'open');
  if (!p) return 0;
  return roundMoney(
    (p.items || []).reduce((s, i) => s + Math.abs(Number(i.amount) || 0), 0)
  );
}

export async function addPageItem(ownerId, customerId, { amount, description, note }) {
  const body = {
    amount,
    description: description != null ? String(description).trim() : '',
    note: note != null ? String(note).trim() : '',
  };
  if (await isOnline()) {
    await remoteAddPageItem(customerId, body);
    return;
  }
  const base = await cacheBase(ownerId);
  const open = base.pages?.find((p) => p.customerId === customerId && p.status === 'open');
  const pageId = open ? undefined : await generateLocalObjectId();
  const itemId = Crypto.randomUUID();
  await appendOutbox(ownerId, {
    type: 'ADD_PAGE_ITEM',
    opId: newOpId(),
    customerId,
    amount: body.amount,
    description: body.description,
    note: body.note,
  });
  const next = applyOfflineAddPageItem(base, ownerId, customerId, {
    pageId,
    id: itemId,
    amount: body.amount,
    description: body.description,
    note: body.note,
  });
  await saveShopCache(ownerId, next);
  notifyShopCacheDirty(ownerId);
}

export async function addPagePayment(ownerId, customerId, { amount, note }) {
  const body = {
    amount,
    note: note ? String(note).trim() : '',
  };
  if (await isOnline()) {
    await remoteAddPagePayment(customerId, body);
    return;
  }
  const base = await cacheBase(ownerId);
  if (openPageItemsTotal(base, customerId) <= 0) {
    throw new Error(t('offline_payNeedsItems'));
  }
  const paymentId = Crypto.randomUUID();
  await appendOutbox(ownerId, {
    type: 'ADD_PAGE_PAYMENT',
    opId: newOpId(),
    customerId,
    amount: body.amount,
    note: body.note,
  });
  const next = applyOfflineAddPagePayment(base, ownerId, customerId, {
    id: paymentId,
    amount: body.amount,
    note: body.note,
  });
  await saveShopCache(ownerId, next);
  notifyShopCacheDirty(ownerId);
}

export async function updatePageItem(
  ownerId,
  customerId,
  itemId,
  { amount, description, note }
) {
  const body = {
    amount,
    description: description != null ? String(description).trim() : '',
    note: note != null ? String(note).trim() : '',
  };
  if (await isOnline()) {
    await remoteUpdatePageItem(customerId, itemId, body);
    return;
  }
  await appendOutbox(ownerId, {
    type: 'UPDATE_PAGE_ITEM',
    opId: newOpId(),
    customerId,
    itemId,
    amount: body.amount,
    description: body.description,
    note: body.note,
  });
  const next = applyOfflineUpdatePageItem(await cacheBase(ownerId), customerId, itemId, body);
  await saveShopCache(ownerId, next);
  notifyShopCacheDirty(ownerId);
}

export async function deletePageItem(ownerId, customerId, itemId) {
  if (await isOnline()) {
    await remoteDeletePageItem(customerId, itemId);
    return;
  }
  await appendOutbox(ownerId, {
    type: 'DELETE_PAGE_ITEM',
    opId: newOpId(),
    customerId,
    itemId,
  });
  const next = applyOfflineDeletePageItem(await cacheBase(ownerId), customerId, itemId);
  await saveShopCache(ownerId, next);
  notifyShopCacheDirty(ownerId);
}

export async function updatePagePayment(ownerId, customerId, paymentId, { amount, note }) {
  const body = {
    amount,
    note: note ? String(note).trim() : '',
  };
  if (await isOnline()) {
    await remoteUpdatePagePayment(customerId, paymentId, body);
    return;
  }
  await appendOutbox(ownerId, {
    type: 'UPDATE_PAGE_PAYMENT',
    opId: newOpId(),
    customerId,
    paymentId,
    amount: body.amount,
    note: body.note,
  });
  const next = applyOfflineUpdatePagePayment(
    await cacheBase(ownerId),
    customerId,
    paymentId,
    body
  );
  await saveShopCache(ownerId, next);
  notifyShopCacheDirty(ownerId);
}

export async function deletePagePayment(ownerId, customerId, paymentId) {
  if (await isOnline()) {
    await remoteDeletePagePayment(customerId, paymentId);
    return;
  }
  await appendOutbox(ownerId, {
    type: 'DELETE_PAGE_PAYMENT',
    opId: newOpId(),
    customerId,
    paymentId,
  });
  const next = applyOfflineDeletePagePayment(await cacheBase(ownerId), customerId, paymentId);
  await saveShopCache(ownerId, next);
  notifyShopCacheDirty(ownerId);
}
