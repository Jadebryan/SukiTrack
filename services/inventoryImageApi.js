import * as FileSystem from 'expo-file-system/legacy';
import { apiFetch } from '@/services/apiClient';

export async function readImageUriAsBase64(uri) {
  const b64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  let mimeType = 'image/jpeg';
  const lower = String(uri).toLowerCase();
  if (lower.includes('.png')) mimeType = 'image/png';
  else if (lower.includes('.webp')) mimeType = 'image/webp';
  return { base64: b64, mimeType };
}

export async function uploadInventoryImageToServer(base64, mimeType = 'image/jpeg') {
  return apiFetch('/inventory/upload-image', {
    method: 'POST',
    body: JSON.stringify({ base64, mimeType }),
  });
}
