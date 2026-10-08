/** Native appearance is a viewer preference; it must never become a character edit. */
describe('Appearance', () => {
  let characterId: number | undefined;
  let token: string | undefined;

  afterEach(() => {
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
    cy.then(() => {
      characterId = undefined;
      token = undefined;
    });
  });
  it('starts dark, persists a light choice and keeps search portals in the same scheme', () => {
    cy.visit('/');
    cy.get('html').should('have.attr', 'data-mantine-color-scheme', 'dark');
    cy.get('button[aria-label="Switch to light mode"]').click();
    cy.get('html').should('have.attr', 'data-mantine-color-scheme', 'light');
    cy.reload();
    cy.get('html').should('have.attr', 'data-mantine-color-scheme', 'light');
    cy.contains('button', 'Search everything').click();
    cy.get('.mantine-Spotlight-content').should('be.visible');
    cy.get('.mantine-Spotlight-search').should('have.css', 'color', 'rgb(34, 44, 59)');
    cy.get('body').type('{esc}');
    cy.get('button[aria-label="Switch to dark mode"]').focus().should('have.focus').click();
    cy.get('html').should('have.attr', 'data-mantine-color-scheme', 'dark');
  });

  it('keeps the phone appearance control reachable without horizontal overflow', () => {
    cy.viewport(390, 844);
    cy.visit('/login');
    cy.get('button[aria-label="Switch to light mode"]').should('be.visible').click();
    cy.get('html').should('have.attr', 'data-mantine-color-scheme', 'light');
    cy.document().then((doc) => expect(doc.documentElement.scrollWidth).to.be.at.most(doc.documentElement.clientWidth));
    cy.get('button[aria-label="Switch to dark mode"]').should('be.visible');
  });

  it('quietly falls back to dark for unsupported preferences', () => {
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.setItem('wg-color-scheme', JSON.stringify('auto'));
      },
    });
    cy.get('html').should('have.attr', 'data-mantine-color-scheme', 'dark');
    cy.get('.mantine-Notification-root').should('not.exist');
  });

  it('does not write account or character data when appearance changes and shares the choice with stat blocks', () => {
    cy.intercept('POST', '**/auth/v1/token*').as('signIn');
    cy.visit('/login?redirect=characters');
    cy.get('input[name="email"]:visible').type(Cypress.env('TEST_EMAIL'));
    cy.get('input[name="password"]:visible').type(Cypress.env('TEST_PASSWORD'), { log: false });
    cy.contains('button', 'Sign in with Email').click();
    cy.wait('@signIn', { timeout: 120000 }).then(({ response }) => {
      expect(response?.statusCode).to.eq(200);
      token = response?.body.access_token;
    });
    cy.location('pathname', { timeout: 30000 }).should('eq', '/characters');
    cy.intercept('POST', '**/functions/v1/create-character').as('create');
    cy.get('button[aria-label="Create Character"]').click();
    cy.wait('@create').then(({ response }) => {
      characterId = response?.body.data.id;
    });
    cy.get('input[placeholder="Unknown Wanderer"]', { timeout: 30000 }).should('exist');
    let writes = 0;
    cy.intercept('POST', '**/functions/v1/update-character', (req) => {
      writes++;
      req.continue();
    });
    cy.intercept('POST', '**/functions/v1/update-user', (req) => {
      writes++;
      req.continue();
    });
    cy.get('button[aria-label="Switch to light mode"]').click();
    cy.get('html').should('have.attr', 'data-mantine-color-scheme', 'light');
    cy.wait(1000);
    cy.then(() => expect(writes).to.eq(0));
    cy.then(() => cy.visit(`/stat-block/character/${characterId}`));
    cy.get('button[aria-label="Switch to dark mode"]', { timeout: 30000 }).should('be.visible').click();
    cy.get('html').should('have.attr', 'data-mantine-color-scheme', 'dark');
    cy.then(() => expect(writes).to.eq(0));
    cy.get('.mantine-Notification-root').should('not.exist');
  });
});
