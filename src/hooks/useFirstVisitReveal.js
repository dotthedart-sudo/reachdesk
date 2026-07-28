import { useEffect, useState } from 'react';

const REVEAL_KEY = 'rd_reveal';
const REVEAL_CLEANUP_MS = 700;

/**
 * One-time entrance animation after signup/setup (rd_reveal in sessionStorage).
 * Defers flag cleanup so React Strict Mode remounts in dev still see the flag.
 */
export function useFirstVisitReveal() {
  const [reveal] = useState(() => sessionStorage.getItem(REVEAL_KEY) === '1');

  useEffect(() => {
    if (!reveal) return undefined;
    const timer = setTimeout(() => {
      sessionStorage.removeItem(REVEAL_KEY);
    }, REVEAL_CLEANUP_MS);
    return () => clearTimeout(timer);
  }, [reveal]);

  return {
    reveal,
    rootClass: reveal ? ' rd-dashboard-reveal' : '',
    blockClass: reveal ? ' rd-reveal-block' : '',
    blockProp: reveal ? 'rd-reveal-block' : undefined,
  };
}
