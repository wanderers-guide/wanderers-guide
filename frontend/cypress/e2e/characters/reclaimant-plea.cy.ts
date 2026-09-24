describe('Reclaimant Plea', () => {
  let characterId: number;
  let token: string;
  const request = (endpoint: string, body: Record<string, unknown>) =>
    cy
      .then(() =>
        cy.request({
          method: 'POST',
          url: `${Cypress.env('functions_url')}/${endpoint}`,
          headers: { Authorization: `Bearer ${token}` },
          body,
          log: false,
        })
      )
      .then(({ body }) => {
        expect(body.status).to.eq('success');
        return body.data;
      });

  after(() => {
    if (characterId && token) request('delete-content', { id: characterId, type: 'character' });
  });

  it('renders all three saved innate choices at rank 7 and preserves them after reload', () => {
    cy.intercept('POST', '**/auth/v1/token*').as('signIn');
    cy.login(Cypress.env('TEST_EMAIL'), Cypress.env('TEST_PASSWORD'));
    cy.wait('@signIn').then(({ response }) => {
      token = response?.body.access_token;
    });
    cy.intercept('POST', '**/functions/v1/create-character').as('created');
    cy.get('button[aria-label="Create Character"]').click();
    cy.wait('@created').then(({ response }) => {
      characterId = response?.body.data.id;
    });
    cy.get('input[placeholder="Unknown Wanderer"]', { timeout: 30000 }).should('be.visible');
    cy.visit('/characters');

    const selections: Record<string, string> = {};
    const operations: { id: string; type: string; data: { type: string; abilityBlockId: number } }[] = [];
    for (const [id, optionIndex] of [
      [28549, 0],
      [29011, 1],
      [29012, 8],
    ]) {
      request('find-ability-block', { id }).then((feat) => {
        const select = feat.operations.find((operation: { type: string }) => operation.type === 'select');
        const grant = `give-${id}`;
        selections[`character_${grant}`] = String(id);
        selections[`character_${grant}_${select.id}`] = select.data.optionsPredefined[optionIndex].id;
        operations.push({ id: grant, type: 'giveAbilityBlock', data: { type: 'feat', abilityBlockId: id } });
      });
    }
    cy.then(() => {
      request('find-character', { id: characterId }).then((saved) =>
        request('update-character', {
          id: characterId,
          expected_updated_at: saved.updated_at,
          name: 'Reclaimant progression check',
          level: 18,
          content_sources: { enabled: [1, 3, 11, 25, 256] },
          options: { custom_operations: true },
          custom_operations: operations,
          operation_data: { selections },
        })
      );
    });
    cy.intercept('POST', '**/functions/v1/update-character', (req) => {
      if (req.body.meta_data?.calculated_stats?.profs?.SPELL_ATTACK?.type === 'M') req.alias = 'calculatedStats';
    });
    cy.then(() => cy.visit(`/sheet/${characterId}`));
    cy.contains('Hit Points', { timeout: 30000 }).should('be.visible');
    cy.contains("Couldn't calculate this character").should('not.exist');
    cy.get('button[aria-label="Tab Options"]').trigger('mouseover');
    cy.contains('[role="menuitem"]', 'Spells').click();
    cy.contains('button', 'Innate Spells', { timeout: 30000 }).then(($button) => {
      if ($button.attr('aria-expanded') !== 'true') cy.wrap($button).click();
    });
    cy.get('[data-wg-name="rank-group-0"]').as('innateSpells');
    for (const name of ['Air Walk', 'Planar Tether', 'Sunburst'])
      cy.get('@innateSpells').contains(name).should('be.visible');
    cy.get('@innateSpells').contains('7th').should('be.visible');
    cy.wait('@calculatedStats', { timeout: 15000 }).its('response.body.status').should('eq', 'success');
    cy.screenshot('reclaimant-plea-rank-seven');
    cy.reload();
    cy.contains('Hit Points', { timeout: 30000 }).should('be.visible');
    cy.then(() => request('find-character', { id: characterId })).then((saved) => {
      expect(saved.operation_data.selections).to.deep.eq(selections);
      expect(saved.custom_operations).to.deep.eq(operations);
      expect(saved.meta_data.calculated_stats.profs.SPELL_ATTACK.type).to.eq('M');
      expect(saved.meta_data.calculated_stats.profs.SPELL_DC.type).to.eq('M');
    });
  });
});
