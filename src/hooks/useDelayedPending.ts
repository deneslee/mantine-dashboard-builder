import { useEffect, useState } from 'react';

/**
 * True only after `pending` has lasted `delay` ms, then stays true for at least `minVisible` ms.
 * Stops sub-300ms loads from flashing a skeleton, and stops skeletons from flickering off.
 */
export function useDelayedPending(pending: boolean, delay = 300, minVisible = 400): boolean {
  const [shown, setShown] = useState(false);
  const [shownAt, setShownAt] = useState(0);

  useEffect(() => {
    if (pending && !shown) {
      const t = window.setTimeout(() => {
        setShown(true);
        setShownAt(Date.now());
      }, delay);
      return () => window.clearTimeout(t);
    }
    if (!pending && shown) {
      const left = Math.max(0, minVisible - (Date.now() - shownAt));
      const t = window.setTimeout(() => setShown(false), left);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [pending, shown, shownAt, delay, minVisible]);

  return shown;
}
