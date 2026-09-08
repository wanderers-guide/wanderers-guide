/** Real editor/API regression: a dropped save must recover without another edit or reload. */
describe('Interrupted character saves', () => {
  let characterId: number | undefined;
  let token: string;
  let actorId: string;

  beforeEach(() => {
    characterId = undefined;
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
    cy.get('input[placeholder="Unknown Wanderer"]', { timeout: 30000 }).should('be.visible');
  });

  afterEach(() => {
    cy.then(() =>
      Cypress.automation('remote:debugger:protocol', { command: 'Emulation.setCPUThrottlingRate', params: { rate: 1 } })
    );
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

  const readCharacter = () =>
    cy
      .request({
        method: 'POST',
        url: `${Cypress.env('functions_url')}/find-character`,
        headers: { Authorization: `Bearer ${token}` },
        body: { id: characterId },
        log: false,
      })
      .its('body.data');

  it('saves the retained edit when the connection returns, without requiring more typing', () => {
    let disrupted = true;
    cy.intercept('POST', '**/functions/v1/update-character', (req) => {
      if (disrupted) {
        req.alias = 'droppedSave';
        req.destroy();
      } else {
        if (req.body.name === 'Kept through a connection drop') req.alias = 'recoveredSave';
        req.continue();
      }
    });
    cy.get('input[placeholder="Unknown Wanderer"]').type('Kept through a connection drop');
    cy.wait('@droppedSave', { timeout: 15000 });
    cy.contains('Changes not saved', { timeout: 40000 }).should('be.visible');
    cy.window().should((win) => {
      const key = Object.keys(win.localStorage).find((key) =>
        key.startsWith(`autosave-character-${characterId}-${actorId}:writer:`)
      );
      const draft = JSON.parse(win.localStorage.getItem(key ?? '') ?? '{}');
      expect(draft.body?.name).to.eq('Kept through a connection drop');
    });
    cy.window().then((win) => {
      disrupted = false;
      win.dispatchEvent(new Event('online'));
    });
    cy.wait('@recoveredSave', { timeout: 15000 }).its('response.body.status').should('eq', 'success');
    cy.request({
      method: 'POST',
      url: `${Cypress.env('functions_url')}/find-character`,
      headers: { Authorization: `Bearer ${token}` },
      body: { id: characterId },
      log: false,
    })
      .its('body.data.name')
      .should('eq', 'Kept through a connection drop');
    cy.reload();
    cy.get('input[placeholder="Unknown Wanderer"]', { timeout: 30000 }).should(
      'have.value',
      'Kept through a connection drop'
    );
  });

  it('retains the newest edit when the server commits but its response times out', () => {
    let committed = false;
    let first = true;
    cy.intercept('POST', '**/functions/v1/update-character', (req) => {
      if (first && req.body.name === 'Committed before timeout') {
        first = false;
        req.continue((res) => {
          committed = res.body.status === 'success';
          res.setDelay(31000);
        });
      } else {
        if (req.body.name === 'Newest edit during timeout') req.alias = 'latestSave';
        req.continue();
      }
    });
    cy.get('input[placeholder="Unknown Wanderer"]').type('Committed before timeout');
    cy.wrap(null).should(() => expect(committed).to.eq(true));
    readCharacter().its('name').should('eq', 'Committed before timeout');
    cy.get('input[placeholder="Unknown Wanderer"]').clear().type('Newest edit during timeout');
    cy.wait('@latestSave', { timeout: 45000 }).its('response.body.status').should('eq', 'success');
    readCharacter().its('name').should('eq', 'Newest edit during timeout');
    cy.reload();
    cy.get('input[placeholder="Unknown Wanderer"]', { timeout: 30000 }).should(
      'have.value',
      'Newest edit during timeout'
    );
  });

  it('recovers prepared spells after interruption and reopening at phone width', () => {
    cy.get('input[placeholder="Unknown Wanderer"]').type('Mobile wizard recovery');
    cy.get('button[aria-label="Next Page"]').click();
    cy.contains('Select an ancestry, background, and class to get started.', { timeout: 30000 }).should('be.visible');
    cy.buildABC('Elf', 'Acolyte', 'Wizard');
    cy.get('button[aria-label="Next Page"]').click();
    cy.location('pathname').should('include', '/sheet');
    cy.contains('Hit Points', { timeout: 30000 }).should('be.visible');
    cy.viewport(390, 844);
    cy.then(() =>
      Cypress.automation('remote:debugger:protocol', { command: 'Emulation.setCPUThrottlingRate', params: { rate: 4 } })
    );
    cy.get('button[aria-label="Panel Grid"]', { timeout: 10000 }).should('be.visible').click();
    cy.contains('button', /^Spells$/).click();
    let disrupted = true;
    cy.intercept('POST', '**/functions/v1/update-character', (req) => {
      if (disrupted) req.reply({ statusCode: 503, body: { status: 'error', message: 'Test connection interruption' } });
      else {
        req.alias = 'spellsSaved';
        req.continue((res) => {
          res.setDelay(750);
          res.setThrottle(32);
        });
      }
    });
    cy.get('[data-wg-name="prepared-wizard"]').contains('Manage').click();
    // The real catalog may take several seconds under 4x CPU throttling.
    cy.contains('Add Spell').click({ timeout: 30000 });
    const chooseCharm = () => {
      cy.get('input[placeholder="Search spells"]').last().type('Charm');
      cy.get('input[placeholder="Search spells"]')
        .last()
        .closest('.mantine-Modal-body')
        .contains('p', /^Charm$/)
        .parents('.mantine-Group-root')
        .filter(':has(button)')
        .first()
        .contains('button', /^Select$/)
        .click();
    };
    chooseCharm();
    cy.get('[data-wg-name="rank-1"]').contains('Select Spell').first().click();
    chooseCharm();
    cy.get('button[aria-label="Dismiss save notice"]', { timeout: 30000 }).click();
    cy.get('#character-save-failed').should('not.exist');
    cy.get('button.mantine-Modal-close').last().click();
    cy.get('[data-testid="character-save-status"]').should('not.exist');
    cy.screenshot('mobile-spells-waiting-to-sync');
    cy.window().then((win) => win.dispatchEvent(new Event('pagehide')));
    cy.reload();
    cy.get('button[aria-label="Panel Grid"]', { timeout: 30000 }).should('be.visible').click();
    cy.contains('button', /^Spells$/).click();
    cy.get('[data-wg-name="rank-group-1"]').contains('Charm').should('be.visible');
    cy.window().then((win) => {
      disrupted = false;
      win.dispatchEvent(new Event('online'));
    });
    cy.wait('@spellsSaved', { timeout: 30000 }).its('response.body.status').should('eq', 'success');
    readCharacter()
      .its('spells')
      .then((spells) => {
        expect(spells.list.length).to.be.greaterThan(0);
        expect(spells.slots.some((slot: { spell_id?: number }) => !!slot.spell_id)).to.eq(true);
      });
    cy.reload();
    cy.get('button[aria-label="Panel Grid"]', { timeout: 30000 }).should('be.visible').click();
    cy.contains('button', /^Spells$/).click();
    cy.get('[data-wg-name="rank-group-1"]').contains('Charm').should('be.visible');
    cy.screenshot('mobile-spells-saved-after-reopen');
    cy.document().then((doc) => expect(doc.documentElement.scrollWidth).to.be.at.most(doc.documentElement.clientWidth));
  });
});
