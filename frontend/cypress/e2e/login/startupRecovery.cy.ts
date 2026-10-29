/** Use a real top-level browser client: Cypress-managed frames can have an inactive document in Chromium. */
describe('Stale service worker startup recovery', () => {
  type RecoveryState = { networkLoads: number; recovered: boolean; stalled: boolean };
  let recoveryTarget: string | undefined;

  afterEach(() => {
    cy.then(() =>
      recoveryTarget
        ? Cypress.automation('remote:debugger:protocol', {
            command: 'Target.closeTarget',
            params: { targetId: recoveryTarget },
          })
        : undefined
    );
    cy.then(() => {
      recoveryTarget = undefined;
    });
    cy.task('startupRecovery:stop');
    cy.clearAllLocalStorage();
  });

  /** Poll the fixture's acknowledgement from the recovered document, not a stale Window reference. */
  const waitForRecovery = (remaining = 140): Cypress.Chainable<RecoveryState> =>
    cy.task<RecoveryState>('startupRecovery:state').then<RecoveryState>((state) => {
      if (state.recovered) {
        expect(state.stalled, 'the worker served the broken app shell first').to.eq(true);
        expect(state.networkLoads).to.eq(1);
        return cy.wrap(state);
      }
      expect(remaining, 'the blocked top-level client recovers').to.be.greaterThan(0);
      return cy.wait(250, { log: false }).then<RecoveryState>(() => waitForRecovery(remaining - 1));
    });

  // Electron has no Target.createTarget support; CI runs this in Chrome.
  it(
    'recovers a stalled module download without reloading another client or losing its unsaved input',
    { browser: { family: 'chromium', name: '!electron' } },
    () => {
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
        });
        cy.then(() =>
          Cypress.automation('remote:debugger:protocol', {
            command: 'Target.createTarget',
            params: { url: `${origin}/stuck`, background: true },
          })
        ).then((target: { targetId: string }) => {
          recoveryTarget = target.targetId;
        });
        waitForRecovery();
        cy.then(() => {
          expect(editorWindow.navigator.serviceWorker.controller).to.eq(editorController);
          expect(editorWindow.localStorage.getItem('fixture-draft')).to.eq('Retained draft');
          expect(editorWindow.localStorage.getItem('fixture-auth')).to.eq('Retained session');
        });
        cy.get('input').should('have.value', 'An unsaved character note');
        cy.screenshot('startup-recovered-with-unsaved-editor-intact');
      });
    }
  );
});
