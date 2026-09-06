import { Button, Group, Text } from '@mantine/core';
import { hideNotification, showNotification } from '@mantine/notifications';
import { useEffect } from 'react';
import { reportClientFailure } from '@utils/client-errors';

/** Register updates without forcing other tabs to reload and lose their current input. */
export function AppUpdateNotice(): null {
  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
    let disposed = false;
    let registration: ServiceWorkerRegistration | undefined;
    let requestedReload = false;
    let hadController = !!navigator.serviceWorker.controller;
    let lastCheck = 0;
    const workers = new Set<ServiceWorker>();
    const noticeId = 'app-update-available';

    const reload = async () => {
      // Commit focused controls, let React publish their state, then synchronously flush
      // character drafts. Other forms remain the user's reason to choose Later.
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      window.dispatchEvent(new Event('wg:before-update'));
      requestedReload = true;
      if (registration?.waiting) registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      else window.location.reload();
    };
    const showUpdate = () => {
      if (disposed) return;
      showNotification({
        id: noticeId,
        title: 'An app update is ready',
        autoClose: false,
        message: (
          <>
            <Text size='sm'>Finish editing before reloading.</Text>
            <Group gap='xs' mt='xs'>
              <Button size='xs' onClick={() => void reload()}>
                Reload app
              </Button>
              <Button size='xs' variant='subtle' onClick={() => hideNotification(noticeId)}>
                Later
              </Button>
            </Group>
          </>
        ),
      });
    };
    const stateChanged = () => {
      if (registration?.waiting && navigator.serviceWorker.controller) showUpdate();
    };
    const updateFound = () => {
      const worker = registration?.installing;
      if (worker) {
        workers.add(worker);
        worker.addEventListener('statechange', stateChanged);
      }
    };
    const controlled = () => {
      if (!hadController) {
        hadController = true;
        return;
      }
      if (requestedReload) window.location.reload();
      else showUpdate();
    };
    const check = () => {
      if (registration?.waiting) showUpdate();
      if (!registration || !navigator.onLine || Date.now() - lastCheck < 60_000) return;
      lastCheck = Date.now();
      void registration.update().catch(() => reportClientFailure('update_failed'));
    };
    navigator.serviceWorker.addEventListener('controllerchange', controlled);
    window.addEventListener('focus', check);
    void navigator.serviceWorker
      .register('/sw.js', { updateViaCache: 'none' })
      .then((value) => {
        if (disposed) return;
        registration = value;
        registration.addEventListener('updatefound', updateFound);
        updateFound();
        stateChanged();
      })
      .catch(() => reportClientFailure('update_failed'));
    return () => {
      disposed = true;
      navigator.serviceWorker.removeEventListener('controllerchange', controlled);
      registration?.removeEventListener('updatefound', updateFound);
      workers.forEach((worker) => worker.removeEventListener('statechange', stateChanged));
      window.removeEventListener('focus', check);
    };
  }, []);
  return null;
}
