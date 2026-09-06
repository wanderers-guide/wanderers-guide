describe('Characters', () => {
  let characterId: number | undefined;
  let token: string;
  beforeEach(() => {
    characterId = undefined;
    cy.intercept('POST', '**/auth/v1/token*').as('signIn');
    cy.login(Cypress.env('TEST_EMAIL'), Cypress.env('TEST_PASSWORD'));
    cy.wait('@signIn').then(({ response }) => {
      token = response?.body.access_token;
    });
    cy.visit('/characters');
  });

  it('should show empty characters', () => {
    cy.intercept('POST', '**/functions/v1/find-character', { statusCode: 200, body: { status: 'success', data: [] } });
    cy.visit('/characters');
    cy.contains('No characters found').should('exist');
  });

  describe('Character builder', () => {
    beforeEach(() => {
      cy.intercept('POST', '**/functions/v1/create-character').as('created');
      cy.get('button[aria-label="Create Character"]').click();
      cy.wait('@created').then(({ response }) => {
        characterId = response?.body.data.id;
      });
      cy.location('pathname', { timeout: 10000 }).should('include', '/builder');
    });

    afterEach(() => {
      // Clean up only this test's fixture; other local characters may already exist.
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

    it('should create a lvl 1 human fighter', () => {
      cy.get('input[placeholder="Unknown Wanderer"]', { timeout: 30000 }).type('Fighter 1');
      cy.get('button[aria-label="Next Page"]').click();
      cy.wait(500);
      cy.contains('Select an ancestry, background, and class to get started.').should('exist');

      cy.buildABC('Human', 'Bounty Hunter', 'Fighter');

      // Initial stats
      cy.get('[data-wg-name="level-0"]').click();
      // Ancestry
      cy.get('div.mantine-Accordion-content').find('div.mantine-Accordion-item').contains('Ancestry').click();
      cy.selectAttribute('Strength');
      cy.selectAttribute('Constitution');
      cy.selectLanguage('Dwarven');

      // Background
      cy.get('div.mantine-Accordion-content').find('div.mantine-Accordion-item').contains('Background').click();
      cy.selectAttribute('Strength');
      cy.selectAttribute('Dexterity');

      // Class
      cy.get('div.mantine-Accordion-content').find('div.mantine-Accordion-item').contains('Class').click();
      cy.selectAttribute('Strength');
      cy.get('div.selection-choice-base').contains('Select Acrobatics or Athletics').first().click();
      cy.get('.mantine-Modal-body').contains('Athletics').click();
      cy.selectSkill('Acrobatics');
      cy.selectSkill('Intimidation');
      cy.selectSkill('Medicine');
      // Close initial stats
      cy.get('[data-wg-name="level-0"]').find('button.mantine-Accordion-control').first().click();

      // Lvl 1
      cy.get('[data-wg-name="level-1"]').click();
      cy.get('div.mantine-Accordion-content').as('lvl1');
      // Heritage
      cy.get('@lvl1').find('div.mantine-Accordion-item').contains('Heritage').click();
      cy.selectHeritage('Versatile Human');
      cy.selectGeneralFeat('Battle Medicine');
      // Ancestry feat
      cy.get('@lvl1').find('div.mantine-Accordion-item').contains('Human Feat').click();
      cy.selectFeat('Natural Ambition');
      cy.selectClassFeat('Snagging Strike');
      cy.get('@lvl1').find('div.mantine-Accordion-item').contains('Human Feat').click(); // Close
      // Boosts
      cy.get('@lvl1')
        .find('[data-wg-name="Attribute Boosts"]')
        .find('button.mantine-Accordion-control')
        .first()
        .click();
      cy.selectAttribute('Strength');
      cy.selectAttribute('Dexterity');
      cy.selectAttribute('Constitution');
      cy.selectAttribute('Charisma');
      // Class feat
      cy.get('@lvl1').find('div.mantine-Accordion-item').contains('Fighter Feat').click();
      cy.selectFeat('Vicious Swing');

      // Finished!
      cy.get('button[aria-label="Next Page"]').click();
      cy.wait(500);
      cy.location('pathname').should('include', '/sheet');
    });
  });
});
