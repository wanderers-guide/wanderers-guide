describe('Login', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('keeps sign in as one focusable button with a clickable decorative icon', () => {
    cy.viewport(1280, 900);
    cy.contains('.mantine-AppShell-header button', 'Sign in').should('be.visible').as('signIn');
    cy.get('@signIn').find('button, [role="button"], [tabindex]').should('not.exist');
    // Check focus and pointer activation through the decorative icon.
    cy.get('@signIn').focus().should('be.focused');
    cy.get('@signIn')
      .find('span.mantine-ActionIcon-root')
      .should('be.visible')
      .and('have.attr', 'aria-hidden', 'true')
      .click();
    cy.location('pathname').should('eq', '/login');
  });

  it('opens sign in through the existing mobile navigation', () => {
    cy.viewport(375, 812);
    cy.get('.mantine-Burger-root').should('be.visible').click();
    cy.contains('.mantine-AppShell-navbar button', 'Sign in / Register').should('be.visible').click();
    cy.location('pathname').should('eq', '/login');
  });

  it('should login', () => {
    cy.get('button').contains('Sign in').click();
    cy.location('pathname').should('eq', '/login');

    cy.env(['TEST_EMAIL', 'TEST_PASSWORD']).then(({ TEST_EMAIL, TEST_PASSWORD }) => {
      if (typeof TEST_EMAIL !== 'string' || typeof TEST_PASSWORD !== 'string')
        throw new Error('UI sign-in requires the owned test credentials');
      cy.get('input[name="email"]').type(TEST_EMAIL);
      cy.get('input[name="password"]').type(TEST_PASSWORD, { log: false });
    });
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
    cy.login();

    cy.get('button').contains('User Name').click();
    cy.get('div.mantine-Menu-dropdown').contains('Logout').click();

    // Logout clears the session; the home page should re-show the public sign-in CTA.
    cy.contains('button', /Sign in/i, { timeout: 10000 }).should('exist');
  });
});
