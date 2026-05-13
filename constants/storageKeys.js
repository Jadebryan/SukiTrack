export const STORAGE_KEYS = {
  PIN_HASH: 'utang_ph_pin_hash',
  PIN_SALT: 'utang_ph_pin_salt',
  DARK_MODE: 'utang_ph_dark_mode',
  /** 'en' | 'tl' */
  LANGUAGE: 'utang_ph_language',
  BACKUP_REMINDER_DISMISSED_AT: 'utang_ph_backup_reminder_at',
  /** ISO timestamp string of last successful JSON export on this device */
  LAST_EXPORT_AT: 'utang_ph_last_export_at',
  OWNER_ID: 'utang_ph_owner_id',
  AUTH_TOKEN: 'utang_ph_auth_token',
  /** Refresh token fallback when SecureStore is unavailable. */
  REFRESH_TOKEN: 'utang_ph_refresh_token',
  /** Failed PIN attempts (cleared on success or lock). */
  PIN_FAIL_COUNT: 'utang_ph_pin_fail_count',
  /** Epoch ms until PIN entry is allowed again. */
  PIN_LOCK_UNTIL: 'utang_ph_pin_lock_until',
  USER_EMAIL: 'utang_ph_user_email',
  /** JSON `{ [ownerId]: string[] }` — custom inventory category labels with no products yet. */
  INVENTORY_EXTRA_CATEGORIES: 'utang_ph_inv_extra_categories',
  /** JSON `{ [ownerId]: { [normalizedLabel]: { icon, bg, rotate } } }` — smart / network-assisted sticker picks. */
  INVENTORY_CATEGORY_STICKER_OVERRIDES: 'utang_ph_inv_cat_sticker_overrides',
};
