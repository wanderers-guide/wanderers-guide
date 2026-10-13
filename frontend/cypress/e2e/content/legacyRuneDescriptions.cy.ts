type RuneCatalogFixture = { table: string; row: { id: number; name: string; [key: string]: any } };

const runeFixtureScript = `
  import { readContentRows } from "./scripts/operation-test-harness.mjs";
  const rows = await readContentRows([
    ...[7090, 7950, 6961].map(id => ({ table: "item", id }))
  ]);
  rows.push(...await readContentRows([
    ...[...new Set(rows.flatMap(({row}) => row.traits ?? []))].map(id => ({table:"trait",id})),
    ...[...new Set(rows.map(({row}) => row.content_source_id))].map(id => ({table:"content_source",id}))
  ]));
  const host = rows.find(entry => entry.table === "item" && entry.row.id === 7090).row;
  const flaming = rows.find(entry => entry.table === "item" && entry.row.id === 6961).row;
  for (const [id, property] of [
    [990010, ["Shock", "Frost"]],
    [990011, ["Shock", { id: flaming.id, name: flaming.name, rune: flaming }, "Frost"]]
  ]) rows.push({ table: "item", row: { ...host, id, name: "Legacy rune verification", meta_data: {
    ...host.meta_data, runes: { potency: 1, property }
  } } });
  console.log(JSON.stringify(rows));
`;

describe('Legacy property rune descriptions', () => {
  let fixtures: RuneCatalogFixture[];
  before(() => {
    cy.exec(`node --input-type=module -e '${runeFixtureScript}'`, { log: false, timeout: 60000 }).then(({ stdout }) => {
      fixtures = JSON.parse(stdout);
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
        cy.get('@drawer').contains('Fundamental Runes').scrollIntoView().should('be.visible');
        cy.get('@drawer').contains('Weapon Potency (+1)').scrollIntoView().should('be.visible');
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
