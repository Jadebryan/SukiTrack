import { getDefaultHeaderHeight } from '@react-navigation/elements';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Top-left overlay slot (same band as AppToastBanner). */
export function useFloatingBannerLayout() {
  const insets = useSafeAreaInsets();
  const layout = useWindowDimensions();
  const headerTotal = getDefaultHeaderHeight(
    { width: layout.width, height: layout.height },
    false,
    insets.top
  );
  const padLeft = Math.max(insets.left, 12);
  const maxWidth = Math.min(layout.width - padLeft - 12, 420);

  return {
    position: 'absolute',
    top: headerTotal + 6,
    left: padLeft,
    right: 12,
    maxWidth,
    alignSelf: 'flex-start',
    zIndex: 9998,
    elevation: 9998,
  };
}
