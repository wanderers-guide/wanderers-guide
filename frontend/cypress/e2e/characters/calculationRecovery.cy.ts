describe('Calculation recovery', () => {
  let characterId: number;
  let token: string;
  let restoreWorker: () => void;

  before(() => {
    cy.intercept('POST', '**/auth/v1/token*').as('signIn');
    cy.login(Cypress.env('TEST_EMAIL'), Cypress.env('TEST_PASSWORD'));
    cy.wait('@signIn').then(({ response }) => {
      token = response?.body.access_token;
    });
    cy.intercept('POST', '**/functions/v1/create-character').as('create');
    cy.get('button[aria-label="Create Character"]').click();
    cy.wait('@create').then(({ response }) => {
      characterId = response?.body.data.id;
    });
    cy.intercept('POST', '**/functions/v1/update-character').as('nameSave');
    cy.get('input[placeholder="Unknown Wanderer"]', { timeout: 30000 }).type('Recovery check');
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

  it('retries the same sheet after worker failure without saving a failed calculation', () => {
    let saves = 0;
    cy.intercept('POST', '**/functions/v1/update-character', (request) => {
      saves++;
      request.continue();
    });
    cy.visit(`/sheet/${characterId}`, {
      onBeforeLoad(win) {
        const Worker = win.Worker;
        win.Worker = new Proxy(Worker, {
          construct() {
            throw new Error('Simulated calculation bootstrap failure');
          },
        });
        restoreWorker = () => {
          win.Worker = Worker;
        };
      },
    });
    cy.contains("Couldn't calculate this character", { timeout: 30000 }).should('be.visible');
    cy.contains('button', 'Retry calculation').should('be.enabled');
    cy.viewport(1280, 900);
    cy.screenshot('calculation-error-desktop');
    cy.viewport(390, 844);
    cy.screenshot('calculation-error-mobile');
    cy.document().then((doc) => {
      expect(doc.documentElement.scrollWidth).to.be.at.most(doc.documentElement.clientWidth);
      expect(saves).to.eq(0);
      restoreWorker();
    });
    cy.contains('button', 'Retry calculation').click();
    cy.contains("Couldn't calculate this character", { timeout: 30000 }).should('not.exist');
    cy.contains('Hit Points', { timeout: 30000 }).should('be.visible');
    cy.screenshot('calculation-recovered-mobile');
    cy.viewport(1280, 900);
    cy.screenshot('calculation-recovered-desktop');
  });

  it('calculates published dedication checks with the legacy displayed Untrained default', () => {
    cy.login(Cypress.env('TEST_EMAIL'), Cypress.env('TEST_PASSWORD'));
    const request = (endpoint: string, body: Record<string, unknown>) =>
      cy
        .request({
          method: 'POST',
          url: `${Cypress.env('functions_url')}/${endpoint}`,
          headers: { Authorization: `Bearer ${token}` },
          body,
          log: false,
        })
        .then(({ body }) => {
          expect(body.status).to.eq('success');
          return body.data;
        });
    const savedCalculation = (retries = 40): Cypress.Chainable<unknown> =>
      request('find-character', { id: characterId }).then((saved) => {
        if (typeof saved.meta_data?.calculated_stats?.hp_max === 'number') return;
        expect(retries, 'calculated stats eventually save').to.be.greaterThan(0);
        return cy.wait(250, { log: false }).then(() => savedCalculation(retries - 1));
      });

    // Real published operations, persisted through the API and executed by the browser worker.
    // Dragon Lore exposes the formerly dormant empty threshold in Draconic Acolyte.
    for (const [featId, sourceId] of [
      [51259, 730],
      [45859, 579],
      [45862, 579],
      [51716, 635],
    ]) {
      cy.log(`Published feat ${featId}`);
      request('find-character', { id: characterId }).then((saved) =>
        request('update-character', {
          id: characterId,
          expected_updated_at: saved.updated_at,
          level: 20,
          content_sources: { enabled: [1, 3, 256, sourceId] },
          options: { custom_operations: true, ignore_bulk_limit: true },
          meta_data: { ...saved.meta_data, calculated_stats: { profs: {} } },
          custom_operations: [
            {
              id: 'dragon-lore',
              type: 'createValue',
              data: { variable: 'SKILL_LORE_DRAGON', type: 'prof', value: { value: 'T' } },
            },
            { id: 'published-feat', type: 'giveAbilityBlock', data: { type: 'feat', abilityBlockId: featId } },
          ],
        })
      );
      cy.visit(`/sheet/${characterId}`);
      cy.contains('Hit Points', { timeout: 30000 }).should('be.visible');
      cy.contains("Couldn't calculate this character").should('not.exist');
      savedCalculation();
      request('find-character', { id: characterId }).then((saved) => {
        expect(saved.custom_operations[1].data.abilityBlockId).to.eq(featId);
      });
    }
    cy.screenshot('published-feat-calculation-recovered');
  });

  it('persists the displayed Untrained value when opening a legacy condition in the editor', () => {
    cy.login(Cypress.env('TEST_EMAIL'), Cypress.env('TEST_PASSWORD'));
    const api = (endpoint: string, body: Record<string, unknown>) =>
      cy
        .request({
          method: 'POST',
          url: `${Cypress.env('functions_url')}/${endpoint}`,
          headers: { Authorization: `Bearer ${token}` },
          body,
          log: false,
        })
        .then(({ body }) => {
          expect(body.status).to.eq('success');
          return body.data;
        });
    api('find-character', { id: characterId }).then((saved) =>
      api('update-character', {
        id: characterId,
        expected_updated_at: saved.updated_at,
        content_sources: { enabled: [1, 3] },
        options: { custom_operations: true, ignore_bulk_limit: true },
        custom_operations: [
          {
            id: 'legacy-check',
            type: 'conditional',
            data: {
              conditions: [
                { id: 'rank-check', name: 'SKILL_MEDICINE', type: 'prof', operator: 'GREATER_THAN', value: '' },
              ],
              trueOperations: [],
              falseOperations: [],
            },
          },
        ],
      })
    );
    cy.visit(`/builder/${characterId}`);
    cy.contains('[role="tab"]', 'Options', { timeout: 30000 }).click();
    cy.intercept('POST', '**/functions/v1/update-character', (req) => {
      if (req.body.custom_operations?.[0]?.data?.conditions?.[0]?.value === 'U') req.alias = 'defaultRankSave';
    });
    cy.contains('button', 'Open Operations').click();
    cy.get('.mantine-Modal-body input[value="U"]').should('be.checked');
    cy.wait('@defaultRankSave', { timeout: 15000 }).its('response.body.status').should('eq', 'success');
    api('find-character', { id: characterId }).then((saved) => {
      expect(saved.custom_operations[0].data.conditions[0].value).to.eq('U');
    });
    cy.screenshot('conditional-editor-untrained-persisted');
  });
});
