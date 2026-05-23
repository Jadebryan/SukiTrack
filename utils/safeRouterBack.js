/**
 * Pop the navigation stack when possible; otherwise replace with a safe fallback.
 * Avoids dev warning: "The action 'GO_BACK' was not handled by any navigator."
 *
 * @param {import('expo-router').Router} router
 * @param {string} [fallbackHref='/(tabs)']
 */
export function safeRouterBack(router, fallbackHref = '/(tabs)') {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  if (fallbackHref) {
    router.replace(fallbackHref);
  }
}
