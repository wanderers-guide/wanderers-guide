type CatalogRow = { id: number; name: string; content_source_id?: number; [key: string]: any };
type CatalogFixture = { table: string; row: CatalogRow };

const fixtureScript = `
  import { readFile } from "node:fs/promises";
  import { readContentRows } from "./scripts/operation-test-harness.mjs";
  const migration = await readFile("../supabase/migrations/20260928020000_war_of_immortals_hazards.sql", "utf8");
  const entries = JSON.parse(migration.split("$entries$")[1]);
  const rows = await readContentRows([
    ...[1, 3, 400].map(id => ({ table: "content_source", id })),
    ...[4414, 4851, 4650, 4668, 4899, 4830].map(id => ({ table: "spell", id })),
    ...[19721, 19856].map(id => ({ table: "ability_block", id })),
  ]);
  const traitIds = new Set([
    ...entries.flatMap(entry => entry.details.trait_ids),
    ...rows.flatMap(({ row }) => row.traits ?? []),
    1476, 1524, 1576, 1484, 1584, 1478, 1846, 1542,
  ]);
  rows.push(...await readContentRows([...traitIds].map(id => ({ table: "trait", id }))));
  rows.push(...entries.map((entry, index) => ({ table: "creature", row: {
    id: 911001 + index, uuid: entry.uuid, created_at: "2026-09-28T00:00:00Z",
    type: "hazard", name: entry.name, level: entry.level, rarity: "RARE",
    details: entry.details, content_source_id: 400, deprecated: false, version: "1.0",
    meta_data: { source: { book: "War of Immortals", page: entry.page, url: entry.url } },
  } })));
  console.log(JSON.stringify(rows));
`;

const referenceNames = [
  'gust of wind',
  'thunderstrike',
  'blazing bolt',
  'spider sting',
  'shatter',
  'hydraulic push',
  'air',
  'electricity',
  'fire',
  'poison',
  'sonic',
  'water',
  'primal',
  'vitality',
  'unholy',
];

function assertNoHorizontalOverflow() {
  cy.document().then((doc) => {
    expect(doc.documentElement.scrollWidth, 'page width').to.be.at.most(doc.documentElement.clientWidth);
  });
  cy.get('.mantine-Drawer-content, .mantine-Drawer-content .mantine-ScrollArea-viewport').each(($element) => {
    const element = $element[0];
    expect(element.scrollWidth, `${element.className} width`).to.be.at.most(element.clientWidth + 1);
    expect(element.getBoundingClientRect().right, 'drawer inside viewport').to.be.at.most(
      element.ownerDocument.defaultView!.innerWidth + 1
    );
  });
}

