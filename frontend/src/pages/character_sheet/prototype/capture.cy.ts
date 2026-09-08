/** Capture the current public sheet without permitting application writes. */
type CapturedControl = { label: string; role: string; x: number; y: number; width: number; height: number };
type CapturedScreen = { id: string; width: number; height: number; controls: CapturedControl[]; text: string };

const panels: { id: string; label: string }[] = [
  { id: 'skills', label: 'Skills & Actions' },
  { id: 'feats', label: 'Feats & Features' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'spells', label: 'Spells' },
  { id: 'notes', label: 'Notes' },
  { id: 'details', label: 'Details' },
  { id: 'companions', label: 'Companions' },
  { id: 'extras', label: 'Extras' },
];

describe('Current mobile sheet reference', () => {
  for (const width of [390, 430]) {
    it(`captures the existing ${width}px navigation`, () => {
      const screens: CapturedScreen[] = [];
      cy.viewport(width, 844);
      // All data endpoints use POST. Only read endpoints are allowed through.
      cy.intercept({ url: '**/functions/v1/**', middleware: true }, (request) => {
        const endpoint = new URL(request.url).pathname.split('/').at(-1) ?? '';
        if (/^(find-|get-content-versions$|get-user$|get-public-user$|search-data$)/.test(endpoint)) {
          request.continue();
        } else {
          request.reply({ statusCode: 403, body: { status: 'error', message: 'Read-only visual capture' } });
        }
      });
      if (width === 390) cy.visit('/sheet/142809');
      else {
        cy.get('button[aria-label="Panel Grid"]').click();
        cy.contains('button', 'Health, Attributes, Saves').click();
      }
      cy.contains('Kip', { timeout: 120000 }).should('be.visible');
      cy.get('button[aria-label="Panel Grid"]').should('be.visible');
      cy.document().then((doc) => doc.fonts.ready);

      /** Preserve rendered pixels and the visible controls needed for click-through hotspots. */
      const capture = (id: string): void => {
        if (!['overview-bottom', 'picker'].includes(id)) {
          cy.get('.mantine-ScrollArea-viewport').first().scrollTo('top', { ensureScrollable: false });
        }
        // Allow existing transitions to finish, so captures show settled states.
        cy.wait(400, { log: false });
        cy.document().then((doc) => {
          const controls = Array.from(
            doc.querySelectorAll<HTMLElement>('button, a, label[for], [role="tab"], input, [role="radio"]')
          )
            .map((element): CapturedControl => {
              const rect = element.getBoundingClientRect();
              return {
                label:
                  element.getAttribute('aria-label') || element.innerText || element.getAttribute('placeholder') || '',
                role: element.getAttribute('role') || element.tagName.toLowerCase(),
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height,
              };
            })
            .filter(
              (control) => control.width > 0 && control.height > 0 && control.y < 844 && control.y + control.height > 0
            );
          screens.push({ id, width, height: 844, controls, text: doc.body.innerText });
        });
        cy.screenshot(`${width}-${id}`, { capture: 'viewport', overwrite: true });
      };

      capture('overview');
      cy.get('.mantine-ScrollArea-viewport').first().scrollTo('bottom', { ensureScrollable: false });
      capture('overview-bottom');
      cy.get('.mantine-ScrollArea-viewport').first().scrollTo('top', { ensureScrollable: false });
      cy.get('button[aria-label="Panel Grid"]').click();
      capture('picker');
      cy.get('button[aria-label="Panel Grid"]').click();

      for (const panel of panels) {
        cy.get('button[aria-label="Panel Grid"]').click();
        cy.contains('button', panel.label).click();
        capture(panel.id);
        if (panel.id === 'skills') {
          cy.contains('[role="tab"]', 'Actions / Abilities').click();
          capture('actions');
        }
        if (panel.id === 'feats') {
          cy.contains('label', /^Features$/).click();
          capture('features');
        }
        if (panel.id === 'details') {
          cy.contains('[role="tab"]', 'Languages').click();
          capture('languages');
          cy.contains('[role="tab"]', 'Proficiencies').click();
          capture('proficiencies');
        }
      }
      cy.then(() => cy.writeFile(`src/pages/character_sheet/prototype/captures/${width}-screens.json`, screens));
    });
  }
});
