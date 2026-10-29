/** This suite uses real workers instead of the ordinary functional-test worker bypass. */
describe('Stale service worker startup recovery', () => {
  let recoveryClient: Window | null = null;
  let recoveryFrame: HTMLIFrameElement | undefined;

  afterEach(() => {
    recoveryFrame?.remove();
    recoveryFrame = undefined;
    recoveryClient = null;
    cy.task('startupRecovery:stop');
  });

  it('recovers a stalled module download without reloading another client or losing its unsaved input', () => {
    let editorWindow: Window;
    let editorController: ServiceWorker | null;
    cy.task<string>('startupRecovery:start').then((origin) => {
      cy.visit(`${origin}/editor`);
      cy.get('input').type('An unsaved character note');
      cy.window().then(async (win) => {
        win.localStorage.setItem('fixture-draft', 'Retained draft');
        win.localStorage.setItem('fixture-auth', 'Retained session');
        await win.navigator.serviceWorker.register('/sw.js');
        await win.navigator.serviceWorker.ready;
        if (!win.navigator.serviceWorker.controller) {
          await new Promise<void>((resolve) =>
            win.navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true })
          );
        }
        editorWindow = win;
        editorController = win.navigator.serviceWorker.controller;
        // A second same-origin document is a distinct real service-worker client.
        recoveryFrame = win.document.createElement('iframe');
        recoveryFrame.src = `${origin}/stuck`;
        win.document.body.appendChild(recoveryFrame);
        recoveryClient = recoveryFrame.contentWindow;
        expect(recoveryClient, 'a second real browser client').not.to.eq(null);
      });
      cy.wrap(null, { timeout: 35000 }).should(() => {
        expect(
          recoveryClient?.document.getElementById('root')?.textContent,
          'the blocked client recovered through the network'
        ).to.eq('Recovered app');
        expect(editorWindow.navigator.serviceWorker.controller, 'the editor keeps its original controller').to.eq(
          editorController
        );
        expect(editorWindow.localStorage.getItem('fixture-draft')).to.eq('Retained draft');
        expect(editorWindow.localStorage.getItem('fixture-auth')).to.eq('Retained session');
      });
      cy.get('input').should('have.value', 'An unsaved character note');
      cy.task('startupRecovery:networkLoads').should('eq', 1);
      cy.screenshot('startup-recovered-with-unsaved-editor-intact');
    });
  });
});
