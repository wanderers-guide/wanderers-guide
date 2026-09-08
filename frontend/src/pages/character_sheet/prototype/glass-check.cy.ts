/** Rendered checks of width, overflow, local interactions and text contrast over extreme backdrops. */
export {};

import { contrastOf } from './study-check-helpers';

describe('Glass material study', () => {
  const contrastSamples: { variant: string; width: number; screen: string; backdrop: string; minimum: number }[] = [];
  after(() => cy.writeFile('../.scratch/mobile-sheet-ui/glass-contrast.json', contrastSamples));
  for (const width of [390, 430]) {
    for (const variant of ['smoked', 'unified', 'frosted']) {
      it(`${variant} at ${width}px stays readable and supports sample interactions`, () => {
        cy.viewport(width, 1100);
        cy.intercept('**/functions/v1/**', () => {
          throw new Error('Prototype must not call the application API');
        });
        cy.visit(`/?view=${variant}`);
        cy.contains('label', String(width)).click();
        cy.document().then((doc) => doc.fonts.ready);
        cy.get('.sheet-portrait').should(($image) =>
          expect(($image[0] as HTMLImageElement).naturalWidth).to.be.greaterThan(0)
        );
        cy.document().then((doc) => expect(doc.documentElement.scrollWidth).to.be.at.most(width));
        // Desktop browser scrollbars occupy space. Give the fixed phone frame room, then verify its actual width.
        cy.viewport(width + 30, 1100);
        cy.get('.glass-phone').should(($phone) => expect($phone[0].getBoundingClientRect().width).to.equal(width));
        cy.get('.glass-phone').screenshot(`${width}-${variant}-overview`, { overwrite: true });
        cy.get('[aria-label="Hero point 3"]').click().should('have.attr', 'aria-pressed', 'true');

        for (const backdrop of ['White', 'Black']) {
          cy.contains('label', backdrop).click();
          cy.window().then((win) => {
            const measured = [
              ...win.document.querySelectorAll(
                '.sheet-identity-text p, .sheet-health h4, .sheet-health-value span, .sheet-stat-row, .sheet-rank, .sheet-awareness .sheet-muted, .sheet-star'
              ),
            ].map((element) => contrastOf(element, win));
            expect(Math.min(...measured), `${variant} overview text and accent contrast on ${backdrop}`).to.be.at.least(
              4.5
            );
            cy.log(`Minimum sampled contrast: ${Math.min(...measured).toFixed(2)}:1`);
            contrastSamples.push({ variant, width, screen: 'overview', backdrop, minimum: Math.min(...measured) });
          });
        }

        cy.contains('label', 'Artwork').click();
        cy.get('[aria-label="Panel grid"]').click();
        cy.get('.sheet-picker').should('be.visible');
        cy.get('.sheet-picker-option').first().should('be.focused');
        cy.get('.sheet-picker').screenshot(`${width}-${variant}-menu`, { overwrite: true });
        cy.contains('button', 'Skills & Actions').click();
        cy.get('.sheet-picker').should('not.exist');
        cy.get('.sheet-input').type('lore');
        cy.get('.sheet-skill-row').should('have.length', 2);
        cy.get('.sheet-input').clear();
        cy.get('.glass-phone').screenshot(`${width}-${variant}-skills`, { overwrite: true });
        cy.get('[role="combobox"][aria-label="Sample screen"]').click().clear().type('Spells');
        cy.contains('[role="option"]', /^Spells$/).click({ scrollBehavior: false });
        cy.get('[aria-label="Rank 1 slot 2 used"]').check();
        cy.contains('2 of 4 slots used').should('be.visible');
        cy.get('.glass-phone').screenshot(`${width}-${variant}-spells`, { overwrite: true });
        for (const backdrop of ['White', 'Black']) {
          cy.contains('label', backdrop).click();
          cy.window().then((win) => {
            const measured = [
              ...win.document.querySelectorAll(
                '.sheet-spell-section h4, .sheet-spell-section p, .sheet-spell-row span, .sheet-casting span'
              ),
            ].map((element) => contrastOf(element, win));
            expect(Math.min(...measured), `${variant} spell text contrast on ${backdrop}`).to.be.at.least(4.5);
            contrastSamples.push({ variant, width, screen: 'spells', backdrop, minimum: Math.min(...measured) });
          });
        }
        cy.get('.sheet-viewport').should(($viewport) =>
          expect($viewport[0].scrollWidth).to.be.at.most($viewport[0].clientWidth)
        );
      });
    }
  }

  it('shows three concepts together and preserves the captured current UI', () => {
    cy.viewport(1440, 1350);
    cy.visit('/?view=compare');
    cy.document().then((doc) => doc.fonts.ready);
    cy.get('.glass-phone').should('have.length', 3);
    cy.get('.glass-phone').each(($phone) => expect($phone[0].getBoundingClientRect().width).to.equal(390));
    cy.screenshot('three-glass-concepts', { capture: 'fullPage', overwrite: true });
    cy.contains('[role="tab"]', 'Current UI').click();
    cy.get('.prototype-phone img').should('be.visible');
    cy.get('.prototype-phone [aria-label="Panel Grid"]').click();
    cy.get('.prototype-phone [aria-label="Spells"]').click();
    cy.get('.prototype-phone img').should('have.attr', 'alt').and('include', 'Spells');
  });
});
