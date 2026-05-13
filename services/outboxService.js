import AsyncStorage from '@react-native-async-storage/async-storage';

function key(ownerId) {
  return `utang_ph_outbox_v1_${ownerId}`;
}

export async function loadOutbox(ownerId) {
  if (!ownerId) return [];
  const raw = await AsyncStorage.getItem(key(ownerId));
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export async function saveOutbox(ownerId, ops) {
  if (!ownerId) return;
  await AsyncStorage.setItem(key(ownerId), JSON.stringify(ops));
}

export async function appendOutbox(ownerId, op) {
  const q = await loadOutbox(ownerId);
  q.push(op);
  await saveOutbox(ownerId, q);
}

/** Remove all queued ops tied to a customer (e.g. delete before first sync). */
export function purgeOutboxForCustomer(queue, customerId) {
  return queue.filter((op) => {
    switch (op.type) {
      case 'CREATE_CUSTOMER':
        return op.tempCustomerId !== customerId;
      case 'UPDATE_CUSTOMER':
      case 'DELETE_CUSTOMER':
      case 'CLEAR_CUSTOMER_RECORDS':
      case 'ADD_PAGE_ITEM':
      case 'ADD_PAGE_PAYMENT':
      case 'UPDATE_PAGE_ITEM':
      case 'DELETE_PAGE_ITEM':
      case 'UPDATE_PAGE_PAYMENT':
      case 'DELETE_PAGE_PAYMENT':
        return op.customerId !== customerId;
      default:
        return true;
    }
  });
}

export function remapCustomerIdInOutbox(queue, fromId, toId) {
  if (fromId === toId) return queue;
  return queue.map((op) => {
    const next = { ...op };
    const swap = (cid) => (cid === fromId ? toId : cid);
    switch (op.type) {
      case 'UPDATE_CUSTOMER':
      case 'DELETE_CUSTOMER':
      case 'CLEAR_CUSTOMER_RECORDS':
      case 'ADD_PAGE_ITEM':
      case 'ADD_PAGE_PAYMENT':
      case 'UPDATE_PAGE_ITEM':
      case 'DELETE_PAGE_ITEM':
      case 'UPDATE_PAGE_PAYMENT':
      case 'DELETE_PAGE_PAYMENT':
        next.customerId = swap(op.customerId);
        break;
      default:
        break;
    }
    return next;
  });
}

export function purgeOutboxForInventory(queue, inventoryId) {
  return queue.filter((op) => {
    if (op.type === 'CREATE_INVENTORY' && op.tempInventoryId === inventoryId) {
      return false;
    }
    if (
      (op.type === 'UPDATE_INVENTORY' || op.type === 'DELETE_INVENTORY') &&
      op.inventoryId === inventoryId
    ) {
      return false;
    }
    return true;
  });
}

export function remapInventoryIdInOutbox(queue, fromId, toId) {
  if (fromId === toId) return queue;
  return queue.map((op) => {
    if (op.type !== 'UPDATE_INVENTORY' && op.type !== 'DELETE_INVENTORY') return op;
    const next = { ...op };
    if (op.inventoryId === fromId) next.inventoryId = toId;
    return next;
  });
}
