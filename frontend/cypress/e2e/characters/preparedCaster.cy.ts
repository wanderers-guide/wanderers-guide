describe('Character builder', () => {
  before(() => {
    cy.login(Cypress.env('TEST_EMAIL'), Cypress.env('TEST_PASSWORD'));
    cy.visit('/characters');
    cy.get('.tabler-icon-user-plus').click();
    cy.location('pathname').should('include', '/builder');

    cy.get('input[placeholder="Unknown Wanderer"]').type('Wizard 1');
    cy.get('button[aria-label="Next Page"]').click();
    cy.wait(500);
    cy.contains('Select an ancestry, background, and class to get started.').should('exist');

    cy.buildABC('Elf', 'Acolyte', 'Wizard');

    // Finished!
    cy.get('button[aria-label="Next Page"]').click();
    cy.location('pathname').should('include', '/sheet');
  });

  after(() => {
    cy.get('button').contains('User Name').click({force: true});
    cy.get('div.mantine-Menu-dropdown').contains('Characters').click();
    cy.location('pathname').should('eq', '/characters');

    const removeCharacter = ($el: HTMLElement) => {
      cy.wrap($el).as('btn');
      cy.get('@btn').click();
      cy.contains('Delete Character').click();
      cy.get('button').contains('Delete').click();
    };

    cy.get('button[aria-label="Options"]').each(removeCharacter);
  });

  it('should cast only one prepared spell', () => {
    cy.contains("Spells").click();

    cy.get('[data-wg-name="prepared-wizard"]').as("preparedSpells");
    cy.get('@preparedSpells').contains("Manage").click();

    // Add charm to list
    cy.contains("Add Spell").click();
    cy.get("div.mantine-Modal-body").get('input[placeholder="Search spells"]').last().type("Charm");
    cy.wait(300); // Wait to filter
    cy.contains("Select").click();

    // Prepare charm twice
    cy.get('[data-wg-name="rank-1"]').contains("Select Spell").first().click();
    cy.get('input[placeholder="Search spells"]').last().type("Charm");
    cy.wait(300); // Wait to filter
    cy.get('div.mantine-Group-root').contains("Select").click();
    cy.get('[data-wg-name="rank-1"]').contains("Select Spell").first().click();
    cy.get('input[placeholder="Search spells"]').last().type("Charm");
    cy.wait(300); // Wait to filter
    cy.get('div.mantine-Group-root').contains("Select").click();
    cy.get('button.mantine-Modal-close').last().click();

    // Cast charm
    cy.get('[data-wg-name="rank-group-1"]').as("rank1");
    cy.get('@rank1').click();
    cy.get('@rank1').contains('Charm').first().click();
    cy.contains('Cast Spell 1').click();
    cy.get('@rank1').find("div.mantine-Accordion-content").find("button").eq(0).contains("Charm").should('have.css', 'text-decoration').and('include', 'line-through');
    cy.get('@rank1').find("div.mantine-Accordion-content").find("button").eq(1).contains('Charm').last().should('have.css', 'text-decoration').and('not.include', 'line-through');

    // Cast charm again
    cy.get('@rank1').find("div.mantine-Accordion-content").find("button").eq(1).click();
    cy.contains('Cast Spell 1').click();
    cy.get('@rank1').find("div.mantine-Accordion-content").find("button").eq(1).contains("Charm").should('have.css', 'text-decoration').and('include', 'line-through');

    // Recover one cast
    cy.get('@rank1').contains('Charm').first().click();
    cy.contains('Recover Spell 1').click();
    cy.get('@rank1').find("div.mantine-Accordion-content").find("button").eq(0).contains("Charm").should('have.css', 'text-decoration').and('not.include', 'line-through');
    cy.get('@rank1').find("div.mantine-Accordion-content").find("button").eq(1).contains('Charm').last().should('have.css', 'text-decoration').and('include', 'line-through');
  });
});