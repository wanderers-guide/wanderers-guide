describe('Characters', () => {
  beforeEach(() => {
    cy.login(Cypress.env('TEST_EMAIL'), Cypress.env('TEST_PASSWORD'));
    cy.visit('/characters');
  });

  it('should show empty characters', () => {
    cy.contains('No characters found').should('exist');
  });

  describe('Character builder', () => {
    beforeEach(() => {
      cy.get('.tabler-icon-user-plus').click();
      cy.wait(500);
      cy.location('pathname').should('include', '/builder');
    });

    afterEach(() => {
      cy.get('button').contains('User Name').click();
      cy.get('div.mantine-Menu-dropdown').contains('Characters').click();
      cy.wait(500);
      cy.location('pathname').should('eq', '/characters');

      const removeCharacter = ($el: HTMLElement) => {
        cy.wrap($el).as('btn');
        cy.get('@btn').click();
        cy.contains('Delete Character').click();
        cy.get('button').contains('Delete').click();
      };

      cy.get('button[aria-label="Options"]').each(removeCharacter);
      cy.contains('No characters found').should('exist');
    });

    it('should create a lvl 1 human fighter', () => {
      cy.get('input[placeholder="Unknown Wanderer"]').type('Fighter 1');
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
