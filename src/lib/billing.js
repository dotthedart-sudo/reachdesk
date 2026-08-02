/** True for real Paddle Billing subscription IDs (not local test placeholders). */
export function isRealPaddleSubscriptionId(id) {
  if (!id || typeof id !== 'string') return false;
  if (id.startsWith('sub_test')) return false;
  return /^sub_[0-9a-z]+$/i.test(id);
}

export function hasCancellableSubscription(profile) {
  if (!profile) return false;
  const plan = (profile.plan || '').toLowerCase();
  if (plan === 'trial' || plan === 'lifetime' || plan === 'enterprise') return false;
  return profile.plan_status === 'active' && isRealPaddleSubscriptionId(profile.paddle_subscription_id);
}

export function canResumeSubscription(profile) {
  if (!profile) return false;
  return profile.plan_status === 'cancelling' && isRealPaddleSubscriptionId(profile.paddle_subscription_id);
}

/** Safe trial end date — rejects null, Invalid Date, and Unix-epoch garbage (e.g. 12/31/1969). */
export function isValidTrialEndDate(value) {
  if (!value) return false;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return false;
  // Anything before year 2000 is almost certainly a bad default / epoch offset
  if (d.getUTCFullYear() < 2000) return false;
  return true;
}

export function formatPlanCancelsAt(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}
