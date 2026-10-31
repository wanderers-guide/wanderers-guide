type DownloadFixture = { key: string; gm: { email: string; password: string } };

describe('Slow content downloads', () => {
  let fixture: DownloadFixture;
  let characterId: number;
  let token: string;
  let releaseCatalogResponse: (() => void) | undefined;
  const downloadKey = Date.now();
  const characterName = `Slow Download Check ${downloadKey}`;
  const loginFixture = () =>
    cy.session(fixture.key, () => {
      cy.intercept('POST', '**/auth/v1/token*').as('signIn');
      cy.login(fixture.gm.email, fixture.gm.password);
      cy.wait('@signIn').then(({ response }) => {
        token = response?.body.access_token;
      });
    });
  const coldVisit = (url: string) =>
    cy.visit(url, {
      onBeforeLoad(win) {
        // A cold connection cannot rely on a catalog saved by a preceding case.
        win.indexedDB.open = () => {
          throw new Error('Fixture cache unavailable');
        };
      },
    });
  const slowCatalog = () => {
    let requests = 0;
    let initialPages = 0;
    let saves = 0;
    cy.intercept('POST', '**/functions/v1/update-character', () => {
      saves++;
    });
    cy.intercept('POST', '**/functions/v1/find-ability-block', (req) => {
      if (req.body.id !== undefined) {
        req.continue();
        return;
      }
      requests++;
      if (req.body.after_id === undefined) initialPages++;
      req.responseTimeout = 120000;
      req.continue((res) => {
        if (req.body.after_id === undefined) res.setDelay(31000);
      });
    }).as('library');
    return { requests: () => requests, initialPages: () => initialPages, saves: () => saves };
  };
  const waitForCatalog = () =>
    cy.wait('@library', { requestTimeout: 60000, responseTimeout: 120000 }).then(({ response }) => {
      expect(response?.statusCode).to.eq(200);
      expect(response?.body.status).to.eq('success');
      expect(response?.body.data.length).to.be.greaterThan(0);
    });

  before(() => {
    cy.task<DownloadFixture>('campaignFixture:create', null, { log: false }).then((created) => {
      fixture = created;
      loginFixture();
      cy.then(() => {
        cy.request({
          method: 'POST',
          url: `${Cypress.expose('functions_url')}/create-character`,
          headers: { Authorization: `Bearer ${token}` },
          log: false,
          body: {
            name: characterName,
            level: 1,
            hp_current: 10,
            details: { conditions: [] },
            inventory: { items: [], coins: { cp: 0, sp: 0, gp: 0, pp: 0 } },
            content_sources: { enabled: [1, 3] },
            meta_data: { reset_hp: false },
          },
        }).then(({ body }) => {
          expect(body.status).to.eq('success');
          characterId = body.data.id;
        });
      });
    });
  });

  after(() => {
    if (fixture) cy.task('campaignFixture:cleanup', fixture.key, { log: false });
  });

  afterEach(() => {
    releaseCatalogResponse?.();
    releaseCatalogResponse = undefined;
  });

  it('opens Oracle with a slow, class-scoped feat download', () => {
    const counts = slowCatalog();
    coldVisit('/?open=link_class_112');
    waitForCatalog();
    cy.get('@library').then(({ request, response }: any) => {
      expect(request.body.traits).to.deep.eq([3631]);
      expect(response.body.data.every((block: any) => block.traits.includes(3631))).to.eq(true);
    });
    // Mantine's fixed portal is visible inside a zero-height root; Cypress 13 misclassifies it.
    cy.contains('h3', 'Class Features', { timeout: 30000 }).scrollIntoView().should('exist');
    cy.contains('a', 'Mystery').should('exist');
    cy.contains("Couldn't load this content").should('not.exist');
    cy.then(() => expect(counts.initialPages(), 'one uninterrupted catalog traversal').to.eq(1));
    cy.viewport(1280, 900);
    cy.screenshot('slow-oracle-desktop');
    cy.viewport(390, 844);
    cy.screenshot('slow-oracle-mobile');
  });

  it('loads the sheet without saving before the complete catalog arrives', () => {
    loginFixture();
    const counts = slowCatalog();
    coldVisit(`/sheet/${characterId}`);
    cy.then(() => expect(counts.saves()).to.eq(0));
    waitForCatalog();
    cy.contains('Hit Points', { timeout: 30000 }).should('be.visible');
    cy.contains("Couldn't load game content").should('not.exist');
    cy.then(() => expect(counts.initialPages(), 'the catalog traversal starts once').to.eq(1));
    cy.screenshot('slow-sheet-loaded');
  });

  it('recovers a worker resource-limited catalog without a partial save or page reload', () => {
    loginFixture();
    let attempts = 0;
    let saves = 0;
    let firstBody: unknown;
    cy.intercept('POST', '**/functions/v1/update-character', (req) => {
      saves++;
      req.continue();
    });
    cy.intercept('POST', '**/functions/v1/find-ability-block', (req) => {
      if (req.body.id !== undefined || req.body.after_id !== undefined) {
        req.continue();
        return;
      }
      req.alias = 'resourceCatalog';
      attempts++;
      if (attempts === 1) {
        firstBody = structuredClone(req.body);
        req.reply({
          statusCode: 546,
          body: { code: 'WORKER_RESOURCE_LIMIT', message: 'Fixture worker resources exhausted' },
        });
      } else {
        expect(req.body, 'retry keeps the original catalog scope').to.deep.eq(firstBody);
        // Keep the real response pending until the incomplete-state assertions finish.
        req.continue(
          () =>
            new Promise<void>((resolve) => {
              releaseCatalogResponse = resolve;
            })
        );
      }
    });
    coldVisit(`/sheet/${characterId}`);
    cy.wait('@resourceCatalog', { requestTimeout: 30000 }).its('response.statusCode').should('eq', 546);
    cy.wrap(null, { timeout: 30000, log: false }).should(() => {
      expect(releaseCatalogResponse, 'the successful retry is held').to.be.a('function');
    });
    cy.contains('Hit Points').should('not.exist');
    cy.then(() => {
      expect(saves, 'no save uses incomplete content').to.eq(0);
      releaseCatalogResponse!();
    });
    cy.wait('@resourceCatalog', { responseTimeout: 120000 }).then(({ response }) => {
      expect(response?.statusCode).to.eq(200);
      expect(response?.body.status).to.eq('success');
      expect(response?.body.data.length).to.be.greaterThan(0);
    });
    cy.contains('Hit Points', { timeout: 30000 }).should('be.visible');
    cy.then(() => expect(attempts, 'one bounded request retry').to.eq(2));
    cy.screenshot('worker-resource-catalog-recovered');
  });

  it('keeps Home working and opens Builder after the slow catalog completes', () => {
    loginFixture();
    const counts = slowCatalog();
    coldVisit(`/builder/${characterId}`);
    cy.get('input[placeholder="Unknown Wanderer"]', { timeout: 30000 }).should('have.value', characterName);
    cy.then(() => expect(counts.requests(), 'Home does not download the feat catalog').to.eq(0));
    cy.contains('button', 'Builder').click();
    waitForCatalog();
    // Choices mount hidden while the worker finishes. Keep readiness in the
    // existing retryable query instead of freezing a hidden element by scrolling it.
    cy.contains('button:visible', 'Select Ancestry', { timeout: 30000 }).scrollIntoView().should('be.visible');
    cy.contains("Couldn't load game content").should('not.exist');
    cy.then(() => expect(counts.initialPages(), 'the catalog traversal starts once').to.eq(1));
    cy.screenshot('slow-builder-loaded');
  });

  for (const format of ['JSON', 'PDF']) {
    it(`downloads a valid ${format} export after a slow catalog response`, () => {
      loginFixture();
      const counts = slowCatalog();
      coldVisit('/characters');
      cy.get(`a[href="/builder/${characterId}"]`, { timeout: 30000 })
        .closest('.mantine-Group-root')
        .find('[aria-label="Options"]')
        .click();
      cy.contains(`Export to ${format}`).click();
      waitForCatalog();
      const path = `${Cypress.config('downloadsFolder')}/slow-download-check-${downloadKey}.${format.toLowerCase()}`;
      if (format === 'JSON') cy.readFile(path, { timeout: 30000 }).its('character.name').should('eq', characterName);
      else
        cy.readFile(path, 'binary', { timeout: 30000, log: false }).then((file: string) => {
          // Logging an entire binary PDF can stall Cypress's browser renderer.
          expect(file.slice(0, 5), 'PDF header').to.eq('%PDF-');
          expect(file.trimEnd().endsWith('%%EOF'), 'complete PDF').to.eq(true);
        });
      cy.then(() => expect(counts.initialPages(), 'the catalog traversal starts once').to.eq(1));
    });
  }
});
