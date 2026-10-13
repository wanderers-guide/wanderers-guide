describe('Login', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('keeps sign in as one keyboard-accessible button', () => {
    cy.contains('button', 'Sign in').as('signIn');
    cy.get('@signIn').find('button, [role="button"], [tabindex]').should('not.exist');
    cy.get('@signIn').focus().should('be.focused').type('{enter}');
    cy.location('pathname').should('eq', '/login');
  });

  it('keeps the decorative sign-in icon clickable on mobile', () => {
    cy.viewport(375, 812);
    cy.contains('button', 'Sign in')
      .find('span.mantine-ActionIcon-root')
      .should('have.attr', 'aria-hidden', 'true')
      .click();
    cy.location('pathname').should('eq', '/login');
  });

  it('should login', () => {
    cy.get('button').contains('Sign in').click();
    cy.location('pathname').should('eq', '/login');

    cy.get('input[name="email"]').type(Cypress.env('TEST_EMAIL'));
    cy.get('input[name="password"]').type(Cypress.env('TEST_PASSWORD'));
    cy.contains('button', 'Sign in with Email').click();
    cy.location('pathname', { timeout: 10000 }).should('eq', '/characters');
  });

  it('should show error message for invalid credentials', () => {
    cy.get('button').contains('Sign in').click();
    cy.location('pathname').should('eq', '/login');

    cy.get('input[name="email"]').type('foo@bar.com');
    cy.get('input[name="password"]').type('wrongpassword');
    cy.contains('button', 'Sign in with Email').click();
    cy.contains(/Invalid (email or password|login credentials)/i, { timeout: 10000 }).should('exist');
  });

  it('should logout and return to the public homepage', () => {
    cy.login(Cypress.env('TEST_EMAIL'), Cypress.env('TEST_PASSWORD'));

    cy.get('button').contains('User Name').click();
    cy.get('div.mantine-Menu-dropdown').contains('Logout').click();

    // Logout clears the session; the home page should re-show the public sign-in CTA.
    cy.contains('button', /Sign in/i, { timeout: 10000 }).should('exist');
  });
});
