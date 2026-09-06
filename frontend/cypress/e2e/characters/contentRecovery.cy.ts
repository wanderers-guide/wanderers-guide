describe('Incomplete content recovery', () => {
  let characterId: number;
  let token: string;

  before(() => {
    cy.intercept('POST', '**/auth/v1/token*').as('signIn');
    cy.login(Cypress.env('TEST_EMAIL'), Cypress.env('TEST_PASSWORD'));
    cy.wait('@signIn').then(({ response }) => {
      token = response?.body.access_token;
    });
    cy.intercept('POST', '**/functions/v1/create-character').as('create');
    cy.get('button[aria-label="Create Character"]').click();
    cy.wait('@create').then(({ response }) => {
      characterId = response?.body.data.id;
    });
    cy.get('input[placeholder="Unknown Wanderer"]', { timeout: 30000 }).should('be.visible');
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

  it('keeps the sheet closed when one table fails, then retries without a partial save', () => {
    let broken = true;
    let saves = 0;
    cy.intercept('POST', '**/functions/v1/update-character', (req) => {
      saves++;
      req.continue();
    });
    cy.intercept('POST', '**/functions/v1/find-ability-block', (req) => {
      if (broken) req.reply({ statusCode: 200, body: { status: 'error', message: 'Fixture content outage' } });
      else req.continue();
    });
    // Prevent a previous valid persisted package from hiding the simulated table outage.
    cy.intercept('POST', '**/functions/v1/get-content-versions', {
      body: { status: 'success', data: [] },
    });
    cy.visit(`/sheet/${characterId}`);
    cy.contains("Couldn't load game content", { timeout: 45000 }).should('be.visible');
    cy.contains('Hit Points').should('not.exist');
    cy.viewport(1280, 900);
    cy.screenshot('content-error-desktop');
    cy.viewport(390, 844);
    cy.screenshot('content-error-mobile');
    cy.document().then((doc) => {
      expect(saves).to.eq(0);
      expect(doc.documentElement.scrollWidth).to.be.at.most(doc.documentElement.clientWidth);
      broken = false;
    });
    cy.contains('button', 'Retry').click();
    cy.contains('Hit Points', { timeout: 30000 }).should('be.visible');
    cy.contains("Couldn't load game content").should('not.exist');
  });
});
