/** Expanded panel and editor checks for the isolated smoked-glass study. */
import { contrastOf } from './study-check-helpers';

describe('Expanded smoked sheet', () => {
  const contrastSamples: { variant: string; width: number; screen: string; backdrop: string; minimum: number }[] = [];
  after(() => cy.writeFile('../.scratch/mobile-sheet-ui/smoked-contrast.json', contrastSamples));
  for (const width of [390, 430]) {
    it(`covers every smoked panel and local editor at ${width}px`, () => {
      cy.viewport(width + 30, 1100);
      cy.intercept('**/functions/v1/**', () => {
        throw new Error('No application requests are permitted');
      });
      cy.visit('/?view=smoked');
      cy.contains('label', String(width)).click();
      cy.document().then((doc) => doc.fonts.ready);
      const choose = (label: string): void => {
        cy.get('[role="combobox"][aria-label="Sample screen"]').click().clear().type(label);
        cy.get('[role="option"]')
          .filter((_, element) => element.textContent === label)
          .click({ scrollBehavior: false });
      };
      const screens = [
        ['skills', 'Skills'],
        ['actions', 'Actions / Abilities'],
        ['feats', 'Feats'],
        ['features', 'Features'],
        ['inventory', 'Inventory'],
        ['spells', 'Spells'],
        ['notes', 'Notes'],
        ['details', 'Details / Information'],
        ['languages', 'Languages'],
        ['proficiencies', 'Proficiencies'],
        ['companions', 'Companions'],
        ['extras', 'Extras'],
      ];
      for (const [id, label] of screens) {
        choose(label);
        cy.location('search').should('include', `screen=${id}`);
        cy.get('.sheet-panel').should('be.visible');
        cy.get('.sheet-viewport').scrollTo('top', { ensureScrollable: false });
        cy.get('.glass-phone').screenshot(`${width}-smoked-${id}-expanded`, { overwrite: true });
        cy.get('.sheet-viewport').should(($viewport) =>
          expect($viewport[0].scrollWidth).to.be.at.most($viewport[0].clientWidth)
        );
        for (const backdrop of ['White', 'Black']) {
          cy.contains('label', backdrop).click();
          cy.window().then((win) => {
            const elements = [
              ...win.document.querySelectorAll(
                '.sheet-entry-name, .sheet-entry-meta, .sheet-field input, .sheet-field textarea, .sheet-field label, .sheet-tabs .mantine-Tabs-tab, .sheet-editor .tiptap p, .sheet-groups .mantine-Accordion-label, .sheet-count, .sheet-proficiency-row p, .sheet-companion-card p, .sheet-panel > p, .sheet-panel h4'
              ),
            ].filter((element) => element.getClientRects().length > 0);
            const measured = elements.map((element) => contrastOf(element, win));
            expect(measured.length, `${id} has sampled text`).to.be.greaterThan(0);
            expect(Math.min(...measured), `${id} on ${backdrop}`).to.be.at.least(4.5);
            contrastSamples.push({ variant: 'smoked', width, screen: id, backdrop, minimum: Math.min(...measured) });
          });
        }
        cy.contains('label', 'Artwork').click();
      }
      choose('Inventory');
      cy.get('[aria-label="Unequip Bastard Sword"]').click();
      cy.get('[aria-label="Equip Bastard Sword"]').should('be.visible');
      cy.get('[role="dialog"]').should('not.exist');
      cy.contains('.sheet-entry', 'Bastard Sword').click();
      cy.get('[role="dialog"]').should('contain', 'hand-and-a-half sword');
      cy.get('.glass-phone').screenshot(`${width}-smoked-item-detail`, { overwrite: true });
      cy.get('[aria-label="Close details"]').type('{esc}');
      cy.get('[role="dialog"]').should('not.exist');
      cy.contains('.sheet-entry', 'Bastard Sword').should('be.focused');
      choose('Feats');
      cy.get('[aria-label="Search feats & features"]').type('spellcasting');
      cy.contains('.sheet-entry', 'Oracle Spellcasting').should('be.visible');
      cy.get('[aria-label="Search feats & features"]').clear();
      cy.contains('.sheet-entry', 'Impressive Performance').click();
      cy.get('[role="dialog"]').should('contain', 'Your performances inspire admiration');
      cy.get('.glass-phone').screenshot(`${width}-smoked-feat-detail`, { overwrite: true });
      cy.get('[aria-label="Close details"]').click();
      choose('Notes');
      cy.get('[aria-label="Note text"]').type('{end} Remember the map.');
      cy.get('[aria-label="Page settings"]').click();
      cy.contains('label', 'Page title')
        .invoke('attr', 'for')
        .then((id) => cy.get(`[id="${id}"]`).clear().type('Road journal'));
      cy.contains('button', /^Done$/).click();
      choose('Details / Information');
      cy.contains('label', /^Appearance$/)
        .invoke('attr', 'for')
        .then((id) => cy.get(`[id="${id}"]`).type('A well-worn cloak.'));
      choose('Notes');
      cy.get('[role="combobox"][aria-label="Note page"]').should('have.value', 'Road journal');
      cy.get('[aria-label="Note text"]').should('contain', 'Remember the map.');
      choose('Details / Information');
      cy.get('textarea').first().should('have.value', 'A well-worn cloak.');
      choose('Companions');
      cy.get('[aria-label="Remove companion"]').click();
      cy.contains('button', /^Cancel$/).click();
      cy.contains('Badger').should('be.visible');
      cy.get('[aria-label="Remove companion"]').click();
      cy.contains('button', /^Remove$/).click();
      cy.contains('No companions.').should('be.visible');
      cy.get('.glass-phone').screenshot(`${width}-smoked-companions-empty`, { overwrite: true });
      cy.contains('button', 'Add Companion').click();
      cy.contains('Badger').should('be.visible');
      cy.get('[aria-label="Panel grid"]').click();
      cy.get('.sheet-picker-option').should('have.length', 9).and('not.have.attr', 'aria-expanded');
      cy.get('.sheet-picker-option[aria-current="page"]').should('contain', 'Companions');
      cy.get('.sheet-picker-grid').find('.tabler-icon-chevron-down').should('not.exist');
      cy.get('.glass-phone').screenshot(`${width}-smoked-destination-buttons`, { overwrite: true });
      cy.get('[aria-label="Close panels"]').click();
      cy.viewport(width, 1100);
      cy.document().then((doc) => expect(doc.documentElement.scrollWidth).to.be.at.most(width));
    });
  }
  it('compares matching current and proposed panels', () => {
    cy.viewport(1440, 1350);
    cy.visit('/?view=before-after&screen=inventory');
    cy.get('.study-baseline-image').should('have.attr', 'alt').and('include', 'inventory');
    cy.get('.glass-phone').should('contain', 'Spring-Loaded Net Launcher');
    cy.get('[role="combobox"][aria-label="Sample screen"]').click().clear().type('Feats');
    cy.contains('[role="option"]', /^Feats$/).click({ scrollBehavior: false });
    cy.get('.study-baseline-image').should('have.attr', 'alt').and('include', 'feats');
    cy.screenshot('smoked-feats-before-after', { capture: 'fullPage', overwrite: true });
    cy.contains('[role="tab"]', 'Frosted light').click();
    cy.get('.glass-phone').screenshot('frosted-feats-expanded', { overwrite: true });
    cy.contains('[role="tab"]', 'Unified glass').click();
    cy.get('.glass-phone').screenshot('unified-feats-expanded', { overwrite: true });
  });
});
