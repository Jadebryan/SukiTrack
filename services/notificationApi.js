import { apiFetch } from '@/services/apiClient';

export async function registerPushToken({ pushToken, deviceId }) {
  return apiFetch('/push-tokens', {
    method: 'POST',
    body: JSON.stringify({ pushToken, deviceId }),
  });
}
