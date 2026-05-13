import * as Crypto from 'expo-crypto';

/** 24 hex chars — valid Mongo ObjectId shape for local-only rows until sync. */
export async function generateLocalObjectId() {
  const bytes = await Crypto.getRandomBytesAsync(12);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
