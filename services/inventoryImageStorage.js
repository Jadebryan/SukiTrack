import * as FileSystem from 'expo-file-system/legacy';

export function localInventoryImagePath(ownerId, itemId) {
  const base = FileSystem.documentDirectory || '';
  return `${base}inventory_media/${ownerId}/${itemId}.jpg`;
}

export async function ensureInventoryMediaDir(ownerId) {
  const dir = `${FileSystem.documentDirectory}inventory_media/${ownerId}/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});
}

/**
 * Copy picked asset into app-private storage keyed by inventory id.
 * @returns {Promise<string>} file:// URI
 */
export async function persistLocalInventoryImage(ownerId, itemId, sourceUri) {
  await ensureInventoryMediaDir(ownerId);
  const dest = localInventoryImagePath(ownerId, itemId);
  await FileSystem.copyAsync({ from: sourceUri, to: dest });
  return dest;
}

export async function deleteLocalInventoryImageFile(ownerId, itemId) {
  const p = localInventoryImagePath(ownerId, itemId);
  const info = await FileSystem.getInfoAsync(p);
  if (info.exists) {
    await FileSystem.deleteAsync(p, { idempotent: true });
  }
}

/** After server assigns real id, move temp file and return new file:// URI (or null). */
export async function remapLocalInventoryImage(ownerId, fromId, toId) {
  await ensureInventoryMediaDir(ownerId);
  const from = localInventoryImagePath(ownerId, fromId);
  const to = localInventoryImagePath(ownerId, toId);
  const info = await FileSystem.getInfoAsync(from);
  if (!info.exists) return null;
  await FileSystem.deleteAsync(to, { idempotent: true }).catch(() => {});
  await FileSystem.moveAsync({ from, to });
  return to;
}
