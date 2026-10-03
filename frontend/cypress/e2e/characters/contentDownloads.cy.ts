type DownloadFixture = { key: string; gm: { email: string; password: string } };

describe('Slow content downloads', () => {
  let fixture: DownloadFixture;
  let characterId: number;
  let token: string;
  const characterName = 'Slow Download Check';
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
    let saves = 0;
    cy.intercept('POST', '**/functions/v1/update-character', () => {
      saves++;
    });
    cy.intercept('POST', '**/functions/v1/find-ability-block', (req) => {
      requests++;
      req.continue((res) => {
        res.setDelay(31000);
      });
    }).as('library');
    return { requests: () => requests, saves: () => saves };
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
          url: `${Cypress.env('functions_url')}/create-character`,
          headers: { Authorization: `Bearer ${token}` },
          log: false,
          body: {
            name: characterName,
            level: 1,
            hp_current: 10,
            details: { conditions: [] },
            inventory: { items: [] },
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
    cy.then(() => expect(counts.requests(), 'one uninterrupted catalog download').to.eq(1));
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
    cy.then(() => expect(counts.requests()).to.eq(1));
    cy.screenshot('slow-sheet-loaded');
  });

  it('keeps Home working and opens Builder after the slow catalog completes', () => {
    loginFixture();
    const counts = slowCatalog();
    coldVisit(`/builder/${characterId}`);
    cy.get('input[placeholder="Unknown Wanderer"]', { timeout: 30000 }).should('have.value', characterName);
    cy.then(() => expect(counts.requests(), 'Home does not download the feat catalog').to.eq(0));
    cy.contains('button', 'Builder').click();
    waitForCatalog();
    cy.contains('Select Ancestry', { timeout: 30000 }).scrollIntoView().should('be.visible');
    cy.contains("Couldn't load game content").should('not.exist');
    cy.then(() => expect(counts.requests()).to.eq(1));
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
      const path = `${Cypress.config('downloadsFolder')}/slow-download-check.${format.toLowerCase()}`;
      if (format === 'JSON') cy.readFile(path, { timeout: 30000 }).its('character.name').should('eq', characterName);
      else cy.readFile(path, 'binary', { timeout: 30000 }).should('match', /^%PDF-/);
      cy.then(() => expect(counts.requests()).to.eq(1));
    });
  }
});
