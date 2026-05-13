import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/constants/storageKeys';

const MAX_PIN_FAILS = 8;
const PIN_LOCK_MS = 15 * 60 * 1000;

function randomSalt() {
  return Crypto.randomUUID();
}

export async function hasPin() {
  const h = await AsyncStorage.getItem(STORAGE_KEYS.PIN_HASH);
  return Boolean(h);
}

export async function setPin(pin) {
  const salt = randomSalt();
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${salt}:${pin}`
  );
  await AsyncStorage.multiSet([
    [STORAGE_KEYS.PIN_SALT, salt],
    [STORAGE_KEYS.PIN_HASH, hash],
  ]);
  await AsyncStorage.multiRemove([
    STORAGE_KEYS.PIN_FAIL_COUNT,
    STORAGE_KEYS.PIN_LOCK_UNTIL,
  ]);
}

export async function verifyPin(pin) {
  const [[, salt], [, hash]] = await AsyncStorage.multiGet([
    STORAGE_KEYS.PIN_SALT,
    STORAGE_KEYS.PIN_HASH,
  ]);
  if (!salt || !hash) return false;
  const trial = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${salt}:${pin}`
  );
  return trial === hash;
}

/** Milliseconds remaining before PIN attempts are allowed again (0 if not locked). */
export async function getPinLockoutRemainingMs() {
  const until = await AsyncStorage.getItem(STORAGE_KEYS.PIN_LOCK_UNTIL);
  const t = until ? Number(until) : 0;
  if (!Number.isFinite(t) || t <= Date.now()) return 0;
  return t - Date.now();
}

/**
 * Verify PIN with local lockout after repeated failures.
 * @returns {{ ok: boolean, locked: boolean, remainingMs?: number }}
 */
export async function verifyPinWithLockout(pin) {
  const remaining = await getPinLockoutRemainingMs();
  if (remaining > 0) {
    return { ok: false, locked: true, remainingMs: remaining };
  }
  const ok = await verifyPin(pin);
  if (ok) {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.PIN_FAIL_COUNT,
      STORAGE_KEYS.PIN_LOCK_UNTIL,
    ]);
    return { ok: true, locked: false };
  }
  const prev = Number(await AsyncStorage.getItem(STORAGE_KEYS.PIN_FAIL_COUNT)) || 0;
  const n = prev + 1;
  await AsyncStorage.setItem(STORAGE_KEYS.PIN_FAIL_COUNT, String(n));
  if (n >= MAX_PIN_FAILS) {
    await AsyncStorage.setItem(
      STORAGE_KEYS.PIN_LOCK_UNTIL,
      String(Date.now() + PIN_LOCK_MS)
    );
    await AsyncStorage.removeItem(STORAGE_KEYS.PIN_FAIL_COUNT);
    return { ok: false, locked: true, remainingMs: PIN_LOCK_MS };
  }
  return { ok: false, locked: false };
}

/** After email/password verify — user sets a new PIN */
export async function clearPin() {
  await AsyncStorage.multiRemove([
    STORAGE_KEYS.PIN_SALT,
    STORAGE_KEYS.PIN_HASH,
    STORAGE_KEYS.PIN_FAIL_COUNT,
    STORAGE_KEYS.PIN_LOCK_UNTIL,
  ]);
}
