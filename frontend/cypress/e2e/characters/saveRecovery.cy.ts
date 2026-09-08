/** Verify that an unreplayable draft stays quietly preserved without replacing server data. */
describe('Buffered character recovery', () => {
  let characterId: number;
  let token: string;
  let actorId: string;

  before(() => {
    cy.intercept('POST', '**/auth/v1/token*').as('signIn');
    cy.login(Cypress.env('TEST_EMAIL'), Cypress.env('TEST_PASSWORD'));
    cy.wait('@signIn').then(({ response }) => {
      token = response?.body.access_token;
      actorId = response?.body.user.id;
    });
    cy.intercept('POST', '**/functions/v1/create-character').as('create');
    cy.get('button[aria-label="Create Character"]').click();
    cy.wait('@create').then(({ response }) => {
      characterId = response?.body.data.id;
    });
    cy.intercept('POST', '**/functions/v1/update-character').as('nameSave');
    cy.get('input[placeholder="Unknown Wanderer"]', { timeout: 30000 }).type('Saved remote name');
    cy.wait('@nameSave', { timeout: 15000 });
  });

  after(() => {
    if (!characterId || !token) return;
    cy.request({
      method: 'POST',
      url: `${Cypress.env('functions_url')}/delete-content`,
      headers: { Authorization: `Bearer ${token}` },
      body: { id: characterId, type: 'character' },
      log: false,
      failOnStatusCode: false,
    })
      .its('body.status')
      .should('eq', 'success');
  });

  it('preserves earlier changes silently through reload and builder/sheet navigation', () => {
    const assertQuiet = () => {
      cy.get('[data-testid="character-save-status"]').should('not.exist');
      cy.contains('Review earlier changes').should('not.exist');
      cy.contains('Download changes').should('not.exist');
      cy.contains('Discard earlier changes').should('not.exist');
      cy.get('.mantine-Notification-root').should('not.exist');
      cy.get('[role="dialog"]').should('not.exist');
      cy.window().then((win) => {
        const key = Object.keys(win.localStorage).find((key) =>
          key.startsWith(`autosave-character-${characterId}-${actorId}:writer:legacy-account`)
        );
        expect(JSON.parse(win.localStorage.getItem(key ?? '') ?? '{}').body.name).to.eq('Unsynced local copy');
      });
    };
    cy.visit(`/builder/${characterId}`, {
      onBeforeLoad(win) {
        win.localStorage.setItem(
          `autosave-character-${characterId}-${actorId}`,
          JSON.stringify({ version: 1, actorId, body: { id: characterId, name: 'Unsynced local copy' } })
        );
      },
    });
    cy.get('input[placeholder="Unknown Wanderer"]', { timeout: 30000 }).should('have.value', 'Saved remote name');
    assertQuiet();
    cy.reload();
    cy.get('input[placeholder="Unknown Wanderer"]', { timeout: 30000 }).should('have.value', 'Saved remote name');
    assertQuiet();
    cy.viewport(1280, 900);
    cy.visit(`/sheet/${characterId}`);
    cy.contains('Hit Points', { timeout: 30000 }).should('be.visible');
    assertQuiet();
    cy.screenshot('silent-sheet-desktop');
    cy.viewport(390, 844);
    assertQuiet();
    cy.screenshot('silent-sheet-mobile');
    cy.document().then((doc) => {
      expect(doc.documentElement.scrollWidth).to.be.at.most(doc.documentElement.clientWidth);
    });
    cy.visit(`/builder/${characterId}`);
    cy.get('input[placeholder="Unknown Wanderer"]', { timeout: 30000 }).should('have.value', 'Saved remote name');
    assertQuiet();
    cy.request({
      method: 'POST',
      url: `${Cypress.env('functions_url')}/find-character`,
      headers: { Authorization: `Bearer ${token}` },
      body: { id: characterId },
      log: false,
    })
      .its('body.data.name')
      .should('eq', 'Saved remote name');
  });

  it('pauses a same-field conflict and lets the user keep the saved version', () => {
    cy.login(Cypress.env('TEST_EMAIL'), Cypress.env('TEST_PASSWORD'));
    cy.visit(`/builder/${characterId}`);
    cy.get('input[placeholder="Unknown Wanderer"]', { timeout: 30000 }).should('have.value', 'Saved remote name');
    let saves = 0;
    let releaseSave: (() => void) | undefined;
    cy.intercept('POST', '**/functions/v1/update-character', (req) => {
      saves++;
      if (saves === 1) {
        expect(req.body.name).to.eq('My conflicting edit');
        return new Promise<void>((resolve) => {
          releaseSave = () => {
            req.continue();
            resolve();
          };
        });
      }
      req.continue();
    });
    cy.get('input[placeholder="Unknown Wanderer"]', { timeout: 30000 }).clear().type('My conflicting edit');
    // Hold the local write while another device commits. Otherwise a live poll can
    // legitimately receive the remote edit before typing starts, leaving no conflict.
    cy.wrap(null).should(() => expect(releaseSave).to.be.a('function'));
    cy.request({
      method: 'POST',
      url: `${Cypress.env('functions_url')}/update-character`,
      headers: { Authorization: `Bearer ${token}` },
      body: { id: characterId, name: 'Changed on another device' },
      log: false,
    })
      .its('body.status')
      .should('eq', 'success')
      .then(() => releaseSave!());
    cy.contains('Conflicting character edits', { timeout: 30000 }).should('be.visible');
    cy.viewport(1280, 900);
    cy.screenshot('save-conflict-desktop');
    cy.viewport(390, 844);
    cy.screenshot('save-conflict-mobile');
    cy.document().then((doc) => {
      expect(saves).to.eq(1);
      expect(doc.documentElement.scrollWidth).to.be.at.most(doc.documentElement.clientWidth);
    });
    cy.contains('button', 'Use saved version').click();
    cy.contains('Conflicting character edits').should('not.exist');
    cy.get('input[placeholder="Unknown Wanderer"]', { timeout: 30000 }).should(
      'have.value',
      'Changed on another device'
    );
    cy.reload();
    cy.get('input[placeholder="Unknown Wanderer"]', { timeout: 30000 }).should(
      'have.value',
      'Changed on another device'
    );
  });
});
