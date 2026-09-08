/** Render the scenario matrix, then exercise the local interactions that distinguish resource types. */
describe('Spells design study', () => {
  beforeEach(() =>
    cy.intercept('**/functions/v1/**', () => {
      throw new Error('Spell mock must not contact character APIs');
    })
  );
  const visit = (scenario: string, design = 'sections') =>
    cy.visit(`/?view=spell-designs&scenario=${scenario}&design=${design}`);
  const openEntry = (id: string) => cy.get(`[data-entry-id="${id}"]`).click();
  const cast = () => cy.get('[role="dialog"]').contains('button', /^Cast/).click();
  const close = () => cy.get('[aria-label="Close spell dialog"]').click();
  for (const width of [390, 430])
    for (const design of ['sections', 'switcher']) {
      it(`renders all scenarios in ${design} at ${width}px`, () => {
        cy.viewport(width + 30, 1100);
        for (const scenario of [
          'mixed',
          'prepared',
          'tradition',
          'spontaneous',
          'focus',
          'rituals',
          'innate',
          'items',
          'homebrew',
          'empty',
        ]) {
          visit(scenario, design);
          cy.contains('label', String(width)).click();
          cy.get('.spell-phone')
            .should('be.visible')
            .and(($phone) => expect($phone[0].getBoundingClientRect().width).to.eq(width));
          cy.get('.spell-page,.spell-list-scroll').each(($el) =>
            expect($el[0].scrollWidth, `${scenario} overflow`).to.be.at.most($el[0].clientWidth)
          );
          if (['mixed', 'items', 'homebrew'].includes(scenario))
            cy.get('.spell-phone').screenshot(`${design}-${width}-${scenario}`, { overwrite: true });
          if (scenario === 'empty') cy.contains('No spells yet').should('be.visible');
          if (scenario === 'homebrew') cy.contains('Spell unavailable').should('exist');
        }
        cy.viewport(width, 1100);
        cy.document().then((doc) => expect(doc.documentElement.scrollWidth).to.be.at.most(width));
      });
    }
  for (const design of ['sections', 'switcher'])
    it(`casts and prepares individual slots in ${design}`, () => {
      cy.viewport(430, 1100);
      visit('mixed', design);
      openEntry('wizard-1');
      cy.get('[role="dialog"]').should('contain', 'Charm').and('contain', 'Rank 1');
      cy.get('[role="dialog"]').then(($dialog) =>
        cy.get('.spell-phone').then(($phone) => {
          const dialog = $dialog[0].getBoundingClientRect(),
            phone = $phone[0].getBoundingClientRect();
          expect(dialog.left).to.be.at.least(phone.left);
          expect(dialog.right).to.be.at.most(phone.right);
          expect(dialog.bottom).to.be.at.most(phone.bottom);
        })
      );
      cy.get('.spell-phone').screenshot(`${design}-cast-dialog`, { overwrite: true });
      cast();
      cy.get('[data-entry-id="wizard-1"]').should('have.attr', 'data-used');
      openEntry('wizard-2');
      cy.contains('button', 'Recover preparation').click();
      cy.get('[data-entry-id="wizard-2"]').should('not.have.attr', 'data-used');
      cy.get('[data-entry-id="wizard-1"]').should('have.attr', 'data-used');
      cy.contains('button', /^1 unprepared slot/).click();
      cy.get('[role="combobox"][aria-label="Prepare slot 4"]').click();
      cy.contains('[role="option"]', /^Fear$/).click({ scrollBehavior: false });
      cy.get('.spell-phone').screenshot(`${design}-prepare-dialog`, { overwrite: true });
      close();
      cy.get('[data-entry-id="wizard-3"]').should('contain', 'Fear');
      if (design === 'switcher') {
        cy.get('[aria-label="Search all spells"]').type('Invisibility');
        cy.get('.spell-row-name').should('have.length', 2);
        cy.contains('Results from all sources').should('be.visible');
        cy.get('[aria-label="Clear spell search"]').click();
        cy.get('[role="combobox"][aria-label="Spell source"]').click();
        cy.contains('[role="option"]', /^Focus spells$/).click({ scrollBehavior: false });
        cy.contains('Lay on Hands').should('be.visible');
      }
    });
  it('keeps spontaneous and focus pools stable while searching and casting cantrips', () => {
    cy.viewport(430, 1100);
    visit('spontaneous');
    openEntry('bard-0');
    cast();
    cy.get('.spell-resource').first().should('contain', '3');
    openEntry('bard-1');
    cast();
    cy.get('.spell-resource').first().should('contain', '2');
    visit('tradition');
    cy.get('[aria-label="Spell filters"]').click();
    cy.get('[role="combobox"][aria-label="Filter spell action cost"]').click();
    cy.contains('[role="option"]', /^3 actions$/).click({ scrollBehavior: false });
    cy.get('.spell-row-name').should('have.length', 1).and('contain', 'Heal');
    visit('focus');
    openEntry('focus-1');
    cast();
    cy.get('.spell-resource').should('contain', '2');
    openEntry('focus-0');
    cast();
    cy.get('.spell-resource').should('contain', '1');
    cy.get('[aria-label="Search all spells"]').type('unknown');
    cy.contains('No matching spells.').should('be.visible');
    cy.contains('button', 'Clear filters').click();
    cy.get('.spell-resource').should('contain', '1');
  });
  it('keeps duplicate wands separate and shows ritual references without a cast control', () => {
    cy.viewport(430, 1100);
    visit('items');
    openEntry('wand-travel-0');
    cast();
    cy.get('[data-source="wand-travel"] .spell-resource').should('contain', '0');
    cy.get('[data-source="wand-spare"] .spell-resource').should('contain', '0');
    cy.get('[data-source="wand-travel"] .spell-resource').click();
    cy.get('[role="dialog"] input').clear().type('1');
    cy.contains('button', /^Done$/).click();
    cy.get('[data-source="wand-travel"] .spell-resource').should('contain', '1');
    cy.get('[data-source="wand-spare"] .spell-resource').should('contain', '0');
    openEntry('staff-0');
    cast();
    cy.get('[data-source="staff"] .spell-resource').should('contain', '2');
    openEntry('staff-0');
    cy.get('[role="dialog"]').contains('button', /^Cast/).should('be.disabled');
    close();
    visit('rituals');
    openEntry('ritual-0');
    cy.get('[role="dialog"]').should('contain', 'Resurrect');
    cy.get('[role="dialog"]').contains('button', /^Cast/).should('not.exist');
    close();
    visit('innate');
    openEntry('innate-0');
    cast();
    cy.get('.spell-resource').should('contain', '0');
  });
});
