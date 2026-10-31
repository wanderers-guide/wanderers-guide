/**
 * Run inline before module downloads, so a broken cached bundle cannot disable recovery.
 * This is deliberately independent of React and must never import application code.
 */
((): void => {
  const STARTUP_TIMEOUT_MS = 20000;
  const OPERATION_TIMEOUT_MS = 4000;
  const RETRY_COOLDOWN_MS = 10 * 60 * 1000;
  const RETRY_KEY = 'wg-startup-recovery-at';
  let started = false;

  /** Any running app or accepted input permanently disables recovery in this document. */
  const stop = (): void => {
    started = true;
    window.clearTimeout(timer);
    window.removeEventListener('wg:app-started', stop);
    document.removeEventListener('input', stop, true);
    document.removeEventListener('change', stop, true);
    document.removeEventListener('submit', stop, true);
    window.removeEventListener('online', recover);
  };

  /** A blank startup is safe to replace; a mounted editor is never assumed to be saved. */
  const canRecover = (): boolean =>
    !started && navigator.onLine && document.getElementById('root')?.childNodes.length === 0;

  /** Browser worker APIs can stall too. A timeout must leave the existing page alone. */
  const bounded = async <T>(work: Promise<T>): Promise<T> => {
    let deadline: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        work,
        new Promise<never>((_, reject) => {
          deadline = setTimeout(() => reject(new Error('Startup recovery timed out.')), OPERATION_TIMEOUT_MS);
        }),
      ]);
    } finally {
      clearTimeout(deadline);
    }
  };

  let recovering = false;
  /** Retire only this app's stale registration, without activating workers or clearing user data. */
  async function recover(): Promise<void> {
    if (recovering || !canRecover() || !('serviceWorker' in navigator)) return;
    const controller = navigator.serviceWorker.controller;
    if (!controller || new URL(controller.scriptURL).pathname !== '/sw.js') return;
    recovering = true;
    try {
      const previous = Number(sessionStorage.getItem(RETRY_KEY));
      if (previous && Date.now() - previous < RETRY_COOLDOWN_MS) return;
      const registration = await bounded(navigator.serviceWorker.getRegistration());
      if (
        !registration ||
        registration.scope !== `${location.origin}/` ||
        registration.active?.scriptURL !== controller.scriptURL ||
        !canRecover()
      )
        return;

      // An unrecognized query misses Workbox's precache key. Fetch (not navigation)
      // also avoids its offline navigation fallback, proving the network has an app shell.
      const probe = new URL('/index.html', location.origin);
      probe.searchParams.set('wg-startup-probe', String(Date.now()));
      const abort = new AbortController();
      try {
        const response = await bounded(fetch(probe, { cache: 'no-store', signal: abort.signal }));
        if (!response.ok || !response.headers.get('content-type')?.includes('text/html')) return;
        const html = await bounded(response.text());
        if (!html.includes('id="root"') || !html.includes('type="module"')) return;
      } finally {
        abort.abort();
      }
      if (!canRecover() || navigator.serviceWorker.controller !== controller) return;
      // Fail closed if session storage is unavailable. The marker survives the reload
      // so an unrelated network/browser fault cannot become an automatic reload loop.
      sessionStorage.setItem(RETRY_KEY, String(Date.now()));
      const removed = await bounded(registration.unregister());
      if (removed && canRecover()) {
        stop();
        location.reload();
      }
    } catch (error: unknown) {
      console.warn('Could not recover app startup:', error);
    } finally {
      recovering = false;
    }
  }

  const timer = window.setTimeout(() => {
    void recover();
    // A user opening the app offline gets another chance when connectivity returns.
    if (!started) window.addEventListener('online', recover);
  }, STARTUP_TIMEOUT_MS);
  window.addEventListener('wg:app-started', stop, { once: true });
  document.addEventListener('input', stop, true);
  document.addEventListener('change', stop, true);
  document.addEventListener('submit', stop, true);
})();
