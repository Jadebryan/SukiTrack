import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Tracks keyboard height in screen coordinates. Set active=false to unsubscribe.
 */
export function useKeyboardHeight(active = true) {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    if (!active) {
      setHeight(0);
      return;
    }
    const showEvt =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = (e) => setHeight(e?.endCoordinates?.height ?? 0);
    const onHide = () => setHeight(0);
    const s1 = Keyboard.addListener(showEvt, onShow);
    const s2 = Keyboard.addListener(hideEvt, onHide);
    return () => {
      s1.remove();
      s2.remove();
    };
  }, [active]);
  return height;
}
