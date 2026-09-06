describe('Character builder', () => {
  let characterId: number | undefined;
  let token: string;
  before(() => {
    cy.intercept('POST', '**/auth/v1/token*').as('signIn');
    cy.login(Cypress.env('TEST_EMAIL'), Cypress.env('TEST_PASSWORD'));
    cy.wait('@signIn').then(({ response }) => {
      token = response?.body.access_token;
    });
    cy.visit('/characters');
    cy.intercept('POST', '**/functions/v1/create-character').as('created');
    cy.get('button[aria-label="Create Character"]').click();
    cy.wait('@created').then(({ response }) => {
      characterId = response?.body.data.id;
    });
    cy.location('pathname', { timeout: 10000 }).should('include', '/builder');

    cy.get('input[placeholder="Unknown Wanderer"]', { timeout: 30000 }).type('Wizard 1');
    cy.get('button[aria-label="Next Page"]').click();
    cy.contains('Select an ancestry, background, and class to get started.', { timeout: 30000 }).should('be.visible');

    cy.buildABC('Elf', 'Acolyte', 'Wizard');

    // Finished!
    cy.get('button[aria-label="Next Page"]').click();
    cy.location('pathname', { timeout: 30000 }).should('include', '/sheet');
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

  it('should cast only one prepared spell', () => {
    cy.contains('Spells').click();

    cy.get('[data-wg-name="prepared-wizard"]', { timeout: 30000 }).as('preparedSpells');
    cy.get('@preparedSpells').contains('Manage').click();

    const chooseCharm = () => {
      cy.get('input[placeholder="Search spells"]').last().type('Charm');
      cy.get('input[placeholder="Search spells"]')
        .last()
        .closest('.mantine-Modal-body')
        .contains('p', /^Charm$/, { timeout: 30000 })
        .parents('.mantine-Group-root')
        .filter(':has(button)')
        .first()
        .contains('button', /^Select$/)
        .click();
    };

    // Wait for real content readiness, including a cold catalog download.
    cy.contains('Add Spell', { timeout: 30000 }).click({ timeout: 30000 });
    chooseCharm();

    // Prepare charm twice
    cy.get('[data-wg-name="rank-1"]').contains('Select Spell').first().click();
    chooseCharm();
    cy.get('[data-wg-name="rank-1"]').contains('Select Spell').first().click();
    chooseCharm();
    cy.get('button.mantine-Modal-close').last().click();

    // Cast charm
    cy.get('[data-wg-name="rank-group-1"]').as('rank1');
    cy.get('@rank1').contains('Charm').first().click();
    cy.contains('Cast Spell 1').click();
    cy.get('@rank1')
      .find('button')
      .eq(0)
      .contains('Charm')
      .should('have.css', 'text-decoration')
      .and('include', 'line-through');
    cy.get('@rank1')
      .find('button')
      .eq(1)
      .contains('Charm')
      .last()
      .should('have.css', 'text-decoration')
      .and('not.include', 'line-through');

    // Cast charm again
    cy.get('@rank1').find('button').eq(1).click();
    cy.contains('Cast Spell 1').click();
    cy.get('@rank1')
      .find('button')
      .eq(1)
      .contains('Charm')
      .should('have.css', 'text-decoration')
      .and('include', 'line-through');

    // Recover one cast
    cy.get('@rank1').contains('Charm').first().click();
    cy.contains('Recover Spell 1').click();
    cy.get('@rank1')
      .find('button')
      .eq(0)
      .contains('Charm')
      .should('have.css', 'text-decoration')
      .and('not.include', 'line-through');
    cy.get('@rank1')
      .find('button')
      .eq(1)
      .contains('Charm')
      .last()
      .should('have.css', 'text-decoration')
      .and('include', 'line-through');
  });
});