describe('Official hazard drawer', () => {
  let fixtures: CatalogFixture[];

  before(() => {
    // Read real book rules and canonical references without creating users or touching a database.
    cy.exec(`node --input-type=module -e '${fixtureScript}'`, { log: false, timeout: 60000 }).then(({ stdout }) => {
      fixtures = JSON.parse(stdout);
    });
  });

  beforeEach(() => {
    cy.intercept('**/auth/v1/**', () => {
      throw new Error('Hazard catalog smoke must not authenticate or write user data');
    });
    cy.intercept('POST', '**/functions/v1/*', (req) => {
      const endpoint = new URL(req.url).pathname.split('/').pop()!;
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (endpoint === 'get-content-versions') {
        req.reply({ body: { status: 'success', data: [] } });
        return;
      }
      const table = {
        'find-content-source': 'content_source',
        'find-creature': 'creature',
        'find-trait': 'trait',
        'find-spell': 'spell',
        'find-ability-block': 'ability_block',
      }[endpoint];
      expect(table, `read-only fixture endpoint ${endpoint}`).to.be.a('string');
      let rows = fixtures.filter((fixture) => fixture.table === table).map(({ row }) => row);
      if (body.id !== undefined) {
        const ids = Array.isArray(body.id) ? body.id : [body.id];
        rows = rows.filter((row) => ids.includes(row.id));
      }
      if (body.name) rows = rows.filter((row) => row.name.toLowerCase() === body.name.toLowerCase());
      if (Array.isArray(body.content_sources)) {
        rows = rows.filter((row) => body.content_sources.includes(row.content_source_id));
      }
      if (endpoint === 'find-creature') {
        expect(body.type).to.eq('hazard');
        expect(body.content_sources).to.include(400);
        expect(rows).to.have.length(1);
        req.alias = 'hazardRead';
      }
      req.reply({ body: { status: 'success', data: endpoint === 'find-creature' ? rows[0] : rows } });
    });
  });

  for (const [screen, width, height] of [
    ['desktop', 1280, 720],
    ['mobile', 390, 740],
  ] as const) {
    for (const name of ['Boneburst', 'Primal Chaos Aura']) {
      it(`renders ${name} and its reference navigation on ${screen}`, () => {
        const hazard = fixtures.find((fixture) => fixture.table === 'creature' && fixture.row.name === name)!.row;
        const details = hazard.details;
        const screenshotName = `hazard-${name.toLowerCase().replaceAll(' ', '-')}-${screen}`;
        cy.viewport(width, height);
        cy.visit(`/?open=link_hazard_${hazard.id}`);
        cy.wait('@hazardRead');
        cy.get('html').should('have.attr', 'data-mantine-color-scheme', 'dark');
        cy.get('.mantine-Drawer-content').should('have.length', 1).and('be.visible');
        cy.get('.mantine-Drawer-content').within(() => {
          cy.contains('h3', name).should('be.visible');
          cy.contains(`Hazard ${hazard.level}`).should('be.visible');
          cy.contains('Rare', { timeout: 30000 }).should('be.visible');
          cy.contains('Complex').should('be.visible');
          cy.contains('Magical').should('be.visible');
          cy.contains('Stealth').should('be.visible');
          cy.contains('Disable').should('exist');
          cy.contains(details.activation.name).should('exist');
          cy.contains('Trigger').should('exist');
          cy.contains('Effect').should('exist');
          cy.contains(`Routine (${details.routine.actions} actions)`).should('exist');
          cy.contains('Reset').should('exist');
          cy.get('input, textarea, [contenteditable="true"]').should('not.exist');
          cy.contains('button', /edit creature|save creature/i).should('not.exist');
          cy.contains('Perception').should('not.exist');
          cy.contains('Speed').should('not.exist');
          if (details.defenses) {
            cy.contains(
              `AC ${details.defenses.ac}; Fort +${details.defenses.fort}; Ref +${details.defenses.ref}`
            ).should('exist');
            cy.contains(
              `Hardness ${details.defenses.hardness}; HP ${details.defenses.hp} (BT ${details.defenses.bt})`
            ).should('exist');
            cy.contains(details.defenses.immunities).should('exist');
          }
          cy.get('[style*="ActionIcons"]').should('have.length.at.least', 1).first().should('have.text', '5');
        });
        assertNoHorizontalOverflow();
        cy.screenshot(`${screenshotName}-top`, { capture: 'viewport' });

        const prose = JSON.stringify(details);
        for (const reference of referenceNames) {
          const expectedOccurrences = prose.match(new RegExp(`\\b${reference}\\b`, 'gi'))?.length ?? 0;
          if (!expectedOccurrences) continue;
          cy.get('.mantine-Drawer-content a', { timeout: 30000 })
            .filter((_, element) => element.textContent?.toLowerCase() === reference, { timeout: 30000 })
            .should('have.length', expectedOccurrences)
            .and('not.have.attr', 'href');
        }
        if (name === 'Boneburst') {
          cy.get('.mantine-Drawer-content a')
            .filter((_, element) => /^(Fly|Flies)$/.test(element.textContent ?? ''))
            .should('have.length', 2)
            .and('not.have.attr', 'href');
        }
        cy.get('.mantine-Drawer-content .mantine-ScrollArea-viewport').scrollTo('bottom');
        cy.get('.mantine-Drawer-content').contains('Reset').should('be.visible');
        cy.get('.mantine-Drawer-header').should(($header) => {
          expect(
            $header[0].getBoundingClientRect().top,
            'drawer header stays on screen while scrolling'
          ).to.be.at.least(0);
        });
        assertNoHorizontalOverflow();
        cy.screenshot(`${screenshotName}-routine`, { capture: 'viewport' });

        const linkName = name === 'Boneburst' ? 'Fly' : 'gust of wind';
        const targetTitle = name === 'Boneburst' ? 'Fly' : 'Gust of Wind';
        cy.get('.mantine-Drawer-content')
          .contains('a', new RegExp(`^${linkName}$`, 'i'))
          .scrollIntoView()
          .click();
        cy.get('.mantine-Drawer-content').contains('h3', targetTitle).should('be.visible');
        cy.get('button[aria-label="Go back to previous drawer"]').should('be.visible').click();
        cy.get('.mantine-Drawer-content').contains('h3', name).should('be.visible');
        cy.get('.mantine-Drawer-content').contains('Reset').scrollIntoView().should('be.visible');
        assertNoHorizontalOverflow();
        cy.get('button[aria-label="Close drawer"]').click();
        cy.get('.mantine-Drawer-content').should('not.exist');
      });
    }
  }
});
