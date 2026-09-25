describe('Character list session recovery', () => {
  it('does not present a lost session as an empty account, and retries after recovery', () => {
    cy.login(Cypress.env('TEST_EMAIL'), Cypress.env('TEST_PASSWORD'));
    cy.visit('/account');
    cy.contains('Non-Patron', { timeout: 15000 }).should('be.visible');
    cy.get('header button[aria-haspopup="menu"]').click();
    cy.get('[role="menuitem"][href="/characters"]').should('be.visible');
    let restoreSession: () => void;
    let missingSessionReads = 0;
    // Hide only the persisted auth session, without dispatching a sign-out event.
    // This exercises the actual Supabase client in both dev and production builds.
    cy.window().then((win) => {
      const getItem = win.Storage.prototype.getItem;
      win.Storage.prototype.getItem = function (key: string): string | null {
        if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
          missingSessionReads++;
          return null;
        }
        return getItem.call(this, key);
      };
      restoreSession = () => {
        win.Storage.prototype.getItem = getItem;
      };
    });
    cy.get('[role="menuitem"][href="/characters"]').click();
    cy.contains("Couldn't load your characters", { timeout: 15000 }).should('be.visible');
    cy.contains('No characters found').should('not.exist');
    cy.viewport(1280, 900);
    cy.screenshot('character-list-expired-session-desktop');
    cy.viewport(390, 844);
    cy.screenshot('character-list-expired-session-mobile');
    cy.document().then((doc) => {
      expect(missingSessionReads).to.be.greaterThan(0);
      expect(doc.documentElement.scrollWidth).to.be.at.most(doc.documentElement.clientWidth);
      restoreSession();
    });
    cy.intercept('POST', '**/functions/v1/find-character').as('recoveredList');
    cy.contains('button', 'Try again').click();
    cy.wait('@recoveredList').its('response.body.status').should('eq', 'success');
    cy.contains("Couldn't load your characters").should('not.exist');
  });
});
