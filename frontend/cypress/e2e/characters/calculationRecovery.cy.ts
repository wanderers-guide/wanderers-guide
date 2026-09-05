describe('Calculation recovery', () => {
  let characterId: number;
  let token: string;
  let restoreWorker: () => void;

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
    cy.intercept('POST', '**/functions/v1/update-character').as('nameSave');
    cy.get('input[placeholder="Unknown Wanderer"]').type('Recovery check');
    cy.wait('@nameSave', { timeout: 15000 });
  });

  after(() => {
    if (!characterId || !token) return;
    cy.request({
      method: 'POST',
      url: `${Cypress.env('functions_url')}/delete-content`,
      headers: { Authorization: `Bearer ${token}` },
      body: { id: characterId, type: 'character' },
      log: false,
      failOnStatusCode: false,
    })
      .its('body.status')
      .should('eq', 'success');
  });

  it('retries the same sheet after worker failure without saving a failed calculation', () => {
    let saves = 0;
    cy.intercept('POST', '**/functions/v1/update-character', (request) => {
      saves++;
      request.continue();
    });
    cy.visit(`/sheet/${characterId}`, {
      onBeforeLoad(win) {
        const Worker = win.Worker;
        win.Worker = new Proxy(Worker, {
          construct() {
            throw new Error('Simulated calculation bootstrap failure');
          },
        });
        restoreWorker = () => {
          win.Worker = Worker;
        };
      },
    });
    cy.contains("Couldn't calculate this character", { timeout: 30000 }).should('be.visible');
    cy.contains('button', 'Retry calculation').should('be.enabled');
    cy.viewport(1280, 900);
    cy.screenshot('calculation-error-desktop');
    cy.viewport(390, 844);
    cy.screenshot('calculation-error-mobile');
    cy.document().then((doc) => {
      expect(doc.documentElement.scrollWidth).to.be.at.most(doc.documentElement.clientWidth);
      expect(saves).to.eq(0);
      restoreWorker();
    });
    cy.contains('button', 'Retry calculation').click();
    cy.contains("Couldn't calculate this character", { timeout: 30000 }).should('not.exist');
    cy.contains('Hit Points', { timeout: 30000 }).should('be.visible');
    cy.screenshot('calculation-recovered-mobile');
    cy.viewport(1280, 900);
    cy.screenshot('calculation-recovered-desktop');
  });
});
