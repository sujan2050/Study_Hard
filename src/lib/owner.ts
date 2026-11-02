const STORAGE_KEY = 'quiet_study_anonymous_owner_id';

/**
 * Returns or creates a persistent anonymous owner ID in localStorage.
 * Scoped to this browser so each person's library is completely private.
 */
export function getOrCreateOwnerId(): string {
  if (typeof window === 'undefined') return 'server_render_id';

  let ownerId = localStorage.getItem(STORAGE_KEY);
  if (!ownerId) {
    const randomHex = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
    ownerId = `user_${Date.now().toString(36)}_${randomHex}`;
    localStorage.setItem(STORAGE_KEY, ownerId);
  }
  return ownerId;
}

export function resetOwnerId(): string {
  if (typeof window === 'undefined') return '';
  localStorage.removeItem(STORAGE_KEY);
  return getOrCreateOwnerId();
}
