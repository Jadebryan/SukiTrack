import { apiFetch } from '@/services/apiClient';

export async function fetchBootstrap() {
  return apiFetch('/bootstrap', { method: 'GET' });
}

/** Recent audit events for this account (destructive / sensitive actions). */
export async function fetchAuditLog(limit = 50) {
  const q = Number.isFinite(Number(limit)) ? Math.min(100, Math.max(1, Number(limit))) : 50;
  return apiFetch(`/audit-log?limit=${q}`, { method: 'GET' });
}

export async function remoteCreateCustomer(payload) {
  return apiFetch('/customers', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function remoteDeleteCustomer(customerId) {
  return apiFetch(`/customers/${customerId}`, {
    method: 'DELETE',
  });
}

export async function remoteUpdateCustomer(customerId, payload) {
  return apiFetch(`/customers/${customerId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function remoteAddPageItem(customerId, payload) {
  return apiFetch(`/customers/${customerId}/pages/items`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function remoteAddPagePayment(customerId, payload) {
  return apiFetch(`/customers/${customerId}/pages/payments`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function remoteUpdatePageItem(customerId, itemId, payload) {
  return apiFetch(`/customers/${customerId}/pages/items/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function remoteDeletePageItem(customerId, itemId) {
  return apiFetch(`/customers/${customerId}/pages/items/${itemId}`, {
    method: 'DELETE',
  });
}

export async function remoteUpdatePagePayment(customerId, paymentId, payload) {
  return apiFetch(`/customers/${customerId}/pages/payments/${paymentId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function remoteDeletePagePayment(customerId, paymentId) {
  return apiFetch(`/customers/${customerId}/pages/payments/${paymentId}`, {
    method: 'DELETE',
  });
}

export async function remoteClearCustomerRecords(customerId) {
  return apiFetch(`/customers/${customerId}/clear-records`, {
    method: 'POST',
  });
}
