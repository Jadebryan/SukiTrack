import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

export function useOfflineStatus() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const sub = NetInfo.addEventListener((state) => {
      setIsOffline(state.isConnected === false);
    });
    return () => sub();
  }, []);

  return isOffline;
}
