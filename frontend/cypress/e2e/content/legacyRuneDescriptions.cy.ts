import { paginateAbilityFixture } from '../../support/content-pagination';

type RuneCatalogFixture = { table: string; row: { id: number; name: string; [key: string]: any } };

describe('Legacy property rune descriptions', () => {
  let fixtures: RuneCatalogFixture[];
  before(() => {
    cy.task<any>('contentFixture:runes', null, { log: false, timeout: 60000 }).then((rows) => {
      fixtures = rows;
    });
  });
  beforeEach(() => {
    cy.intercept('**/auth/v1/**', () => {
      throw new Error('Legacy rune verification must not authenticate or write user data');
    });
    cy.intercept('POST', '**/functions/v1/*', (request) => {
      const endpoint = new URL(request.url).pathname.split('/').pop()!;
      const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
      if (endpoint === 'get-content-versions') {
        request.reply({ body: { status: 'success', data: [] } });
        return;
      }
      expect(endpoint.startsWith('find-'), 'only read-only fixture calls').to.eq(true);
      const table = endpoint.slice(5).replaceAll('-', '_');
      let rows = fixtures.filter((fixture) => fixture.table === table).map(({ row }) => row);
      if (body.id !== undefined) {
        const ids = Array.isArray(body.id) ? body.id : [body.id];
        rows = rows.filter((row) => ids.includes(row.id));
      }
      if (body.name) rows = rows.filter((row) => row.name.toLowerCase() === body.name.toLowerCase());
      if (Array.isArray(body.content_sources))
        rows = rows.filter((row) => body.content_sources.includes(row.content_source_id));
      if (table === 'ability_block') rows = paginateAbilityFixture(rows, body);
      request.reply({ body: { status: 'success', data: rows } });
    });
  });

  for (const width of [390, 1280]) {
    for (const [kind, id, buttons] of [
      ['names', 990010, 1],
      ['mixed', 990011, 2],
    ] as const) {
      it(`renders ${kind} entries at ${width}px without inventing links for names`, () => {
        cy.viewport(width, 740);
        cy.visit(`/?open=link_item_${id}`);
        cy.contains('.mantine-Drawer-content', /Legacy Rune Verification/i, { timeout: 30000 }).as('drawer');
        cy.get('@drawer')
          .contains('button', /^Runes$/)
          .click();
        cy.get('@drawer').contains('Frost').scrollIntoView().should('be.visible');
        cy.get('@drawer').contains('Shock').scrollIntoView().should('be.visible');
        cy.get('@drawer').find('.mantine-ScrollArea-viewport').scrollTo('bottom');
        cy.get('@drawer').contains('Fundamental Runes').should('be.visible');
        cy.get('@drawer').contains('Weapon Potency (+1)').should('be.visible');
        cy.get('@drawer').find('button').filter(':contains("View Item")').should('have.length', buttons);
        cy.document().should((document) =>
          expect(document.documentElement.scrollWidth).to.be.at.most(document.documentElement.clientWidth)
        );
        cy.screenshot(`legacy-runes-${kind}-${width}`);
        if (kind === 'mixed') {
          cy.get('@drawer').contains('Flaming').scrollIntoView().should('be.visible');
          cy.get('@drawer').contains('button', 'View Item').first().click();
          cy.contains('.mantine-Drawer-content', 'Flaming', { timeout: 30000 }).should('be.visible');
        }
      });
    }
  }
});
