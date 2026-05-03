// Smoke tests for the main authenticated routes. Each test just confirms the
// page renders something distinctive without throwing. Use the user-menu
// dropdown for navigation so we exercise the same path a real user takes.

describe('Navigation', () => {
  beforeEach(() => {
    cy.login(Cypress.env('TEST_EMAIL'), Cypress.env('TEST_PASSWORD'));
  });

  const visitViaUserMenu = (label: string, expectedPath: string) => {
    cy.get('button').contains('User Name').click();
    cy.get('div.mantine-Menu-dropdown').contains(label).click();
    cy.location('pathname', { timeout: 10000 }).should('eq', expectedPath);
  };

  it('navigates to Encounters', () => {
    visitViaUserMenu('Encounters', '/encounters');
  });

  it('navigates to Homebrew', () => {
    visitViaUserMenu('Homebrew', '/homebrew');
  });

  it('navigates to Campaigns', () => {
    visitViaUserMenu('Campaigns', '/campaigns');
  });

  it('navigates to Account', () => {
    visitViaUserMenu('Account', '/account');
  });
});
