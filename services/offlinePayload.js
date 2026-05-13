import * as Crypto from 'expo-crypto';

export function emptyPayload() {
  return { customers: [], pages: [], inventory: [], inventoryLocalImages: {} };
}

export function clonePayload(p) {
  return JSON.parse(JSON.stringify(p || emptyPayload()));
}

export function roundMoney(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function totalsFromPage(page) {
  const items = page.items || [];
  const payments = page.payments || [];
  const itemsTotal = roundMoney(
    items.reduce((s, i) => s + Math.abs(Number(i.amount) || 0), 0)
  );
  const paidTotal = roundMoney(
    payments.reduce((s, x) => s + Math.abs(Number(x.amount) || 0), 0)
  );
  return {
    itemsTotal,
    paidTotal,
    due: roundMoney(Math.max(0, itemsTotal - paidTotal)),
  };
}

function touchPage(page) {
  const t = new Date().toISOString();
  const next = { ...page, updatedAt: t };
  Object.assign(next, totalsFromPage(next));
  return next;
}

function findOpenPage(p, customerId) {
  return p.pages.find((x) => x.customerId === customerId && x.status === 'open');
}

export function applyOfflineCreateCustomer(payload, ownerId, tempId, { name, phone, address }) {
  const p = clonePayload(payload);
  const now = new Date().toISOString();
  p.customers.push({
    id: tempId,
    ownerId,
    name: String(name || '').trim(),
    phone: String(phone || '').trim(),
    address: String(address || '').trim(),
    balance: 0,
    lastTransactionAt: null,
    createdAt: now,
    updatedAt: now,
  });
  return p;
}

export function applyOfflineUpdateCustomer(payload, customerId, { name, phone, address }) {
  const p = clonePayload(payload);
  const c = p.customers.find((x) => x.id === customerId);
  if (!c) return p;
  const now = new Date().toISOString();
  c.name = String(name || '').trim();
  c.phone = String(phone != null ? phone : c.phone || '').trim();
  c.address = String(address != null ? address : c.address || '').trim();
  c.updatedAt = now;
  return p;
}

export function applyOfflineDeleteCustomer(payload, customerId) {
  const p = clonePayload(payload);
  p.customers = p.customers.filter((c) => c.id !== customerId);
  p.pages = p.pages.filter((pg) => pg.customerId !== customerId);
  return p;
}

export function applyOfflineClearCustomerRecords(payload, customerId) {
  const p = clonePayload(payload);
  const c = p.customers.find((x) => x.id === customerId);
  if (c) {
    c.balance = 0;
    c.lastTransactionAt = null;
    c.updatedAt = new Date().toISOString();
  }
  p.pages = p.pages.filter((pg) => !(pg.customerId === customerId));
  return p;
}

export function applyOfflineAddPageItem(
  payload,
  ownerId,
  customerId,
  { pageId, id, amount, description, note }
) {
  const p = clonePayload(payload);
  const cust = p.customers.find((c) => c.id === customerId);
  if (!cust) return p;
  const abs = roundMoney(Math.abs(Number(amount) || 0));
  const desc =
    String(description || note || '').trim() || 'Item';
  const now = new Date().toISOString();
  let page = findOpenPage(p, customerId);
  if (!page) {
    page = {
      id: pageId,
      ownerId,
      customerId,
      status: 'open',
      items: [],
      payments: [],
      itemsTotal: 0,
      paidTotal: 0,
      due: 0,
      paidAt: null,
      createdAt: now,
      updatedAt: now,
    };
    p.pages.push(page);
  }
  page.items = [...(page.items || []), { id, description: desc, amount: abs, note: note != null ? String(note).trim() : '', createdAt: now }];
  cust.balance = roundMoney((Number(cust.balance) || 0) + abs);
  cust.lastTransactionAt = now;
  cust.updatedAt = now;
  const idx = p.pages.indexOf(page);
  p.pages[idx] = touchPage(page);
  return p;
}

export function applyOfflineAddPagePayment(
  payload,
  ownerId,
  customerId,
  { id, amount, note }
) {
  const p = clonePayload(payload);
  const cust = p.customers.find((c) => c.id === customerId);
  const page = findOpenPage(p, customerId);
  if (!cust || !page) return p;
  const { itemsTotal, paidTotal, due } = totalsFromPage(page);
  if (itemsTotal <= 0) return p;
  const payR = roundMoney(Math.abs(Number(amount) || 0));
  const dueR = roundMoney(Math.max(0, due));
  if (payR <= 0 || dueR <= 0) return p;
  const applied = Math.min(payR, dueR);
  const now = new Date().toISOString();
  page.payments = [
    ...(page.payments || []),
    { id, amount: applied, note: String(note || '').trim(), createdAt: now },
  ];
  cust.balance = roundMoney(Math.max(0, (Number(cust.balance) || 0) - applied));
  cust.lastTransactionAt = now;
  cust.updatedAt = now;
  const nt = totalsFromPage(page);
  if (nt.itemsTotal > 0 && nt.paidTotal >= nt.itemsTotal - 0.0001) {
    page.status = 'paid';
    page.paidAt = now;
  }
  const idx = p.pages.indexOf(page);
  p.pages[idx] = touchPage(page);
  return p;
}

export function applyOfflineUpdatePageItem(
  payload,
  customerId,
  itemId,
  { amount, description, note }
) {
  const p = clonePayload(payload);
  const cust = p.customers.find((c) => c.id === customerId);
  const page = findOpenPage(p, customerId);
  if (!cust || !page) return p;
  const idx = (page.items || []).findIndex((x) => x.id === itemId);
  if (idx < 0) return p;
  const prevAmt = Math.abs(Number(page.items[idx].amount)) || 0;
  const abs = roundMoney(Math.abs(Number(amount) || 0));
  page.items[idx] = {
    ...page.items[idx],
    amount: abs,
    description: String(description || '').trim() || 'Item',
    note: note != null ? String(note).trim() : '',
  };
  const delta = roundMoney(abs - prevAmt);
  cust.balance = roundMoney((Number(cust.balance) || 0) + delta);
  if (cust.balance < 0) cust.balance = 0;
  cust.lastTransactionAt = new Date().toISOString();
  cust.updatedAt = cust.lastTransactionAt;
  const pi = p.pages.findIndex((x) => x === page);
  p.pages[pi] = touchPage(page);
  return p;
}

export function applyOfflineDeletePageItem(payload, customerId, itemId) {
  const p = clonePayload(payload);
  const cust = p.customers.find((c) => c.id === customerId);
  const page = findOpenPage(p, customerId);
  if (!cust || !page) return p;
  const idx = (page.items || []).findIndex((x) => x.id === itemId);
  if (idx < 0) return p;
  const prevAmt = Math.abs(Number(page.items[idx].amount)) || 0;
  page.items = (page.items || []).filter((x) => x.id !== itemId);
  cust.balance = roundMoney((Number(cust.balance) || 0) - prevAmt);
  if (cust.balance < 0) cust.balance = 0;
  cust.lastTransactionAt = new Date().toISOString();
  cust.updatedAt = cust.lastTransactionAt;
  const pi = p.pages.findIndex((x) => x === page);
  p.pages[pi] = touchPage(page);
  return p;
}

export function applyOfflineUpdatePagePayment(payload, customerId, paymentId, { amount, note }) {
  const p = clonePayload(payload);
  const cust = p.customers.find((c) => c.id === customerId);
  const page = findOpenPage(p, customerId);
  if (!cust || !page) return p;
  const idx = (page.payments || []).findIndex((x) => x.id === paymentId);
  if (idx < 0) return p;
  const { itemsTotal, paidTotal } = totalsFromPage(page);
  const prevAmt = Math.abs(Number(page.payments[idx].amount)) || 0;
  const abs = roundMoney(Math.abs(Number(amount) || 0));
  const nextPaidTotal = roundMoney(paidTotal - prevAmt + abs);
  if (itemsTotal <= 0 || nextPaidTotal > itemsTotal + 0.001) return p;
  page.payments[idx] = {
    ...page.payments[idx],
    amount: abs,
    note: String(note || '').trim(),
  };
  const delta = roundMoney(abs - prevAmt);
  cust.balance = roundMoney((Number(cust.balance) || 0) - delta);
  if (cust.balance < 0) cust.balance = 0;
  cust.lastTransactionAt = new Date().toISOString();
  cust.updatedAt = cust.lastTransactionAt;
  const nt = totalsFromPage(page);
  if (nt.itemsTotal > 0 && nt.paidTotal >= nt.itemsTotal - 0.0001) {
    page.status = 'paid';
    page.paidAt = new Date().toISOString();
  } else {
    page.status = 'open';
    page.paidAt = null;
  }
  const pi = p.pages.findIndex((x) => x === page);
  p.pages[pi] = touchPage(page);
  return p;
}

export function applyOfflineDeletePagePayment(payload, customerId, paymentId) {
  const p = clonePayload(payload);
  const cust = p.customers.find((c) => c.id === customerId);
  const page = findOpenPage(p, customerId);
  if (!cust || !page) return p;
  const idx = (page.payments || []).findIndex((x) => x.id === paymentId);
  if (idx < 0) return p;
  const prevAmt = Math.abs(Number(page.payments[idx].amount)) || 0;
  page.payments = (page.payments || []).filter((x) => x.id !== paymentId);
  cust.balance = roundMoney((Number(cust.balance) || 0) + prevAmt);
  cust.lastTransactionAt = new Date().toISOString();
  cust.updatedAt = cust.lastTransactionAt;
  const nt = totalsFromPage(page);
  if (nt.itemsTotal > 0 && nt.paidTotal >= nt.itemsTotal - 0.0001) {
    page.status = 'paid';
    page.paidAt = new Date().toISOString();
  } else {
    page.status = 'open';
    page.paidAt = null;
  }
  const pi = p.pages.findIndex((x) => x === page);
  p.pages[pi] = touchPage(page);
  return p;
}

export function applyOfflineCreateInventory(
  payload,
  ownerId,
  tempId,
  { name, category, unitPrice, localImageUri }
) {
  const p = clonePayload(payload);
  const now = new Date().toISOString();
  const up =
    unitPrice === null || unitPrice === undefined || Number.isNaN(Number(unitPrice))
      ? null
      : Number(unitPrice);
  p.inventory.push({
    id: tempId,
    ownerId,
    name: String(name || '').trim(),
    category: String(category || '').trim(),
    unitPrice: up,
    imageUrl: null,
    createdAt: now,
    updatedAt: now,
  });
  if (localImageUri) {
    p.inventoryLocalImages = {
      ...(p.inventoryLocalImages || {}),
      [tempId]: localImageUri,
    };
  }
  return p;
}

export function applyOfflineUpdateInventory(
  payload,
  id,
  { name, category, unitPrice, localImageUri, clearProductImage }
) {
  const p = clonePayload(payload);
  const row = p.inventory.find((x) => x.id === id);
  if (!row) return p;
  const now = new Date().toISOString();
  row.name = String(name || '').trim();
  row.category = String(category != null ? category : row.category || '').trim();
  const up =
    unitPrice === null || unitPrice === undefined || Number.isNaN(Number(unitPrice))
      ? null
      : Number(unitPrice);
  row.unitPrice = up;
  row.updatedAt = now;
  const loc = { ...(p.inventoryLocalImages || {}) };
  if (clearProductImage) {
    delete loc[id];
    row.imageUrl = null;
  } else if (localImageUri) {
    loc[id] = localImageUri;
    row.imageUrl = null;
  }
  p.inventoryLocalImages = loc;
  return p;
}

export function applyOfflineDeleteInventory(payload, id) {
  const p = clonePayload(payload);
  p.inventory = p.inventory.filter((x) => x.id !== id);
  const loc = { ...(p.inventoryLocalImages || {}) };
  delete loc[id];
  p.inventoryLocalImages = loc;
  return p;
}

export function newOpId() {
  return Crypto.randomUUID();
}
