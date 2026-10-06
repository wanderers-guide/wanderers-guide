import { useEffect, useRef } from 'react';

/** Retry a failed read quietly while its view is active, without overlapping attempts. */
export function useQuietRetry(enabled: boolean, retry: () => unknown): void {
  const retryRef = useRef(retry);
  retryRef.current = retry;
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    let pending = false;
    let timer: ReturnType<typeof setTimeout>;
    const run = async () => {
      if (!active || pending || navigator.onLine === false || document.visibilityState === 'hidden') return;
      clearTimeout(timer);
      pending = true;
      try {
        await retryRef.current();
      } catch (error: unknown) {
        console.warn('Background read retry failed:', error);
      } finally {
        pending = false;
        if (active) timer = setTimeout(run, 30000);
      }
    };
    timer = setTimeout(run, 30000);
    window.addEventListener('online', run);
    window.addEventListener('focus', run);
    document.addEventListener('visibilitychange', run);
    return () => {
      active = false;
      clearTimeout(timer);
      window.removeEventListener('online', run);
      window.removeEventListener('focus', run);
      document.removeEventListener('visibilitychange', run);
    };
  }, [enabled]);
}
