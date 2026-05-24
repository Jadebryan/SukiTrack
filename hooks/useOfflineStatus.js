import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

export function useOfflineStatus() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const sub = NetInfo.addEventListener((state) => {
      const offline =
        state.isConnected === false || state.isInternetReachable === false;
      setIsOffline(offline);
    });
    return () => sub();
  }, []);

  return isOffline;
}
