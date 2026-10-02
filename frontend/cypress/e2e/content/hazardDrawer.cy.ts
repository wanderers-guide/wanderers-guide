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
    1476, 1524, 1576, 1484, 1584, 1478, 1846, 1542, 1556,
  ]);
  rows.push(...await readContentRows([...traitIds].map(id => ({ table: "trait", id }))));
  rows.push(...entries.map((entry, index) => ({ table: "creature", row: {
    id: 911001 + index, uuid: entry.uuid, created_at: "2026-09-28T00:00:00Z",
    type: "hazard", name: entry.name, level: entry.level, rarity: "RARE",
    details: entry.details, content_source_id: 400, deprecated: false, version: "1.0",
    meta_data: { source: { book: "War of Immortals", page: entry.page, url: entry.url } },
  } })));
  // Canonical monster identities are sufficient for reference resolution, not creature calculation tests.
  const legends = JSON.parse((await readFile("../supabase/migrations/20260929020000_war_of_immortals_mythic_legends.sql", "utf8")).split("$entries$")[1]);
  const entities = JSON.parse((await readFile("../supabase/migrations/20260929030000_war_of_immortals_mythic_entities.sql", "utf8")).split("$entries$")[1]);
  rows.push(...[...legends, ...entities].filter(entry => ["Agyra", "Verex-That-Was", "Oliphaunt of Jandelay"].includes(entry.name)).map(entry => ({ table: "creature", row: {
    id: entry.uuid, uuid: entry.uuid, created_at: "2026-09-29T00:00:00Z", type: "creature", name: entry.name,
    level: entry.level, experience: 0, rarity: "UNIQUE", inventory: null, hp_current: entry.hp, hp_temp: 0,
    stamina_current: 0, resolve_current: 0, details: {
      description: entry.name + " reference fixture. [Agyra](link_creature_6892231756030293)",
    }, notes: null, roll_history: null, spells: null,
    operation_data: null, operations: [], abilities_base: [], abilities_added: null, content_source_id: 400,
    deprecated: false, version: "1.0", meta_data: { source: {
      book: "War of Immortals", page: entry.page, url: entry.url ?? "https://2e.aonprd.com/Monsters.aspx?ID=" + entry.aon_id,
    } },
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
  'spirit',
  'water',
  'primal',
  'vitality',
  'unholy',
  'agyra',
  'verex-that-was',
  'oliphaunt of jandelay',
];

const hazards = [
  { name: 'Boneburst', link: 'Spirit', target: 'Spirit', creature: 'Verex-That-Was' },
  { name: "Lightning's Dance", link: 'Strike', target: 'Strike', creature: 'Agyra' },
  { name: 'Primal Chaos Aura', link: 'gust of wind', target: 'Gust of Wind', creature: 'Agyra' },
  { name: 'Trump of the Oliphaunt', link: 'sonic', target: 'Sonic', creature: 'Oliphaunt of Jandelay' },
  { name: 'Wind Surge', link: 'Air', target: 'Air', creature: 'Agyra' },
];

/** Retry the same geometry bounds while the drawer's enter transition settles. */
function assertNoHorizontalOverflow() {
  cy.document().should((doc) => {
    expect(doc.documentElement.scrollWidth, 'page width').to.be.at.most(doc.documentElement.clientWidth);
  });
  cy.get('.mantine-Drawer-content, .mantine-Drawer-content .mantine-ScrollArea-viewport').should(($elements) => {
    $elements.each((_, element) => {
      expect(element.scrollWidth, `${element.className} width`).to.be.at.most(element.clientWidth + 1);
      expect(element.getBoundingClientRect().right, 'drawer inside viewport').to.be.at.most(
        element.ownerDocument.defaultView!.innerWidth + 1
      );
    });
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
      const table = endpoint.startsWith('find-') ? endpoint.slice(5).replaceAll('-', '_') : undefined;
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
        rows = rows.filter((row) => row.type === (body.type ?? 'creature'));
        if (body.type === 'hazard') {
          expect(body.content_sources).to.include(400);
          expect(rows).to.have.length(1);
          req.alias = 'hazardRead';
        }
      }
      req.reply({
        body: { status: 'success', data: endpoint === 'find-creature' && typeof body.id === 'number' ? rows[0] : rows },
      });
    });
  });

  for (const [screen, width, height] of [
    ['desktop', 1280, 720],
    ['mobile', 390, 740],
  ] as const) {
    for (const { name, link, target, creature } of hazards) {
      it(`renders ${name} and its reference navigation on ${screen}`, () => {
        const hazard = fixtures.find((fixture) => fixture.table === 'creature' && fixture.row.name === name)!.row;
        const details = hazard.details;
        const screenshotName = `hazard-${name.toLowerCase().replaceAll(' ', '-')}-${screen}`;
        cy.viewport(width, height);
        cy.visit(`/?open=link_hazard_${hazard.id}`);
        cy.wait('@hazardRead');
        cy.get('html').should('have.attr', 'data-mantine-color-scheme', 'dark');
        cy.get('.mantine-Drawer-content').should('have.length', 1).and('be.visible');
        cy.get('.mantine-Drawer-content')
          .contains('.mantine-Badge-label', new RegExp(`^${hazard.rarity}$`, 'i'), { timeout: 30000 })
          .should('exist');
        cy.get('.mantine-Drawer-header')
          .contains('p', new RegExp(`^Hazard ${hazard.level}$`), { timeout: 30000 })
          .should('be.visible');
        cy.get('.mantine-Drawer-content').then(($content) => {
          const header = $content[0].querySelector('.mantine-Drawer-header')!;
          const body = $content[0].querySelector('.mantine-Drawer-body')!;
          const level = [...header.querySelectorAll('p')].find(
            (element) => element.textContent === `Hazard ${hazard.level}`
          )!;
          const rarity = [...body.querySelectorAll('.mantine-Badge-label')].find(
            (element) => element.textContent?.toUpperCase() === hazard.rarity
          )!;
          const shrink = header.ownerDocument.defaultView!.getComputedStyle(header).flexShrink;
          cy.writeFile(
            `cypress/screenshots/hazardDrawer.cy.ts/${screenshotName}-header-${shrink === '0' ? 'fixed' : 'before'}.json`,
            {
              viewport: { width, height },
              header: header.getBoundingClientRect().toJSON(),
              body: body.getBoundingClientRect().toJSON(),
              level: level.getBoundingClientRect().toJSON(),
              rarity: rarity.getBoundingClientRect().toJSON(),
              headerFlexShrink: shrink,
            },
            { log: false }
          );
        });
        cy.get('.mantine-Drawer-content', { timeout: 30000 }).should(($content) => {
          const level = [...$content[0].querySelectorAll('.mantine-Drawer-header p')].find(
            (element) => element.textContent === `Hazard ${hazard.level}`
          );
          const rarity = [...$content[0].querySelectorAll('.mantine-Badge-label')].find(
            (element) => element.textContent?.toUpperCase() === hazard.rarity
          );
          expect(level, 'hazard level').to.exist;
          expect(rarity, 'rarity badge').to.exist;
          expect(rarity!.getBoundingClientRect().top, 'rarity starts below hazard level').to.be.at.least(
            level!.getBoundingClientRect().bottom - 1
          );
        });
        cy.get('.mantine-Drawer-content').within(() => {
          cy.contains('h3', name).should('be.visible');
          cy.contains(`Hazard ${hazard.level}`).should('be.visible');
          cy.get('.mantine-Badge-label', { timeout: 30000 })
            .contains(new RegExp(`^${hazard.rarity}$`, 'i'))
            .should('be.visible');
          cy.get('.mantine-Badge-label')
            .contains(new RegExp(`^${details.complexity}$`, 'i'))
            .should('be.visible');
          const traitNames = details.trait_ids.map(
            (id: number) => fixtures.find((fixture) => fixture.table === 'trait' && fixture.row.id === id)!.row.name
          );
          for (const traitName of [...traitNames, ...details.trait_labels]) {
            cy.get('.mantine-Badge-label')
              .contains(new RegExp(`^${traitName}$`, 'i'))
              .should('be.visible');
          }
          cy.contains('Stealth').should('be.visible');
          cy.contains(details.description).should('exist');
          cy.contains(details.disable).should('exist');
          cy.contains('Disable').should('exist');
          cy.contains(details.activation.name).should('exist');
          cy.contains('Trigger').should('exist');
          cy.contains('Effect').should('exist');
          if (details.routine) {
            cy.contains(
              `Routine (${details.routine.actions} ${details.routine.actions === 1 ? 'action' : 'actions'})`
            ).should('exist');
          } else {
            cy.contains(/^Routine \(/).should('not.exist');
          }
          if (details.reset) cy.contains('Reset').should('exist');
          else cy.contains(/^Reset$/).should('not.exist');
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
        if (name === 'Trump of the Oliphaunt') {
          cy.get('.mantine-Drawer-content a')
            .filter((_, element) => element.textContent === 'Oliphaunt')
            .should('have.length', 1)
            .and('not.have.attr', 'href');
        }
        if (name === "Lightning's Dance") {
          cy.get('.mantine-Drawer-content a')
            .filter((_, element) => /^(Strike|Strikes)$/.test(element.textContent ?? ''))
            .should('have.length', 2)
            .and('not.have.attr', 'href');
          cy.get('abbr.action-symbol').should('have.text', '1');
        }
        cy.get('.mantine-Drawer-content .mantine-ScrollArea-viewport').scrollTo('bottom');
        cy.get('.mantine-Drawer-content .mantine-ScrollArea-viewport').find('p').last().should('be.visible');
        if (details.reset) cy.get('.mantine-Drawer-content').contains('Reset').should('be.visible');
        cy.get('.mantine-Drawer-header').should(($header) => {
          expect(
            $header[0].getBoundingClientRect().top,
            'drawer header stays on screen while scrolling'
          ).to.be.at.least(0);
        });
        assertNoHorizontalOverflow();
        cy.screenshot(`${screenshotName}-routine`, { capture: 'viewport' });

        cy.get('.mantine-Drawer-content')
          .contains('a', new RegExp(`^${link}$`, 'i'))
          .scrollIntoView()
          .click();
        cy.get('.mantine-Drawer-content').contains('h3', target).should('be.visible');
        cy.get('button[aria-label="Go back to previous drawer"]').should('be.visible').click();
        cy.get('.mantine-Drawer-content').contains('h3', name).should('be.visible');
        for (const visit of [1, 2]) {
          cy.get('.mantine-Drawer-content').contains('a', creature).first().scrollIntoView();
          cy.get('.mantine-Drawer-content').contains('a', creature).first().click();
          cy.get('.mantine-Drawer-header')
            .contains('h3', new RegExp(`^${creature}$`, 'i'))
            .should('be.visible');
          cy.get('.mantine-Drawer-body').contains(/^AC$/, { timeout: 30000 }).should('be.visible');
          cy.get('.mantine-Drawer-body').contains(`${creature} reference fixture.`).should('exist');
          cy.get('[aria-label="Edit Creature"]').should('not.exist');
          assertNoHorizontalOverflow();
          cy.screenshot(`${screenshotName}-creature-reference-${visit}`, { capture: 'viewport' });
          if (name === 'Boneburst') {
            cy.get('.mantine-Drawer-body').contains('a', 'Agyra').scrollIntoView();
            cy.get('.mantine-Drawer-body').contains('a', 'Agyra').click();
            cy.get('.mantine-Drawer-header').contains('h3', 'Agyra').should('be.visible');
            cy.get('.mantine-Drawer-body').contains('Agyra reference fixture.', { timeout: 30000 }).should('exist');
            cy.get('.mantine-Drawer-body').contains(`${creature} reference fixture.`).should('not.exist');
            cy.get('button[aria-label="Go back to previous drawer"]').click();
            cy.get('.mantine-Drawer-header')
              .contains('h3', new RegExp(`^${creature}$`, 'i'))
              .should('be.visible');
            cy.get('.mantine-Drawer-body')
              .contains(`${creature} reference fixture.`, { timeout: 30000 })
              .should('exist');
            cy.get('.mantine-Drawer-body').contains('Agyra reference fixture.').should('not.exist');
          }
          cy.get('button[aria-label="Go back to previous drawer"]').should('be.visible').click();
          cy.get('.mantine-Drawer-content').contains('h3', name).should('be.visible');
        }
        cy.get('.mantine-Drawer-content .mantine-ScrollArea-viewport').scrollTo('bottom');
        cy.get('.mantine-Drawer-content .mantine-ScrollArea-viewport').find('p').last().should('be.visible');
        assertNoHorizontalOverflow();
        cy.get('button[aria-label="Close drawer"]').click();
        cy.get('.mantine-Drawer-content').should('not.exist');
      });
    }
  }
});
