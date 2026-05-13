/**
 * Post-session route when auth + PIN state are known (same rules as `app/index.js`).
 * @param {{ user: { token?: string, ownerId?: string } | null | undefined, hasPin: boolean, pinUnlocked: boolean }}
 * @returns {string | null} Router href, or null if there is no signed-in session.
 */
export function getSessionResumeHref({ user, hasPin, pinUnlocked }) {
  if (!user?.token || !user?.ownerId) return null;
  if (!hasPin) return '/setup-pin';
  if (!pinUnlocked) return '/login';
  return '/(tabs)';
}
