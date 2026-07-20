import posthog from 'posthog-js';

const isLocalhost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

export function initPostHog() {
  if (
    import.meta.env.VITE_APP_MODE === 'app' &&
    !isLocalhost &&
    import.meta.env.VITE_POSTHOG_KEY
  ) {
    posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
      api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com',
      person_profiles: 'identified_only',
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: '[data-ph-mask]',
      },
      autocapture: true,
    });
  }
}

export function identifyUser(userId, userDetails = {}) {
  if (
    import.meta.env.VITE_APP_MODE === 'app' &&
    !isLocalhost &&
    userId &&
    posthog.__loaded
  ) {
    posthog.identify(userId, userDetails);
  }
}

export function resetPostHog() {
  if (
    import.meta.env.VITE_APP_MODE === 'app' &&
    !isLocalhost &&
    posthog.__loaded
  ) {
    posthog.reset();
  }
}

export { posthog };
