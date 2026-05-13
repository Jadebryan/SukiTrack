import { isOnline } from '@/services/networkStatus';

/** Success toast: normal copy when online, “saved on device” when offline. */
export async function toastSavedOnDeviceAware(showToast, t, onlineMessageKey) {
  const online = await isOnline();
  showToast({
    type: online ? 'success' : 'warning',
    message: t(online ? onlineMessageKey : 'toast_editsQueued'),
  });
}
