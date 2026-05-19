import { useEffect, useState } from 'react';
import { Dimensions, Keyboard, Platform } from 'react-native';

function keyboardHeightFromEvent(e) {
  const ec = e?.endCoordinates;
  if (!ec) return 0;
  const h1 = typeof ec.height === 'number' ? ec.height : 0;
  const winH = Dimensions.get('window').height;
  const screenY = ec.screenY;
  const h2 =
    typeof screenY === 'number' && winH > 0
      ? Math.max(0, winH - screenY)
      : 0;
  // Some Android OEMs under-report `height`; `winH - screenY` tends to match the occluded band.
  return Math.max(h1, h2);
}

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
    const onShow = (e) => setHeight(keyboardHeightFromEvent(e));
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
