describe('Login', () => {
  beforeEach( () => {
    cy.visit('/');
  });

  it('should login', () => {
    cy.get('button').contains('Sign in').click();
    cy.location('pathname').should('eq', '/login');

    cy.get('input[name="email"]').type(Cypress.env('TEST_EMAIL'));
    cy.get('input[name="password"]').type(Cypress.env('TEST_PASSWORD'));
    cy.get('button[type="submit"]').contains('Sign in').click();
    cy.location('pathname', {timeout: 1000}).should('eq', '/characters');
  });

  it('should show error message for invalid credentials', () => {
    cy.get('button').contains('Sign in').click();
    cy.location('pathname').should('eq', '/login');

    cy.get('input[name="email"]').type("foo@bar.com");
    cy.get('input[name="password"]').type("wrongpassword");
    cy.get('button[type="submit"]').contains('Sign in').click();
    cy.contains('Invalid login credentials').should('exist');
  });
});