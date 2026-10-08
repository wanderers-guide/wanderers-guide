describe('Incomplete content recovery', () => {
  let characterId: number;
  let token: string;
  const login = () =>
    cy.session('quiet-content-recovery', () => cy.login(Cypress.env('TEST_EMAIL'), Cypress.env('TEST_PASSWORD')));

  before(() => {
    cy.intercept('POST', '**/auth/v1/token*').as('signIn');
    login();
    cy.wait('@signIn').then(({ response }) => {
      token = response?.body.access_token;
    });
    cy.visit('/characters');
    cy.intercept('POST', '**/functions/v1/create-character').as('create');
    cy.get('button[aria-label="Create Character"]').click();
    cy.wait('@create').then(({ response }) => {
      characterId = response?.body.data.id;
    });
    cy.get('input[placeholder="Unknown Wanderer"]', { timeout: 30000 }).should('be.visible');
  });

  afterEach(() => {
    cy.then(() =>
      Cypress.automation('remote:debugger:protocol', {
        command: 'Network.setBypassServiceWorker',
        params: { bypass: false },
      })
    );
  });

  after(() => {
    if (!characterId || !token) return;
    cy.request({
      method: 'POST',
      url: `${Cypress.env('functions_url')}/delete-content`,
      headers: { Authorization: `Bearer ${token}` },
      body: { id: characterId, type: 'character' },
      log: false,
    })
      .its('body.status')
      .should('eq', 'success');
  });

  for (const surface of ['sheet', 'builder']) {
    it(`recovers ${surface} content quietly without a partial save`, () => {
      login();
      let broken = true;
      let saves = 0;
      cy.intercept('POST', '**/functions/v1/update-character', (req) => {
        saves++;
        req.continue();
      });
      cy.intercept('POST', '**/functions/v1/find-ability-block', (req) => {
        if (broken) req.reply({ statusCode: 200, body: { status: 'error', message: 'Fixture content outage' } });
        else req.continue();
      }).as('catalog');
      cy.visit(`/${surface}/${characterId}`, {
        onBeforeLoad(win) {
          win.indexedDB.open = () => {
            throw new Error('Fixture cache unavailable');
          };
        },
      });
      // The initial character read must finish before its loading overlay permits navigation.
      if (surface === 'builder') cy.contains('button', 'Builder').click({ timeout: 30000 });
      cy.wait(['@catalog', '@catalog'], { requestTimeout: 45000 });
      cy.contains("Couldn't load game content").should('not.exist');
      cy.contains('button', 'Retry').should('not.exist');
      cy.contains('Hit Points').should('not.exist');
      cy.viewport(1280, 900);
      cy.screenshot(`quiet-${surface}-loading-desktop`);
      cy.viewport(390, 844);
      cy.screenshot(`quiet-${surface}-loading-mobile`);
      cy.document().then((doc) => {
        expect(saves).to.eq(0);
        expect(doc.documentElement.scrollWidth).to.be.at.most(doc.documentElement.clientWidth);
        broken = false;
      });
      // The scheduled background read recovers without a Retry button or page reload.
      cy.wait('@catalog', { requestTimeout: 45000, responseTimeout: 120000 });
      if (surface === 'sheet') cy.contains('Hit Points', { timeout: 30000 }).should('be.visible');
      else cy.contains('Select Ancestry', { timeout: 30000 }).scrollIntoView().should('be.visible');
      cy.contains("Couldn't load game content").should('not.exist');
      cy.screenshot(`quiet-${surface}-recovered-mobile`);
    });
  }
  it('keeps fatal route diagnostics private and offers a simple path home', () => {
    login();
    // CI serves immutable assets; bypass both browser and worker caches so the failure is real.
    cy.then(() => Cypress.automation('remote:debugger:protocol', { command: 'Network.clearBrowserCache' }));
    cy.then(() =>
      Cypress.automation('remote:debugger:protocol', {
        command: 'Network.setBypassServiceWorker',
        params: { bypass: true },
      })
    );
    cy.intercept('GET', '**/assets/CharacterSheetPage-*.js', {
      statusCode: 500,
      body: 'Private fixture diagnostic',
      headers: { 'cache-control': 'no-store' },
    }).as('brokenRoute');
    cy.visit(`/sheet/${characterId}`);
    cy.wait('@brokenRoute').its('response.statusCode').should('eq', 500);
    cy.contains('Unable to open this page', { timeout: 30000 }).should('be.visible');
    cy.contains('Reload app').should('not.exist');
    cy.contains('GitHub Issues').should('not.exist');
    cy.get('code').should('not.exist');
    cy.contains('Private fixture diagnostic').should('not.exist');
    cy.viewport(1280, 900);
    cy.screenshot('quiet-fatal-page-desktop');
    cy.viewport(390, 844);
    cy.screenshot('quiet-fatal-page-mobile');
    cy.contains('Back to home').click();
    cy.location('pathname').should('eq', '/');
    cy.contains('Unable to open this page').should('not.exist');
  });
});
