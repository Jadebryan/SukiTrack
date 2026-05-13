import NetInfo from '@react-native-community/netinfo';

/**
 * True when the device has a network connection (Wi‑Fi / cellular / etc.).
 * We intentionally do NOT require `isInternetReachable === true`: on many LAN setups
 * (e.g. shop Wi‑Fi + your PC as API) Android/iOS still report reachability as false or
 * unknown, which would wrongly force “offline only” and block sync.
 */
export async function isOnline() {
  const s = await NetInfo.fetch();
  return s.isConnected === true;
}
