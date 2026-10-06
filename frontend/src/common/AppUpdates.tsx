import { useEffect } from 'react';
import { reportClientFailure } from '@utils/client-errors';

/** Queue app updates quietly; the browser activates them after existing tabs close. */
export function AppUpdates(): null {
  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
    let active = true;
    let registration: ServiceWorkerRegistration | undefined;
    let lastCheck = 0;
    const check = () => {
      if (!registration || !navigator.onLine || Date.now() - lastCheck < 60000) return;
      lastCheck = Date.now();
      void registration.update().catch(() => reportClientFailure('update_failed'));
    };
    window.addEventListener('focus', check);
    void navigator.serviceWorker
      .register('/sw.js', { updateViaCache: 'none' })
      .then((value) => {
        if (active) registration = value;
      })
      .catch(() => reportClientFailure('update_failed'));
    return () => {
      active = false;
      window.removeEventListener('focus', check);
    };
  }, []);
  return null;
}
