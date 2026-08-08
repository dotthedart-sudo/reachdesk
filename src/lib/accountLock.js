/** Admin moderation lock — custom denial message, not billing/trial expiry. */
export function isModerationLock(profile) {
  if (!profile?.account_locked) return false;
  return typeof profile.lock_reason === 'string' && profile.lock_reason.trim().length > 0;
}

/** Billing/trial expiry lock — upgrade flow + UpgradeLockModal. */
export function isBillingLock(profile) {
  return !!profile?.account_locked && !isModerationLock(profile);
}

export function getModerationLockMessage(profile) {
  if (!isModerationLock(profile)) return null;
  return profile.lock_reason.trim();
}

/** Generic fallback when account_locked without lock_reason (should be rare). */
export const GENERIC_ACCOUNT_LOCK_MESSAGE =
  'Your workspace access has been restricted. Please contact support@reachdeskcrm.com if you believe this is a mistake.';
