import { paginateAbilityFixture } from '../../support/content-pagination';

type RuneCatalogFixture = { table: string; row: { id: number; name: string; [key: string]: any } };

type RuneViewportMetrics = {
  clientHeight: number;
  scrollHeight: number;
  scrollTop: number;
  viewport: DOMRect;
  target: DOMRect;
};

/** Scrolls the label's actual drawer viewport, then verifies a freshly queried label. */
const scrollRuneLabelIntoView = (label: string): void => {
  cy.get('@drawer')
    .contains(label)
    .then(($target) => {
      const $viewport: JQuery<HTMLElement> = $target.closest('.mantine-ScrollArea-viewport');
      expect($viewport, `${label} owns one scroll viewport`).to.have.length(1);
      expect($viewport.closest('.mantine-Drawer-content'), `${label} viewport belongs to the drawer`).to.have.length(1);
      const viewport: HTMLElement = $viewport[0];
      const target: HTMLElement = $target[0];
      /** Captures geometry before and after the single explicit viewport scroll. */
      const measure = (): RuneViewportMetrics => ({
        clientHeight: viewport.clientHeight,
        scrollHeight: viewport.scrollHeight,
        scrollTop: viewport.scrollTop,
        viewport: viewport.getBoundingClientRect(),
        target: target.getBoundingClientRect(),
      });
      const before: RuneViewportMetrics = measure();
      const diagnostic: string = `${label}: ${JSON.stringify(before)}`;
      Cypress.log({ name: 'rune viewport before', message: diagnostic });
      for (const value of [
        before.clientHeight,
        before.scrollHeight,
        before.scrollTop,
        viewport.clientTop,
        before.viewport.top,
        before.viewport.width,
        before.viewport.height,
        before.target.top,
        before.target.width,
        before.target.height,
      ])
        expect(Number.isFinite(value), `finite geometry ${diagnostic}`).to.eq(true);
      expect(before.clientHeight, `positive viewport ${diagnostic}`).to.be.greaterThan(0);
      expect(before.scrollHeight, `complete scroll geometry ${diagnostic}`).to.be.at.least(before.clientHeight);
      expect(before.viewport.width, `positive viewport width ${diagnostic}`).to.be.greaterThan(0);
      expect(before.viewport.height, `positive viewport height ${diagnostic}`).to.be.greaterThan(0);
      expect(before.target.width, `positive target width ${diagnostic}`).to.be.greaterThan(0);
      expect(before.target.height, `positive target height ${diagnostic}`).to.be.greaterThan(0);
      expect(before.target.height, `label fits viewport ${diagnostic}`).to.be.at.most(before.clientHeight);
      const targetTop: number = before.scrollTop + before.target.top - before.viewport.top - viewport.clientTop;
      expect(targetTop, `target inside scroll content ${diagnostic}`).to.be.at.least(0);
      expect(targetTop + before.target.height, `target inside scroll extent ${diagnostic}`).to.be.at.most(
        before.scrollHeight
      );
      const destination: number = Math.max(
        0,
        Math.min(
          targetTop - (before.clientHeight - before.target.height) / 2,
          before.scrollHeight - before.clientHeight
        )
      );
      return cy
        .wrap($viewport)
        .scrollTo(0, destination, { ensureScrollable: false })
        .then(() => {
          const after: RuneViewportMetrics = measure();
          const diagnostic: string = `${label}: ${JSON.stringify(after)}`;
          Cypress.log({ name: 'rune viewport after', message: diagnostic });
          expect(after.clientHeight, `positive scrolled viewport ${diagnostic}`).to.be.greaterThan(0);
          expect(after.target.top, `label below viewport top ${diagnostic}`).to.be.at.least(
            after.viewport.top + viewport.clientTop
          );
          expect(after.target.bottom, `label above viewport bottom ${diagnostic}`).to.be.at.most(
            after.viewport.top + viewport.clientTop + after.clientHeight
          );
        });
    });
  cy.get('@drawer').contains(label).should('be.visible');
};

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
        scrollRuneLabelIntoView('Frost');
        scrollRuneLabelIntoView('Shock');
        scrollRuneLabelIntoView('Fundamental Runes');
        scrollRuneLabelIntoView('Weapon Potency (+1)');
        cy.get('@drawer').find('button').filter(':contains("View Item")').should('have.length', buttons);
        cy.document().should((document) =>
          expect(document.documentElement.scrollWidth).to.be.at.most(document.documentElement.clientWidth)
        );
        cy.screenshot(`legacy-runes-${kind}-${width}`);
        if (kind === 'mixed') {
          scrollRuneLabelIntoView('Flaming');
          cy.get('@drawer').contains('button', 'View Item').first().click();
          cy.contains('.mantine-Drawer-content', 'Flaming', { timeout: 30000 }).should('be.visible');
        }
      });
    }
  }
});
