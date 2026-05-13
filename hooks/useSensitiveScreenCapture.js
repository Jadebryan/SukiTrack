import { useEffect } from 'react';
import * as ScreenCapture from 'expo-screen-capture';

/**
 * Blocks screenshots and screen recording while `active` (Android FLAG_SECURE-style on supported OS).
 * No-ops on web / unsupported environments.
 */
export function useSensitiveScreenCapture(active) {
  useEffect(() => {
    if (!active) return undefined;
    void ScreenCapture.preventScreenCaptureAsync().catch(() => {});
    return () => {
      void ScreenCapture.allowScreenCaptureAsync().catch(() => {});
    };
  }, [active]);
}
