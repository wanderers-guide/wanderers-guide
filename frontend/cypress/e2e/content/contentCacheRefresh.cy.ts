type CacheFixtureRow = { table: string; row: { id: number; name: string; [key: string]: any } };



describe('Published content cache refresh', () => {
  let fixtures: CacheFixtureRow[];
  const cacheKey = 'content-store:anonymous';
  const unrelatedKey = 'unrelated-content-cache-fixture';
  const oldToken = '2026-10-12T12:00:00Z';
  const newToken = '2026-10-12T13:00:00Z';
  const readCache = (key: string): Cypress.Chainable<{ snapshot: any }> =>
    cy.window().then(
      (win) =>
        new Cypress.Promise<{ snapshot: any }>((resolve, reject) => {
          const open = win.indexedDB.open('wg-content-cache', 1);
          open.onerror = () => reject(open.error);
          open.onsuccess = () => {
            const db = open.result;
            const tx = db.transaction('kv', 'readonly');
            const read = tx.objectStore('kv').get(key);
            read.onsuccess = () => resolve({ snapshot: read.result });
            read.onerror = () => reject(read.error);
            tx.oncomplete = () => db.close();
          };
        })
    );
  const waitForCache = (present: boolean, remaining = 40): Cypress.Chainable<{ snapshot: any }> =>
    readCache(cacheKey).then<{ snapshot: any }>(({ snapshot }) => {
      if (Boolean(snapshot?.idStore?.get('ability-block')?.has(19873)) === present)
        return cy.wrap({ snapshot }, { log: false });
      expect(remaining, `content snapshot ${present ? 'persisted' : 'retired'}`).to.be.greaterThan(0);
      return cy.wait(250, { log: false }).then(() => waitForCache(present, remaining - 1));
    });

  before(() => {
    cy.task<any>('contentFixture:cache', null, { log: false, timeout: 60000 }).then((rows) => {
      fixtures = rows;
    });
  });

  for (const width of [390, 1280]) {
    it(`retires a late-confirmed stale snapshot and renders the published description on reload at ${width}px`, () => {
      let published = false;
      let freshReads = 0;
      cy.viewport(width, 844);
      cy.intercept('**/auth/v1/**', () => {
        throw new Error('Content cache verification must not authenticate or write user data');
      });
      cy.intercept('POST', '**/functions/v1/*', (request) => {
        const endpoint = new URL(request.url).pathname.split('/').pop()!;
        const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
        if (endpoint === 'get-content-versions') {
          if (published) request.alias = 'lateFreshness';
          request.reply({
            delay: published ? 5000 : 0,
            body: { status: 'success', data: [{ id: 3, updated_at: published ? newToken : oldToken }] },
          });
          return;
        }
        expect(endpoint.startsWith('find-'), 'only read-only fixture calls').to.eq(true);
        const table = endpoint.slice(5).replaceAll('-', '_');
        let rows = fixtures.filter((fixture) => fixture.table === table).map(({ row }) => ({ ...row }));
        if (body.id !== undefined) {
          const ids = Array.isArray(body.id) ? body.id : [body.id];
          rows = rows.filter((row) => ids.includes(row.id));
        }
        if (body.name) rows = rows.filter((row) => row.name.toLowerCase() === body.name.toLowerCase());
        if (Array.isArray(body.content_sources))
          rows = rows.filter((row) => body.content_sources.includes(row.content_source_id));
        for (const row of rows) {
          if (table === 'content_source') row.updated_at = published ? newToken : oldToken;
          if (table === 'ability_block' && published) {
            row.description = 'Published *corrected description* after the content update.';
            freshReads++;
          }
        }
        request.reply({ body: { status: 'success', data: rows } });
      });

      cy.visit('/?open=link_feat_19873');
      cy.contains('.mantine-Drawer-content', 'Cached description before publication.', { timeout: 30000 }).should(
        'exist'
      );
      cy.window().then((win) => win.dispatchEvent(new Event('pagehide')));
      waitForCache(true);
      cy.window().then(
        (win) =>
          new Cypress.Promise<void>((resolve, reject) => {
            const open = win.indexedDB.open('wg-content-cache', 1);
            open.onerror = () => reject(open.error);
            open.onsuccess = () => {
              const db = open.result;
              const tx = db.transaction('kv', 'readwrite');
              tx.objectStore('kv').put({ input: 'Retain unrelated storage' }, unrelatedKey);
              tx.oncomplete = () => {
                db.close();
                resolve();
              };
              tx.onerror = () => reject(tx.error);
            };
          })
      );
      cy.then(() => {
        published = true;
      });
      cy.reload();
      cy.contains('.mantine-Drawer-content', 'Cached description before publication.', { timeout: 30000 }).should(
        'exist'
      );
      cy.wait('@lateFreshness', { responseTimeout: 30000 });
      waitForCache(false);
      readCache(cacheKey).should('deep.equal', { snapshot: undefined });
      cy.contains('.mantine-Drawer-content', 'Cached description before publication.').should('exist');
      readCache(unrelatedKey).should('deep.equal', { snapshot: { input: 'Retain unrelated storage' } });
      cy.reload();
      cy.contains('.mantine-Drawer-content', 'Published', { timeout: 30000 }).should('exist');
      cy.contains('.mantine-Drawer-content', 'corrected description')
        .find('em')
        .should('have.text', 'corrected description');
      cy.contains('.mantine-Drawer-content', 'Cached description before publication.').should('not.exist');
      cy.then(() => expect(freshReads, 'reload fetched the published row').to.be.greaterThan(0));
      readCache(unrelatedKey).should('deep.equal', { snapshot: { input: 'Retain unrelated storage' } });
      cy.document().should((document) =>
        expect(document.documentElement.scrollWidth).to.be.at.most(document.documentElement.clientWidth)
      );
      cy.screenshot(`published-content-cache-refresh-${width}`);
    });
  }
});
