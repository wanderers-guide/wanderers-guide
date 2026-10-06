describe('Characters', () => {
  let characterId: number | undefined;
  let token: string;
  beforeEach(() => {
    characterId = undefined;
    cy.intercept('POST', '**/auth/v1/token*').as('signIn');
    cy.login(Cypress.env('TEST_EMAIL'), Cypress.env('TEST_PASSWORD'));
    cy.wait('@signIn').then(({ response }) => {
      token = response?.body.access_token;
    });
    cy.visit('/characters');
  });

  it('should show empty characters', () => {
    cy.intercept('POST', '**/functions/v1/find-character', { statusCode: 200, body: { status: 'success', data: [] } });
    cy.visit('/characters');
    cy.contains('No characters found', { timeout: 30000 }).should('exist');
  });

  it('does not report zero characters when the list request fails', () => {
    let outage = true;
    cy.intercept('POST', '**/functions/v1/find-character', (request) => {
      if (outage) {
        request.reply({ statusCode: 503, body: { status: 'error', message: 'Synthetic character-list outage' } });
      } else {
        request.reply({ statusCode: 200, body: { status: 'success', data: [] } });
      }
    }).as('characterList');
    cy.visit('/characters');
    cy.wait('@characterList', { requestTimeout: 30000, responseTimeout: 30000 });
    cy.contains("Couldn't load your characters", { timeout: 30000 }).should('be.visible');
    cy.contains('No characters found').should('not.exist');
    cy.then(() => {
      outage = false;
    });
    cy.contains('button', 'Try again').click();
    cy.contains('No characters found', { timeout: 30000 }).should('be.visible');
  });

  describe('Character builder', () => {
    beforeEach(() => {
      cy.intercept('POST', '**/functions/v1/create-character').as('created');
      cy.get('button[aria-label="Create Character"]').click();
      cy.wait('@created', { requestTimeout: 30000, responseTimeout: 30000 }).then(({ response }) => {
        characterId = response?.body.data.id;
      });
      cy.location('pathname', { timeout: 10000 }).should('include', '/builder');
    });

    afterEach(() => {
      // Clean up only this test's fixture; other local characters may already exist.
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

    it('opens a character with a malformed persisted theme color', () => {
      cy.visit('/characters');
      cy.request({
        method: 'POST',
        url: `${Cypress.env('functions_url')}/find-character`,
        headers: { Authorization: `Bearer ${token}` },
        body: { id: characterId },
        log: false,
      })
        .its('body.data')
        .then((character) =>
          cy.request({
            method: 'POST',
            url: `${Cypress.env('functions_url')}/update-character`,
            headers: { Authorization: `Bearer ${token}` },
            body: {
              id: characterId,
              expected_updated_at: character.updated_at,
              details: {
                ...character.details,
                sheet_theme: { ...character.details?.sheet_theme, color: '#' },
              },
            },
            log: false,
          })
        )
        .its('body.status')
        .should('eq', 'success');

      cy.visit(`/builder/${characterId}`);
      cy.get('input[placeholder="Unknown Wanderer"]', { timeout: 30000 }).should('be.visible');
      cy.contains('We just rolled a Nat 1...').should('not.exist');
    });

    it('inherits account fields omitted by a character theme and keeps phone inputs readable', () => {
      cy.request({
        method: 'POST',
        url: `${Cypress.env('functions_url')}/find-character`,
        headers: { Authorization: `Bearer ${token}` },
        body: { id: characterId },
        log: false,
      })
        .its('body.data')
        .then((character) =>
          cy.request({
            method: 'POST',
            url: `${Cypress.env('functions_url')}/update-character`,
            headers: { Authorization: `Bearer ${token}` },
            log: false,
            body: {
              id: characterId,
              expected_updated_at: character.updated_at,
              details: { ...character.details, sheet_theme: {} },
            },
          })
        )
        .its('body.status')
        .should('eq', 'success');
      // These preferences exist only in the intercepted profile, without changing the account.
      cy.intercept('POST', '**/functions/v1/get-user', (request) =>
        request.continue((response) => {
          if (response.body.data?.user_id)
            response.body.data.site_theme = { color: '#a65cce', view_operations: true, zoom: 1 };
        })
      );
      cy.viewport(390, 844);
      cy.visit(`/builder/${characterId}`);
      cy.get('input[placeholder="Unknown Wanderer"]', { timeout: 30000 })
        .should('be.visible')
        .should(($input) => {
          expect(parseFloat(getComputedStyle($input[0]).fontSize)).to.be.at.least(16);
        });
      cy.window().should((win) => {
        const customization = JSON.parse(win.localStorage.getItem('customization-cache') ?? '{}');
        expect(customization.sheet_theme.color).to.eq('#a65cce');
        expect(customization.sheet_theme.view_operations).to.eq(true);
      });
      cy.get('meta[name="viewport"]').invoke('attr', 'content').should('not.include', 'user-scalable=no');
      cy.screenshot('inherited-account-theme-mobile');
    });

    it('should create a lvl 1 human fighter', () => {
      cy.get('input[placeholder="Unknown Wanderer"]', { timeout: 30000 }).type('Fighter 1');
      cy.get('button[aria-label="Next Page"]').click();
      cy.wait(500);
      cy.contains('Select an ancestry, background, and class to get started.', { timeout: 30000 }).should('be.visible');

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
