import { t } from '@/i18n/strings';
import {
  remoteCreateCustomer,
  remoteClearCustomerRecords,
  remoteDeleteCustomer,
  remoteUpdateCustomer,
} from '@/services/remoteApi';
import { loadShopCache, saveShopCache } from '@/services/localCacheService';
import { appendOutbox, loadOutbox, purgeOutboxForCustomer, saveOutbox } from '@/services/outboxService';
import { generateLocalObjectId } from '@/services/localObjectId';
import { isOnline } from '@/services/networkStatus';
import {
  applyOfflineClearCustomerRecords,
  applyOfflineCreateCustomer,
  applyOfflineDeleteCustomer,
  applyOfflineUpdateCustomer,
  emptyPayload,
  newOpId,
} from '@/services/offlinePayload';
import { notifyShopCacheDirty } from '@/services/shopCacheNotify';

async function cacheBase(ownerId) {
  return (await loadShopCache(ownerId)) || emptyPayload();
}

export async function createCustomer(ownerId, { name, phone, address }) {
  const fields = {
    name: String(name || '').trim(),
    phone: phone ? String(phone).trim() : '',
    address: address ? String(address).trim() : '',
  };
  if (await isOnline()) {
    const res = await remoteCreateCustomer(fields);
    if (!res?.id) {
      throw new Error(t('ac_errNoId'));
    }
    return res.id;
  }
  const tempId = await generateLocalObjectId();
  await appendOutbox(ownerId, {
    type: 'CREATE_CUSTOMER',
    opId: newOpId(),
    tempCustomerId: tempId,
    name: fields.name,
    phone: fields.phone,
    address: fields.address,
  });
  const next = applyOfflineCreateCustomer(await cacheBase(ownerId), ownerId, tempId, fields);
  await saveShopCache(ownerId, next);
  notifyShopCacheDirty(ownerId);
  return tempId;
}

export async function deleteCustomer(ownerId, customerId) {
  if (await isOnline()) {
    await remoteDeleteCustomer(customerId);
    return;
  }
  let queue = await loadOutbox(ownerId);
  const onlyPendingCreate = queue.some(
    (o) => o.type === 'CREATE_CUSTOMER' && o.tempCustomerId === customerId
  );
  if (onlyPendingCreate) {
    queue = purgeOutboxForCustomer(queue, customerId);
    await saveOutbox(ownerId, queue);
  } else {
    await appendOutbox(ownerId, {
      type: 'DELETE_CUSTOMER',
      opId: newOpId(),
      customerId,
    });
  }
  const next = applyOfflineDeleteCustomer(await cacheBase(ownerId), customerId);
  await saveShopCache(ownerId, next);
  notifyShopCacheDirty(ownerId);
}

export async function updateCustomer(ownerId, customerId, { name, phone, address }) {
  const fields = {
    name: String(name || '').trim(),
    phone: phone != null ? String(phone).trim() : '',
    address: address != null ? String(address).trim() : '',
  };
  if (await isOnline()) {
    await remoteUpdateCustomer(customerId, fields);
    return;
  }
  await appendOutbox(ownerId, {
    type: 'UPDATE_CUSTOMER',
    opId: newOpId(),
    customerId,
    name: fields.name,
    phone: fields.phone,
    address: fields.address,
  });
  const next = applyOfflineUpdateCustomer(await cacheBase(ownerId), customerId, fields);
  await saveShopCache(ownerId, next);
  notifyShopCacheDirty(ownerId);
}

export async function clearCustomerRecords(ownerId, customerId) {
  if (await isOnline()) {
    await remoteClearCustomerRecords(customerId);
    return;
  }
  await appendOutbox(ownerId, {
    type: 'CLEAR_CUSTOMER_RECORDS',
    opId: newOpId(),
    customerId,
  });
  const next = applyOfflineClearCustomerRecords(await cacheBase(ownerId), customerId);
  await saveShopCache(ownerId, next);
  notifyShopCacheDirty(ownerId);
}
