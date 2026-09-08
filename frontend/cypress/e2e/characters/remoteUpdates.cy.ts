/** Exercise live reads through the rendered editor, real operations worker, and local API. */
describe('Incoming character updates', () => {
  let characterId: number | undefined;
  let token: string;
  let actorId: string;

  const request = (endpoint: string, body: Record<string, unknown>) =>
    cy
      .request({
        method: 'POST',
        url: `${Cypress.env('functions_url')}/${endpoint}`,
        headers: { Authorization: `Bearer ${token}` },
        body,
        log: false,
      })
      .then(({ body: result }) => {
        expect(result.status).to.eq('success');
        return result.data;
      });
  const read = () => request('find-character', { id: characterId });
  /** Wait for the complete calculated snapshot before introducing another client's edit. */
  const interceptInitialCalculation = () =>
    cy.intercept('POST', '**/functions/v1/update-character', (req) => {
      if (req.body.meta_data?.calculated_stats?.ac === 13 && req.body.meta_data?.calculated_stats?.hp_max === 10)
        req.alias = 'initialCalculationSave';
    });

  beforeEach(() => {
    characterId = undefined;
    cy.intercept('POST', '**/auth/v1/token*').as('signIn');
    cy.login(Cypress.env('TEST_EMAIL'), Cypress.env('TEST_PASSWORD'));
    cy.wait('@signIn').then(({ response }) => {
      token = response?.body.access_token;
      actorId = response?.body.user.id;
      request('find-class', { id: 20 }).then((playerClass) => {
        expect(playerClass.name).to.eq('Fighter');
        request('create-character', {
          name: 'Incoming update check',
          level: 1,
          details: { class: playerClass },
          content_sources: { enabled: [1] },
          inventory: { items: [] },
          hp_current: 10,
        }).then((created) => {
          characterId = created.id;
        });
      });
    });
  });

  afterEach(() => {
    if (characterId && token) request('delete-content', { id: characterId, type: 'character' });
  });

  it('receives damage and conditions while open, without an autosave loop', () => {
    interceptInitialCalculation();
    cy.visit(`/sheet/${characterId}`);
    cy.contains('Hit Points', { timeout: 30000 }).should('be.visible');
    cy.wait('@initialCalculationSave', { timeout: 30000 }).its('response.body.status').should('eq', 'success');
    let writes = 0;
    cy.intercept('POST', '**/functions/v1/update-character', (req) => {
      writes++;
      req.continue();
    });
    cy.intercept('POST', '**/functions/v1/find-character').as('poll');
    // cy.request acts as another client; it bypasses browser interception and autosave.
    read().then((base) =>
      request('update-character', { id: characterId, expected_updated_at: base.updated_at, hp_current: 7 })
    );
    cy.contains('p', /^Hit Points$/)
      .parent()
      .contains('p', /^7$/, { timeout: 20000 })
      .should('be.visible');
    cy.wait('@poll', { timeout: 15000 });
    cy.wait('@poll', { timeout: 15000 });
    cy.then(() => expect(writes, 'incoming HP is already saved').to.eq(0));
    read().then((base) =>
      request('update-character', {
        id: characterId,
        expected_updated_at: base.updated_at,
        details: {
          ...base.details,
          conditions: [
            {
              name: 'Frightened',
              description: 'Remote condition integration fixture',
              value: 1,
              for_object: false,
              for_creature: true,
            },
          ],
        },
      })
    );
    cy.contains('Frightened', { timeout: 20000 }).should('be.visible');
    // One derived-stat save is allowed after applying the condition; repeated reads must settle.
    cy.wait('@poll', { timeout: 15000 });
    cy.wait('@poll', { timeout: 15000 });
    cy.then(() => expect(writes, 'bounded recalculation after the condition').to.be.at.most(1));
    cy.viewport(1280, 900);
    cy.get('.mantine-Notification-root').should('not.exist');
    cy.screenshot('incoming-campaign-condition-desktop');
    cy.viewport(390, 844);
    cy.screenshot('incoming-campaign-condition-mobile');
    cy.document().then((doc) => expect(doc.documentElement.scrollWidth).to.be.at.most(doc.documentElement.clientWidth));
    read().then((saved) => {
      expect(saved.hp_current).to.eq(7);
      expect(saved.details.conditions[0].name).to.eq('Frightened');
    });
  });

  it('ignores a stale poll arriving after a newer local save', () => {
    cy.visit(`/builder/${characterId}`);
    cy.get('input[placeholder="Unknown Wanderer"]', { timeout: 30000 }).should('have.value', 'Incoming update check');
    let held = false;
    cy.intercept('POST', '**/functions/v1/find-character', (req) => {
      if (!held) {
        req.alias = 'staleRead';
        req.continue((res) => {
          held = true;
          res.setDelay(5000);
        });
      } else req.continue();
    });
    cy.wrap(null, { timeout: 15000 }).should(() => expect(held).to.eq(true));
    let writes = 0;
    cy.intercept('POST', '**/functions/v1/update-character', (req) => {
      writes++;
      req.continue();
    }).as('localSave');
    cy.get('input[placeholder="Unknown Wanderer"]').clear().type('Newer accepted name');
    cy.wait('@localSave', { timeout: 15000 }).its('response.body.status').should('eq', 'success');
    cy.wait('@staleRead', { timeout: 15000 });
    cy.get('input[placeholder="Unknown Wanderer"]').should('have.value', 'Newer accepted name');
    cy.then(() => expect(writes).to.eq(1));
    read().its('name').should('eq', 'Newer accepted name');
  });

  it('reloads matching content after a remote source change and settles', () => {
    interceptInitialCalculation();
    cy.visit(`/sheet/${characterId}`);
    cy.contains('Hit Points', { timeout: 30000 }).should('be.visible');
    cy.wait('@initialCalculationSave', { timeout: 30000 }).its('response.body.status').should('eq', 'success');
    cy.intercept('POST', '**/functions/v1/find-character').as('poll');
    read().then((base) =>
      request('update-character', {
        id: characterId,
        expected_updated_at: base.updated_at,
        content_sources: { enabled: [1, 256] },
      })
    );
    cy.wait('@poll', { timeout: 15000 });
    cy.wait('@poll', { timeout: 15000 });
    cy.contains('Hit Points', { timeout: 30000 }).should('be.visible');
    read().its('content_sources.enabled').should('deep.eq', [1, 256]);
    cy.wait('@poll', { timeout: 15000 });
    cy.contains('Hit Points').should('be.visible');
    cy.contains("Couldn't calculate this character").should('not.exist');
  });

  it('reopens unsynced source choices against the older server package without a reload loop', () => {
    read().then((base) => {
      cy.intercept('POST', '**/functions/v1/update-character').as('recoveredSources');
      cy.visit(`/sheet/${characterId}`, {
        onBeforeLoad(win) {
          const writerId = 'source-recovery-fixture';
          win.localStorage.setItem(
            `autosave-character-${characterId}-${actorId}:writer:${writerId}`,
            JSON.stringify({
              version: 2,
              actorId,
              writerId,
              requiresCalculation: true,
              base,
              body: { ...base, expected_updated_at: base.updated_at, content_sources: { enabled: [1, 256] } },
            })
          );
        },
      });
    });
    cy.contains('Hit Points', { timeout: 30000 }).should('be.visible');
    cy.wait('@recoveredSources', { timeout: 30000 }).its('response.body.status').should('eq', 'success');
    read().its('content_sources.enabled').should('deep.eq', [1, 256]);
    cy.reload();
    cy.contains('Hit Points', { timeout: 30000 }).should('be.visible');
    cy.contains('Conflicting character edits').should('not.exist');
  });
});
