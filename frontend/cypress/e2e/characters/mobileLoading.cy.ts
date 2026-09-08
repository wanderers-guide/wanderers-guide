/** Real content/cache startup under whole-browser latency, bandwidth and CPU constraints. */
type LoadingFixture = { key: string; gm: { email: string; password: string } };

describe('Mobile content loading', () => {
  let fixture: LoadingFixture | undefined;
  const protocol = (command: string, params: Record<string, unknown>) =>
    cy.then(() => Cypress.automation('remote:debugger:protocol', { command, params }));

  afterEach(() => {
    protocol('Emulation.setCPUThrottlingRate', { rate: 1 });
    protocol('Network.emulateNetworkConditions', {
      offline: false,
      latency: 0,
      downloadThroughput: -1,
      uploadThroughput: -1,
    });
    if (fixture) cy.task('campaignFixture:cleanup', fixture.key, { log: false });
  });

  it('loads with an empty account cache, then reopens from cache while freshness and catalog requests stall', () => {
    cy.task<LoadingFixture>('campaignFixture:create', null, { log: false }).then((created) => {
      fixture = created;
      cy.viewport(390, 844);
      protocol('Network.enable', {});
      protocol('Network.clearBrowserCache', {});
      protocol('Network.emulateNetworkConditions', {
        offline: false,
        latency: 150,
        downloadThroughput: 192 * 1024,
        uploadThroughput: 96 * 1024,
      });
      protocol('Emulation.setCPUThrottlingRate', { rate: 4 });
      cy.intercept('GET', '**/assets/game-icons-*.js').as('gameIcons');
      cy.intercept('POST', '**/auth/v1/token*').as('signIn');
      cy.login(created.gm.email, created.gm.password);
      cy.wait('@signIn').then(({ response }) => {
        const token = response?.body.access_token;
        const actor = response?.body.user.id;
        const call = (endpoint: string, body: Record<string, unknown>) =>
          cy
            .request({
              method: 'POST',
              url: `${Cypress.env('functions_url')}/${endpoint}`,
              headers: { Authorization: `Bearer ${token}` },
              body,
              log: false,
            })
            .then(({ body }) => {
              expect(body.status).to.eq('success');
              return body.data;
            });
        call('find-class', { id: 26 })
          .then((playerClass) =>
            call('create-character', {
              name: 'Mobile Mage',
              level: 1,
              hp_current: 6,
              details: { class: playerClass, conditions: [] },
              inventory: { items: [] },
              content_sources: { enabled: [1, 3] },
              meta_data: { reset_hp: false },
            })
          )
          .then((character) => {
            let stallCatalog = false;
            let catalogRequests = 0;
            cy.intercept('POST', '**/functions/v1/find-*', (req) => {
              if (req.url.endsWith('/find-character')) return;
              catalogRequests += 1;
              if (stallCatalog)
                req.reply({ statusCode: 503, body: { status: 'error', message: 'Synthetic content outage' } });
            });
            cy.intercept('POST', '**/functions/v1/get-content-versions', (req) => {
              if (stallCatalog) {
                req.alias = 'slowFreshness';
                req.reply({
                  delay: 10000,
                  statusCode: 503,
                  body: { status: 'error', message: 'Synthetic freshness delay' },
                });
              }
            });
            cy.visit(`/sheet/${character.id}`);
            cy.contains('Mobile Mage', { timeout: 60000 }).should('be.visible');
            cy.contains('Hit Points', { timeout: 60000 }).should('be.visible');
            cy.get('[data-testid="character-save-status"]').should('not.exist');
            cy.contains('Changes not saved').should('not.exist');
            cy.get('@gameIcons.all').should('have.length', 0);
            cy.screenshot('mobile-cold-content-loaded');
            // Wait for the actual IndexedDB transaction, not a guessed debounce sleep.
            cy.window().then((win) => win.dispatchEvent(new Event('pagehide')));
            const cached = (): Cypress.Chainable<unknown> =>
              cy.window().then(
                (win) =>
                  new Cypress.Promise((resolve, reject) => {
                    const open = win.indexedDB.open('wg-content-cache', 1);
                    open.onerror = () => reject(open.error);
                    open.onsuccess = () => {
                      const db = open.result;
                      const tx = db.transaction('kv', 'readonly');
                      const read = tx.objectStore('kv').get(`content-store:${actor}`);
                      read.onsuccess = () => resolve(read.result);
                      read.onerror = () => reject(read.error);
                      tx.oncomplete = () => db.close();
                    };
                  })
              );
            const waitForCache = (remaining = 40): Cypress.Chainable<unknown> =>
              cached().then((snapshot: any) => {
                if (snapshot?.contentStore?.size) return;
                expect(remaining, 'content snapshot persisted').to.be.greaterThan(0);
                return cy.wait(250, { log: false }).then(() => waitForCache(remaining - 1));
              });
            waitForCache();
            cy.then(() => {
              expect(catalogRequests).to.be.greaterThan(0);
              stallCatalog = true;
              catalogRequests = 0;
            });
            cy.reload();
            cy.contains('Hit Points', { timeout: 20000 }).should('be.visible');
            cy.contains('Mobile Mage').should('be.visible');
            cy.then(() =>
              expect(catalogRequests, 'no replacement catalog downloads on a slow freshness check').to.eq(0)
            );
            cy.get('@slowFreshness.all').should('have.length.at.least', 1);
            cy.contains("Couldn't load game content").should('not.exist');
            cy.contains('Changes not saved').should('not.exist');
            cy.screenshot('mobile-cached-content-loaded');
          });
      });
    });
  });
});
