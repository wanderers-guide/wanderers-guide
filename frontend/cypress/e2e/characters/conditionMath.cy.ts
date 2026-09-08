/** Real sheet, operation worker, and API regressions for condition math and durable HP edits. */
describe('Condition math and recovery through the real sheet', () => {
  let characterId: number;
  let token: string;
  let releaseContent: (() => void) | undefined;
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
  const read = () => request('find-character', { id: characterId });
  const settled = () => cy.get('[data-testid="character-save-status"]', { timeout: 30000 }).should('contain', 'Saved');
  const check = (label: string, expected: unknown, actual: unknown) => expect(actual, label).to.deep.equal(expected);
  const conditions = (values: [string, number?][]) =>
    values.map(([name, value]) => ({
      name,
      value,
      description: 'Synthetic integration condition',
      for_creature: true,
      for_object: false,
    }));
  let calculationSequence = 0;
  const changeConditions = (values: [string, number?][], expectCalculationSave = true) =>
    read()
      .then((base) =>
        request('update-character', {
          id: characterId,
          expected_updated_at: base.updated_at,
          details: { ...base.details, conditions: conditions(values) },
        })
      )
      .then(() => {
        const alias = `conditionCalculation${++calculationSequence}`;
        cy.intercept('POST', '**/functions/v1/update-character').as(alias);
        cy.reload();
        if (expectCalculationSave)
          cy.wait(`@${alias}`, { timeout: 30000 }).its('response.body.status').should('eq', 'success');
        cy.contains('Hit Points', { timeout: 30000 }).should('be.visible');
        settled();
      });
  const spellPanel = () => {
    cy.get('button[aria-label="Panel Grid"]').click();
    cy.contains('button', /^Spells$/).click();
    cy.get('[data-wg-name="prepared-wizard"]', { timeout: 30000 }).should('be.visible');
  };
  const spellValue = () =>
    cy
      .get('[data-wg-name="prepared-wizard"]')
      .contains('span', /^Spell Attack$/)
      .parent()
      .find('span')
      .last()
      .invoke('text')
      .then((text) => parseInt(text));
  beforeEach(() => {
    characterId = 0;
    releaseContent = undefined;
    cy.viewport(1280, 900);
    cy.intercept('POST', '**/auth/v1/token*').as('signIn');
    cy.login(Cypress.env('TEST_EMAIL'), Cypress.env('TEST_PASSWORD'));
    cy.wait('@signIn').then(({ response }) => {
      token = response?.body.access_token;
      request('find-class', { id: 26 })
        .then((playerClass) =>
          request('create-character', {
            name: 'Condition integration wizard',
            level: 5,
            hp_current: 20,
            details: { class: playerClass, conditions: [] },
            inventory: { items: [] },
            content_sources: { enabled: [1, 3] },
            meta_data: { reset_hp: false },
            options: { custom_operations: true, ignore_bulk_limit: true },
            custom_operations: [
              ...Object.entries({ STR: 0, DEX: 3, CON: 2, INT: 4, WIS: 0, CHA: 0 }).map(([a, value]) => ({
                id: crypto.randomUUID(),
                type: 'setValue',
                data: { variable: `ATTRIBUTE_${a}`, value: { value } },
              })),
              { id: crypto.randomUUID(), type: 'setValue', data: { variable: 'MAX_HEALTH_ANCESTRY', value: 8 } },
              { id: crypto.randomUUID(), type: 'setValue', data: { variable: 'SPEED', value: 25 } },
            ],
          })
        )
        .then((created) => {
          characterId = created.id;
        });
    });
  });
  afterEach(() => {
    releaseContent?.();
    if (characterId && token)
      request('delete-content', { id: characterId, type: 'character' }).then(() =>
        request('find-character', { id: [characterId] }).should('deep.equal', [])
      );
  });
  it('compares actual prepared spell attacks before and after conditions and reopening', () => {
    cy.intercept('POST', '**/functions/v1/update-character').as('sheetCalculation');
    cy.visit(`/sheet/${characterId}`);
    cy.contains('Hit Points', { timeout: 30000 }).should('be.visible');
    cy.wait('@sheetCalculation', { timeout: 30000 }).its('response.body.status').should('eq', 'success');
    settled();
    cy.viewport(390, 844);
    spellPanel();
    spellValue().then((actual) => check('INT spell baseline', 11, actual));
    cy.screenshot('wizard-spells-baseline-mobile');
    changeConditions([['Clumsy', 2]]);
    spellPanel();
    spellValue().then((actual) => check('INT spell with Clumsy 2', 11, actual));
    cy.screenshot('wizard-spells-clumsy-mobile');
    changeConditions([
      ['Frightened', 1],
      ['Stupefied', 2],
    ]);
    spellPanel();
    spellValue().then((actual) => check('INT spell with Frightened 1 and Stupefied 2', 9, actual));
    cy.screenshot('wizard-spells-stacked-status-mobile');
    changeConditions([]);
    spellPanel();
    spellValue().then((actual) => check('Spell attack restored after removing conditions', 11, actual));
    cy.document().then((doc) =>
      check('Mobile horizontal overflow', false, doc.documentElement.scrollWidth > doc.documentElement.clientWidth)
    );
  });
  it('compares saved AC with opposite orders of Encumbered and Clumsy 3', () => {
    cy.intercept('POST', '**/functions/v1/update-character').as('sheetCalculation');
    cy.visit(`/sheet/${characterId}`);
    cy.contains('Hit Points', { timeout: 30000 }).should('be.visible');
    cy.wait('@sheetCalculation', { timeout: 30000 }).its('response.body.status').should('eq', 'success');
    settled();
    changeConditions([['Encumbered'], ['Clumsy', 3]]);
    read().then((saved) => check('Encumbered first: saved AC', 17, saved.meta_data.calculated_stats.ac));
    cy.screenshot('encumbered-before-clumsy-desktop');
    changeConditions([['Clumsy', 3], ['Encumbered']], false);
    read().then((saved) => check('Clumsy first: saved AC', 17, saved.meta_data.calculated_stats.ac));
    cy.screenshot('clumsy-before-encumbered-desktop');
  });
  it('adds Drained using the actual condition picker on an injured character', () => {
    cy.intercept('POST', '**/functions/v1/update-character').as('sheetCalculation');
    cy.visit(`/sheet/${characterId}`);
    cy.contains('Hit Points', { timeout: 30000 }).should('be.visible');
    cy.wait('@sheetCalculation', { timeout: 30000 }).its('response.body.status').should('eq', 'success');
    settled();
    read().then((saved) => {
      check('Injured baseline HP', 20, saved.hp_current);
      check('Baseline maximum HP', 48, saved.meta_data.calculated_stats.hp_max);
    });
    cy.intercept('POST', '**/functions/v1/update-character').as('drainedCalculation');
    cy.get('button[aria-label="Add Condition"]').click();
    cy.contains('.mantine-Modal-content', 'Select a Condition', { timeout: 30000 }).within(() => {
      cy.get('input').first().type('Drained');
      cy.contains(/^Drained$/, { timeout: 30000 }).click();
    });
    cy.contains('Drained', { timeout: 30000 }).should('be.visible');
    cy.wait('@drainedCalculation', { timeout: 30000 }).its('response.body.status').should('eq', 'success');
    settled();
    cy.reload();
    cy.contains('Hit Points', { timeout: 30000 }).should('be.visible');
    settled();
    read().then((saved) => {
      check('Adding Drained 1 loses level 5 HP', 15, saved.hp_current);
      check('Drained maximum HP', 43, saved.meta_data.calculated_stats.hp_max);
    });
    cy.screenshot('drained-injured-hp-after-reopen-desktop');
  });

  it('applies a companion condition from an open dialog to newly received HP', () => {
    request('find-creature', { id: 12096 }).then((bear) =>
      read().then((base) =>
        request('update-character', {
          id: characterId,
          expected_updated_at: base.updated_at,
          companions: {
            list: [
              {
                ...bear,
                hp_current: 30,
                details: { ...bear.details, conditions: [] },
                meta_data: { ...bear.meta_data, reset_hp: false },
              },
            ],
          },
        })
      )
    );
    cy.intercept('POST', '**/functions/v1/update-character').as('companionInitialCalculation');
    cy.visit(`/sheet/${characterId}`);
    cy.wait('@companionInitialCalculation', { timeout: 30000 }).its('response.body.status').should('eq', 'success');
    settled();
    cy.get('button[aria-label="Tab Options"]').trigger('mouseover');
    cy.contains('[role="menuitem"]', /^Companions$/).click();
    cy.get('input[placeholder="HP"]', { timeout: 30000 })
      .should('have.value', '30')
      .closest('[role="tabpanel"]')
      .find('button[aria-label="Add Condition"]')
      .click();
    cy.contains('.mantine-Modal-content', 'Select a Condition', { timeout: 30000 }).within(() => {
      cy.get('input').first().type('Drained');
      cy.contains(/^Drained$/, { timeout: 30000 }).should('be.visible');
    });
    read().then((base) =>
      request('update-character', {
        id: characterId,
        expected_updated_at: base.updated_at,
        companions: {
          ...base.companions,
          list: base.companions.list.map((companion: { hp_current: number }) => ({ ...companion, hp_current: 20 })),
        },
      })
    );
    // The dialog is still open while the authoritative HP and save baseline advance.
    cy.get('input[placeholder="HP"]', { timeout: 20000 }).should('have.value', '20');
    settled();
    cy.intercept('POST', '**/functions/v1/update-character').as('companionDrainedSave');
    cy.contains('.mantine-Modal-content', 'Select a Condition')
      .contains(/^Drained$/)
      .click();
    cy.get('input[placeholder="HP"]').should('have.value', '15');
    cy.wait('@companionDrainedSave', { timeout: 30000 }).then(({ response }) => {
      expect(response?.body.status).to.eq('success');
      expect(response?.body.data[0].companions.list[0].hp_current).to.eq(15);
    });
    settled();
    read().then((saved) => {
      expect(saved.companions.list[0].hp_current).to.eq(15);
      expect(saved.companions.list[0].details.conditions[0].name).to.eq('Drained');
    });
    cy.screenshot('companion-open-dialog-uses-remote-hp');
  });

  it('recovers an accepted Drained edit after a lost acknowledgement and mobile reopen without charging HP twice', () => {
    cy.intercept('POST', '**/functions/v1/update-character').as('initialCalculation');
    cy.visit(`/sheet/${characterId}`);
    cy.wait('@initialCalculation', { timeout: 30000 }).its('response.body.status').should('eq', 'success');
    settled();
    cy.viewport(390, 844);
    const submissions: Record<string, unknown>[] = [];
    let failed = false;
    cy.intercept('POST', '**/functions/v1/update-character', (req) => {
      submissions.push(structuredClone(req.body));
      if (
        !failed &&
        req.body.details?.conditions?.some((condition: { name: string }) => condition.name === 'Drained')
      ) {
        failed = true;
        req.alias = 'lostDrainedAck';
        req.continue((res) => {
          expect(res.body.status).to.eq('success');
          expect(res.body.data[0].hp_current).to.eq(15);
          res.send({ statusCode: 503, body: { status: 'error', message: 'Simulated lost acknowledgement' } });
        });
      }
    });
    cy.get('button[aria-label="Add Condition"]').click();
    cy.contains('.mantine-Modal-content', 'Select a Condition', { timeout: 30000 }).within(() => {
      cy.get('input').first().type('Drained');
      cy.contains(/^Drained$/, { timeout: 30000 }).click();
    });
    cy.wait('@lostDrainedAck');
    // A persisted submission can be reconciled against the accepted snapshot after reload.
    cy.reload();
    cy.contains('Drained', { timeout: 30000 }).should('be.visible');
    settled();
    cy.intercept('POST', '**/functions/v1/find-character').as('recoveryPoll');
    cy.wait('@recoveryPoll', { timeout: 15000 });
    cy.wait('@recoveryPoll', { timeout: 15000 });
    read().then((saved) => {
      expect(saved.hp_current).to.eq(15);
      expect(saved.meta_data.calculated_stats.hp_max).to.eq(43);
      expect(
        saved.details.conditions.filter((condition: { name: string }) => condition.name === 'Drained')
      ).to.have.length(1);
    });
    cy.then(() => {
      // HP and conditions commit together. An interrupted calculation may persist its
      // derived stats after reopening, but cannot replay HP or change other saved fields.
      expect(submissions.length, 'one edit plus at most one derived-stat save').to.be.within(1, 2);
      const persistedInputs = (body: Record<string, unknown>) =>
        Cypress._.omit(body, ['expected_updated_at', 'meta_data.calculated_stats']);
      for (const submission of submissions.slice(1)) {
        expect(persistedInputs(submission)).to.deep.equal(persistedInputs(submissions[0]));
      }
    });
    cy.screenshot('drained-lost-ack-recovered-mobile');
  });

  it('waits for delayed content before saving nested homebrew effects and preserves them through level changes', () => {
    // Level changes can save HP normalization before the calculated-stat update.
    // Read the API again until it confirms the expected result, rather than
    // assuming the first intercepted save was the final calculation.
    const savedMaximum = (expected: number, retries = 40): Cypress.Chainable<unknown> =>
      read().then((saved) => {
        if (saved.meta_data.calculated_stats.hp_max === expected || retries === 0) {
          expect(saved.meta_data.calculated_stats.hp_max).to.eq(expected);
          return;
        }
        return cy.wait(250, { log: false }).then(() => savedMaximum(expected, retries - 1));
      });
    read().then((base) =>
      request('update-character', {
        id: characterId,
        expected_updated_at: base.updated_at,
        custom_operations: [
          ...base.custom_operations,
          {
            id: 'homebrew-conditional',
            type: 'conditional',
            data: {
              conditions: [
                { id: 'homebrew-level', name: 'LEVEL', type: 'num', operator: 'GREATER_THAN_OR_EQUALS', value: '5' },
              ],
              trueOperations: [
                {
                  id: 'homebrew-counter',
                  type: 'createValue',
                  data: { variable: 'BREW_COUNTER', type: 'num', value: 2 },
                },
                { id: 'homebrew-adjust', type: 'adjValue', data: { variable: 'BREW_COUNTER', value: 3 } },
                { id: 'homebrew-link', type: 'createValue', data: { variable: 'BREW_LINK', type: 'num', value: 0 } },
                {
                  id: 'homebrew-hp',
                  type: 'bindValue',
                  data: { variable: 'MAX_HEALTH_BONUS', value: { storeId: 'CHARACTER', variable: 'BREW_LINK' } },
                },
                {
                  id: 'homebrew-final',
                  type: 'bindValue',
                  data: { variable: 'BREW_LINK', value: { storeId: 'CHARACTER', variable: 'BREW_COUNTER' } },
                },
              ],
              falseOperations: [
                { id: 'homebrew-low-level', type: 'setValue', data: { variable: 'MAX_HEALTH_BONUS', value: 1 } },
              ],
            },
          },
        ],
      })
    );
    let saves = 0;
    let contentRequests = 0;
    const gate = new Promise<void>((resolve) => {
      releaseContent = resolve;
    });
    cy.intercept('POST', '**/functions/v1/update-character', (req) => {
      saves++;
      req.continue();
    }).as('homebrewSave');
    cy.intercept('POST', '**/functions/v1/get-content-versions', { body: { status: 'success', data: [] } });
    cy.intercept('POST', '**/functions/v1/find-ability-block', (req) => {
      contentRequests++;
      return gate.then(() => {
        req.continue();
      });
    });
    cy.viewport(390, 844);
    cy.visit(`/sheet/${characterId}`);
    cy.wrap(null).should(() => expect(contentRequests, 'the required table is held').to.be.greaterThan(0));
    cy.contains('Hit Points').should('not.exist');
    cy.then(() => {
      expect(saves, 'no partial calculation can save').to.eq(0);
      releaseContent?.();
    });
    cy.wait('@homebrewSave', { timeout: 30000 });
    settled();
    cy.contains('Hit Points', { timeout: 30000 }).parent().find('a').should('have.text', '53');
    savedMaximum(53);
    cy.screenshot('homebrew-conditional-bindings-mobile');
    for (const [level, maximum] of [
      [1, 17],
      [5, 53],
    ]) {
      read().then((base) =>
        request('update-character', { id: characterId, expected_updated_at: base.updated_at, level })
      );
      cy.reload();
      cy.wait('@homebrewSave', { timeout: 30000 });
      settled();
      cy.contains('Hit Points', { timeout: 30000 }).parent().find('a').should('have.text', String(maximum));
      savedMaximum(maximum);
    }
    cy.reload();
    cy.contains('Hit Points', { timeout: 30000 }).parent().find('a').should('have.text', '53');
    settled();
  });

  it('shows a cyclic homebrew calculation error without saving partial math and recovers after correction', () => {
    cy.intercept('POST', '**/functions/v1/update-character').as('baselineHomebrewSave');
    cy.visit(`/sheet/${characterId}`);
    cy.wait('@baselineHomebrewSave', { timeout: 30000 });
    settled();
    read().then((base) =>
      request('update-character', {
        id: characterId,
        expected_updated_at: base.updated_at,
        custom_operations: [
          ...base.custom_operations,
          { id: 'cycle-a', type: 'createValue', data: { variable: 'BREW_A', type: 'num', value: 1 } },
          { id: 'cycle-b', type: 'createValue', data: { variable: 'BREW_B', type: 'num', value: 2 } },
          {
            id: 'cycle-first',
            type: 'bindValue',
            data: { variable: 'BREW_A', value: { storeId: 'CHARACTER', variable: 'BREW_B' } },
          },
          {
            id: 'cycle-second',
            type: 'bindValue',
            data: { variable: 'BREW_B', value: { storeId: 'CHARACTER', variable: 'BREW_A' } },
          },
        ],
      })
    );
    let saves = 0;
    cy.intercept('POST', '**/functions/v1/update-character', (req) => {
      saves++;
      req.continue();
    });
    cy.viewport(390, 844);
    cy.reload();
    cy.contains("Couldn't calculate this character", { timeout: 30000 }).should('be.visible');
    cy.contains('button', 'Retry calculation').should('be.enabled');
    cy.then(() => expect(saves, 'failed homebrew cannot save derived state').to.eq(0));
    read().its('meta_data.calculated_stats.hp_max').should('eq', 48);
    cy.screenshot('homebrew-cycle-paused-mobile');
    read().then((base) =>
      request('update-character', {
        id: characterId,
        expected_updated_at: base.updated_at,
        custom_operations: base.custom_operations.filter(
          (operation: { id: string }) => !operation.id.startsWith('cycle-')
        ),
      })
    );
    cy.reload();
    cy.contains('Hit Points', { timeout: 30000 }).should('be.visible');
    cy.contains("Couldn't calculate this character").should('not.exist');
    settled();
    read().its('meta_data.calculated_stats.hp_max').should('eq', 48);
  });
});
