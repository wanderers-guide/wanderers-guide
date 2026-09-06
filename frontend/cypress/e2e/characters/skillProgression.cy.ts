/** Run official Fighter/Skill Mastery selections through the real API, worker, builder, and modal. */
describe('Historical skill progression', () => {
  let characterId: number | undefined;
  let token: string;
  const increasePath = 'class-feature-19379_28017953-a9b0-463c-a188-44430105d177';
  const masteryPath = 'class-feature-19301_bf2954a7-f45b-470b-a91b-93348b6b0bdc';
  const selections: Record<string, string> = {
    'class_720d2fe6-f042-4353-8313-1293375b1301-0': 'SKILL_MEDICINE',
    'class_720d2fe6-f042-4353-8313-1293375b1301-1': 'SKILL_ARCANA',
    'class_720d2fe6-f042-4353-8313-1293375b1301-2': 'SKILL_NATURE',
    [increasePath]: 'SKILL_MEDICINE',
    [masteryPath]: '20544',
    [`${masteryPath}_20544_ec29035a-a15e-413f-bcc7-ad5a0c5d2aee`]: 'SKILL_MEDICINE',
    [`${masteryPath}_20544_db311cb5-5d14-4d53-afa2-41470feb090e`]: 'SKILL_ARCANA',
  };

  before(() => {
    cy.intercept('POST', '**/auth/v1/token*').as('signIn');
    cy.login(Cypress.env('TEST_EMAIL'), Cypress.env('TEST_PASSWORD'));
    cy.wait('@signIn').then(({ response }) => {
      token = response?.body.access_token;
      cy.request({
        method: 'POST',
        url: `${Cypress.env('functions_url')}/find-class`,
        headers: { Authorization: `Bearer ${token}` },
        body: { id: 20 },
        log: false,
      }).then(({ body }) => {
        expect(body.status).to.eq('success');
        expect(body.data.name).to.eq('Fighter');
        cy.request({
          method: 'POST',
          url: `${Cypress.env('functions_url')}/create-character`,
          headers: { Authorization: `Bearer ${token}` },
          body: {
            name: 'Historical skill progression',
            level: 15,
            details: { class: body.data },
            content_sources: { enabled: [1] },
            inventory: { items: [] },
            operation_data: { selections },
          },
          log: false,
        }).then(({ body: created }) => {
          expect(created.status).to.eq('success');
          characterId = created.data.id;
        });
      });
    });
  });

  after(() => {
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

  const openBuilder = () => {
    cy.visit(`/builder/${characterId}`);
    cy.get('input[placeholder="Unknown Wanderer"]', { timeout: 30000 }).should(
      'have.value',
      'Historical skill progression'
    );
    cy.get('button[aria-label="Next Page"]').click();
    cy.get('[data-wg-name="level-3"]', { timeout: 60000 }).should('be.visible');
  };

  const openEarlyIncrease = () => {
    cy.get('[data-wg-name="level-3"]').within(() => {
      cy.contains('button', /^Level 3/).click();
      cy.get('[data-wg-name="Skill Increase"]').within(() => {
        cy.contains('button', /Skill Increase/).click();
        cy.get('.selection-choice-base').contains('button', 'Medicine', { timeout: 10000 }).click();
      });
    });
    cy.get('.mantine-Modal-body').last().as('skillModal');
    cy.get('@skillModal').find('input[placeholder^="Search "]').type('Medicine');
    cy.get('@skillModal')
      .contains('p', /^Medicine$/)
      .closest('.mantine-Group-root')
      .as('medicinePreview');
    cy.get('@medicinePreview').find('.mantine-Badge-root').should('have.text', 'E');
    // This is a real pointer action: the old final-rank preview disabled this level-3 choice.
    cy.get('@medicinePreview').parent().parent().should('not.have.css', 'pointer-events', 'none');
  };

  it('keeps Medicine master at level 15 and the level-3 expert choice selectable on desktop and mobile', () => {
    cy.viewport(1280, 900);
    openBuilder();
    cy.contains('button', /^Skills$/).click();
    cy.contains('button', /Medicine/)
      .find('.mantine-Badge-root')
      .should('have.text', 'M');

    openEarlyIncrease();
    cy.screenshot('skill-increase-historical-desktop');
    cy.viewport(390, 844);
    cy.get('@medicinePreview').find('.mantine-Badge-root').should('have.text', 'E');
    cy.document().then((document) => {
      expect(document.documentElement.scrollWidth).to.be.at.most(document.documentElement.clientWidth);
    });
    cy.screenshot('skill-increase-historical-mobile');
    cy.get('@medicinePreview').click();
    cy.get('.mantine-Modal-body').should('not.exist');

    cy.request({
      method: 'POST',
      url: `${Cypress.env('functions_url')}/find-character`,
      headers: { Authorization: `Bearer ${token}` },
      body: { id: characterId },
      log: false,
    })
      .its('body.data.operation_data.selections')
      .should('deep.equal', selections);

    cy.viewport(1280, 900);
    openBuilder();
    cy.contains('button', /^Skills$/).click();
    cy.contains('button', /Medicine/)
      .find('.mantine-Badge-root')
      .should('have.text', 'M');
    openEarlyIncrease();
    cy.get('@medicinePreview').click();
    cy.get('.mantine-Modal-body').should('not.exist');
  });
});
