/// <reference types="cypress" />
// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })
//
// -- This is a parent command --
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.visit('/login?redirect=characters');
  cy.get('input[name="email"]').type(email);
  cy.get('input[name="password"]').type(password);
  cy.get('button[type="submit"]').contains('Sign in').click();
  cy.location('pathname', { timeout: 1000 }).should('eq', '/characters');
});

Cypress.Commands.add('buildABC', (ancestry: string, background: string, playerClass: string) => {
  // Ancestry
  cy.get('button').contains('Select Ancestry').click({ timeout: 5000 });
  cy.get('input[placeholder="Search ancestries"]').type(ancestry);
  cy.wait(300); // Wait to filter
  cy.get('div.mantine-Modal-body').find('div.mantine-ScrollArea-root').find('div.mantine-Group-root').first().as('ancestry');
  cy.get('@ancestry').find('button').contains('Select').click();

  // Select background
  cy.get('button').contains('Select Background').click();
  cy.get('input[placeholder="Search backgrounds"]').type(background);
  cy.wait(300); // Wait to filter
  cy.get('div.mantine-Modal-body').find('div.mantine-ScrollArea-root').find('div.mantine-Group-root').first().as('background');
  cy.get('@background').find('button').contains('Select').click();

  // Select class
  cy.get('button').contains('Select Class').click();
  cy.get('input[placeholder="Search classes"]').type(playerClass);
  cy.wait(300); // Wait to filter
  cy.get('div.mantine-Modal-body').find('div.mantine-ScrollArea-root').find('div.mantine-Group-root').first().as('playerClass');
  cy.get('@playerClass').find('button').contains('Select').click();
});

Cypress.Commands.add('selectLanguage', (language: string) => {
  cy.get('div.selection-choice-base').contains('Select a Language').first().click();
  cy.get('input[placeholder="Search languages"]').type(language);
  cy.wait(300); // Wait to filter
  cy.get('div.mantine-Modal-body').find('div.mantine-ScrollArea-root').find('div.mantine-Group-root').first().as('language');
  cy.get('@language').find('button').contains('Select').click();
});

Cypress.Commands.add('selectAttribute', (attribute: string) => {
  cy.get('div.selection-choice-base').contains('Select an Attribute').first().click();
  cy.get('.mantine-Modal-body').contains(attribute).click();
});

Cypress.Commands.add('selectSkill', (skill: string) => {
  cy.get('div.selection-choice-base').contains('Select a Skill').first().click();
  cy.get('.mantine-Modal-body').contains(skill).click();
});

Cypress.Commands.add('selectHeritage', (heritage: string) => {
  cy.get('div.selection-choice-base').contains(`Select a Heritage`).first().click();
  cy.get('input[placeholder="Search heritages"]').first().type(heritage);
  cy.wait(300); // Wait to filter
  cy.get('div.mantine-Modal-body').find('div.mantine-ScrollArea-root').find('div.mantine-Group-root').first().as('heritage');
  cy.get('@heritage').find('button').contains('Select').click();
});

const _selectFeat = (featType: 'General Feat' | 'Skill Feat' | 'Feat' | 'Class Feat') => (feat: string) => {
  cy.get('div.selection-choice-base').contains(`Select a ${featType}`).first().click();
  cy.get('input[placeholder="Search feats"]').first().type(feat);
  cy.wait(300); // Wait to filter
  cy.get('div.mantine-Modal-body').find('div.mantine-ScrollArea-root').find('div.mantine-Group-root').first().as('feat');
  cy.get('@feat').find('button').contains('Select').click();
}

Cypress.Commands.add('selectGeneralFeat', _selectFeat('General Feat'));
Cypress.Commands.add('selectFeat', _selectFeat('Feat'));
Cypress.Commands.add('selectSkillFeat', _selectFeat('Skill Feat'));
Cypress.Commands.add('selectClassFeat', _selectFeat('Class Feat'));


export { };

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Login to Wanderer's Guide
       * @param email 
       * @param password 
       */
      login(email: string, password: string): Chainable<Element>;
      /**
       * Selects the ancestry, background and class in the character builder
       * @param ancestry 
       * @param background 
       * @param playerClass 
       */
      buildABC(ancestry: string, background: string, playerClass: string): Chainable<Element>;
      selectLanguage(language: string): Chainable<Element>;
      selectAttribute(attribute: string): Chainable<Element>;
      selectSkill(skill: string): Chainable<Element>;
      selectHeritage(heritage: string): Chainable<Element>;
      selectGeneralFeat(feat: string): Chainable<Element>;
      selectFeat(feat: string): Chainable<Element>;
      selectSkillFeat(feat: string): Chainable<Element>;
      selectClassFeat(feat: string): Chainable<Element>;
      // drag(subject: string, options?: Partial<TypeOptions>): Chainable<Element>
      // dismiss(subject: string, options?: Partial<TypeOptions>): Chainable<Element>
      // visit(originalFn: CommandOriginalFn, url: string, options: Partial<VisitOptions>): Chainable<Element>
    }
  }
}