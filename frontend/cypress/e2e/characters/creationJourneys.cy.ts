export {};
import { captureClientDiagnostics } from '../../support/client-failure';

/** Real local Auth, character writes and reloads; only the paid AI boundary is stubbed. */
describe('Character creation journeys', () => {
  let token: string;
  let createdIds: number[];
  let diagnostics: string[];
  beforeEach(() => {
    diagnostics = [];
    cy.on('window:before:load', (win) => {
      const record = captureClientDiagnostics(win, diagnostics);
      const observer = new win.MutationObserver(() => {
        for (const notification of win.document.querySelectorAll('.mantine-Notification-root'))
          if (notification.textContent?.includes('Could not copy character')) record(notification.textContent);
      });
      observer.observe(win.document, { childList: true, subtree: true });
    });
    cy.on('fail', (error) => {
      error.message += `\nBrowser diagnostics: ${JSON.stringify(diagnostics)}`;
      throw error;
    });
    createdIds = [];
    cy.intercept('POST', '**/auth/v1/token*').as('signIn');
    cy.login(Cypress.env('TEST_EMAIL'), Cypress.env('TEST_PASSWORD'));
    cy.wait('@signIn').then(({ response }) => {
      token = response!.body.access_token;
    });
    cy.intercept('POST', '**/functions/v1/create-character', (request) =>
      request.continue((response) => {
        if (response.body.status === 'success') createdIds.push(response.body.data.id);
      })
    ).as('created');
  });
  afterEach(() => {
    cy.then(() => {
      for (const id of createdIds)
        cy.request({
          method: 'POST',
          url: `${Cypress.env('functions_url')}/delete-content`,
          headers: { Authorization: `Bearer ${token}` },
          body: { id, type: 'character' },
          log: false,
        })
          .its('body.status')
          .should('eq', 'success');
    });
  });
  const readCharacter = (id: number) =>
    cy
      .request({
        method: 'POST',
        url: `${Cypress.env('functions_url')}/find-character`,
        headers: { Authorization: `Bearer ${token}` },
        body: { id },
        log: false,
      })
      .then(({ body }) => {
        expect(body.status).to.eq('success');
        return body.data;
      });

  it('copies an owned character once and retains its persisted build after reload', () => {
    cy.request({
      method: 'POST',
      url: `${Cypress.env('functions_url')}/create-character`,
      headers: { Authorization: `Bearer ${token}` },
      body: { name: 'October copy fixture', level: 4, hero_points: 2, content_sources: { enabled: [1, 7] } },
      log: false,
    }).then(({ body }) => {
      expect(body.status).to.eq('success');
      const original = body.data;
      createdIds.push(original.id);
      cy.visit('/characters');
      cy.contains('October copy fixture', { timeout: 30000 }).should('be.visible');
      cy.get(`a[href="/builder/${original.id}"]`).parent().find('button[aria-label="Options"]').click();
      cy.contains('[role="menuitem"]', 'Create Copy').click();
      cy.wait('@created', { requestTimeout: 30000, responseTimeout: 30000 }).then(({ response }) => {
        expect(response!.body.status).to.eq('success');
        const copy = response!.body.data;
        expect(copy.id).not.to.eq(original.id);
        readCharacter(copy.id).then((saved) => {
          expect(saved.name).to.eq('(Copy) October copy fixture');
          expect(saved.level).to.eq(4);
          expect(saved.hero_points).to.eq(2);
          expect(saved.content_sources).to.deep.eq(original.content_sources);
        });
        cy.reload();
        cy.contains('(Copy) October', { timeout: 30000 }).should('be.visible');
        readCharacter(original.id).its('name').should('eq', 'October copy fixture');
      });
      cy.contains('Creating copy of').should('not.exist');
    });
  });

  it('generates, persists and reopens a random character using the real rules and backend', () => {
    // A small real catalog makes the random rules loop deterministic and keeps the test bounded.
    cy.intercept('POST', '**/functions/v1/find-content-source', (request) =>
      request.continue((response) => {
        if (Array.isArray(response.body.data))
          response.body.data = response.body.data.filter((source: { id: number }) => [1, 7].includes(source.id));
      })
    );
    cy.intercept('POST', '**/functions/v1/open-ai-request', (request) =>
      request.reply({
        body: {
          status: 'success',
          data: request.body.content.includes('Only return the JSON object') ? '{}' : 'October Random Fixture',
        },
      })
    );
    cy.visit('/characters', {
      onBeforeLoad(win) {
        win.Math.random = () => 0;
      },
    });
    cy.get('button[aria-label="Create Random Character"]').click();
    cy.wait('@created', { requestTimeout: 120000, responseTimeout: 30000 }).then(({ response }) => {
      expect(response!.body.status).to.eq('success');
      const id = response!.body.data.id;
      readCharacter(id).then((saved) => {
        expect(saved.name).to.eq('October Random Fixture');
        expect(saved.level).to.eq(1);
        expect(saved.details.class.id).to.be.a('number');
        expect(saved.details.ancestry.id).to.be.a('number');
        expect(saved.details.background.id).to.be.a('number');
        expect(Object.keys(saved.operation_data.selections)).not.to.be.empty;
      });
      cy.visit(`/sheet/${id}`);
      cy.contains('Hit Points', { timeout: 60000 }).should('be.visible');
      cy.contains('We just rolled a Nat 1...').should('not.exist');
      cy.reload();
      cy.contains('Hit Points', { timeout: 60000 }).should('be.visible');
      readCharacter(id).its('name').should('eq', 'October Random Fixture');
    });
  });
  it('offers current Magus archetype feats at Fighter level 4 and after reload', () => {
    cy.get('button[aria-label="Create Character"]').click();
    cy.wait('@created', { requestTimeout: 30000, responseTimeout: 30000 }).then(({ response }) => {
      expect(response!.body.status).to.eq('success');
      const id = response!.body.data.id;
      cy.request({
        method: 'POST',
        url: `${Cypress.env('functions_url')}/update-character`,
        headers: { Authorization: `Bearer ${token}` },
        body: {
          id,
          expected_updated_at: response!.body.data.updated_at,
          content_sources: { enabled: [1, 3, 7, 8, 371, 842] },
        },
        log: false,
      })
        .its('body.status')
        .should('eq', 'success');
      cy.visit(`/builder/${id}`);
      cy.contains('label', 'Level').parent().find('input').click();
      cy.get('[role="option"]').contains(/^4$/).click();
      cy.get('button[aria-label="Next Page"]').click();
      cy.contains('Select an ancestry, background, and class to get started.', { timeout: 30000 }).should('be.visible');
      cy.buildABC('Human', 'Bounty Hunter', 'Fighter');
      cy.get('[data-wg-name="level-2"]').click();
      cy.get('[data-wg-name="level-2"]').contains('.mantine-Accordion-item', 'Fighter Feat').click();
      cy.get('[data-wg-name="level-2"]').contains('button', 'Select a Feat').click();
      cy.contains('[role="tab"]', 'Add Dedication', { timeout: 30000 }).click();
      cy.get('input[placeholder="Search feats"]:visible').type('Magus Dedication');
      cy.intercept('POST', '**/functions/v1/update-character', (request) => {
        if (Object.values(request.body.operation_data?.selections ?? {}).includes('22549'))
          request.alias = 'savedMagus';
      });
      cy.contains('.mantine-Modal-body [role="tabpanel"]:visible', 'Magus Dedication', { timeout: 30000 }).should(
        'be.visible'
      );
      // The unfiltered tab also contains Magus; wait for the debounced result before choosing it.
      cy.get('.mantine-Modal-body [role="tabpanel"]:visible')
        .find('button', { timeout: 30000 })
        .filter((_, button) => button.textContent === 'Select')
        .should('have.length', 1)
        .click();
      cy.wait('@savedMagus', { requestTimeout: 30000, responseTimeout: 30000 })
        .its('response.body.status')
        .should('eq', 'success');
      const openLevel4 = () => {
        cy.get('[data-wg-name="level-4"]', { timeout: 30000 }).should('be.visible').click();
        cy.get('[data-wg-name="level-4"]').contains('.mantine-Accordion-item', 'Fighter Feat').click();
        cy.get('[data-wg-name="level-4"]').contains('button', 'Select a Feat').click();
        cy.contains('[role="tab"]', 'Archetype Feats').click();
        cy.contains('.mantine-Modal-body', 'Basic Martial Magic', { timeout: 30000 }).should('be.visible');
        cy.contains('.mantine-Modal-body', 'Basic Magus Spellcasting').should('be.visible');
      };
      openLevel4();
      cy.get('.mantine-Modal-close').click();
      // The second pass uses persisted selection data and a warm content cache.
      cy.visit('/characters');
      readCharacter(id).then((saved) => expect(Object.values(saved.operation_data.selections)).to.include('22549'));
      cy.visit('/builder/' + id);
      cy.get('button[aria-label="Next Page"]', { timeout: 30000 }).click();
      openLevel4();
      cy.get('.mantine-Modal-close').click();
      cy.get('.mantine-Modal-content').should('not.exist');
      cy.viewport(390, 844);
      cy.contains('.mantine-Stepper-step', 'Home').click();
      cy.get('input[placeholder="Unknown Wanderer"]', { timeout: 30000 }).should('be.visible');
      cy.get('button[aria-label="Next Page"]').scrollIntoView().should('be.visible');
      cy.screenshot('builder-next-page-phone');
      cy.get('button[aria-label="Next Page"]').click();
      cy.get('[data-wg-name="level-4"]', { timeout: 30000 }).scrollIntoView().should('be.visible');
    });
  });
});
