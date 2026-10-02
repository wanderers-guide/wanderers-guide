import { Item, ItemSchema } from '../../../src/schemas/content';

/** Measure real inventory columns across different action counts and responsive widths. */
describe('Inventory alignment', () => {
  let fixture: { key: string; gm: { email: string; password: string } };
  let characterId: number;
  const staffName = 'Invested staff with an unusually long inventory name';

  before(() => {
    cy.task<typeof fixture>('campaignFixture:create', null, { log: false }).then((created) => {
      fixture = created;
      cy.intercept('POST', '**/auth/v1/token*').as('signIn');
      cy.login(created.gm.email, created.gm.password);
      cy.wait('@signIn').then(({ response }) => {
        const token: string = response?.body.access_token;
        const call = (endpoint: string, body: Record<string, unknown>): Cypress.Chainable<any> =>
          cy
            .request({
              method: 'POST',
              url: `${Cypress.env('functions_url')}/${endpoint}`,
              headers: { Authorization: `Bearer ${token}` },
              body,
              log: false,
            })
            .then(({ body }) => {
              expect(body.status).to.eq('success');
              return body.data;
            });
        call('find-item', { content_sources: [1, 3] }).then((rows) => {
          const names = ['Arrows', 'Spear', 'Rope (50 ft.)', 'Backpack'];
          const items: Item[] = rows
            .filter((entry: { name: string }) => names.includes(entry.name))
            // Use current PF2e groups and omit unused legacy Starfinder fields in this synthetic fixture.
            .map((entry: Item) =>
              ItemSchema.parse({
                ...entry,
                group: entry.name === 'Spear' ? 'WEAPON' : 'GENERAL',
                meta_data: { ...entry.meta_data, starfinder: undefined },
              })
            );
          const item = (name: string): Item => {
            const found = items.find((entry) => entry.name === name);
            expect(found, `seeded item ${name}`).to.exist;
            return structuredClone(found!);
          };
          const entry = (item: Item, invested = false) => ({
            id: `alignment-${item.id}-${item.name}`,
            item,
            is_formula: false,
            is_equipped: false,
            is_invested: invested,
            is_implanted: false,
            container_contents: [],
          });
          const arrows = item('Arrows');
          arrows.meta_data = { ...arrows.meta_data, bulk: arrows.meta_data?.bulk ?? {}, quantity: 20 };
          const spear = item('Spear');
          spear.name = '+2 striking spear';
          spear.meta_data = {
            ...spear.meta_data,
            bulk: spear.meta_data?.bulk ?? {},
            runes: { potency: 2, striking: 1, property: [] },
          };
          spear.price = { gp: 1000 };
          const staff = structuredClone(spear);
          staff.name = staffName;
          staff.traits = [...(staff.traits ?? []), 1527];
          const rope = item('Rope (50 ft.)');
          const backpack = { ...entry(item('Backpack')), container_contents: [entry(rope)] };
          const coins = { cp: 1, sp: 2, gp: 3, pp: 4 };
          call('create-character', {
            name: 'Inventory alignment verification',
            level: 1,
            hp_current: 10,
            details: { conditions: [] },
            options: { is_public: true },
            content_sources: { enabled: [1, 3] },
            inventory: { coins, items: [entry(arrows), entry(spear), entry(staff, true), backpack, entry(rope)] },
            companions: {
              list: [
                {
                  id: 1,
                  name: 'Beast Eidolon',
                  level: 1,
                  abilities_added: [],
                  abilities_base: [],
                  operation_data: {},
                  details: {},
                  meta_data: { reset_hp: false },
                  inventory: { coins, items: [] },
                  operations: [{ id: 'eidolon-trait', type: 'giveTrait', data: { traitId: 2937 } }],
                },
              ],
            },
            meta_data: { reset_hp: false },
          }).then((character) => {
            characterId = character.id;
          });
        });
      });
    });
  });

  after(() => {
    if (fixture) cy.task('campaignFixture:cleanup', fixture.key, { log: false });
  });

  for (const width of [1280, 900, 750, 390]) {
    it(`keeps item columns aligned and controls inside their rows at ${width}px`, () => {
      cy.viewport(width, 900);
      cy.visit(`/sheet/${characterId}`);
      cy.contains('Hit Points', { timeout: 30000 }).should('be.visible');
      if (width < 576) {
        cy.get('button[aria-label="Panel Grid"]', { timeout: 30000 }).should('be.visible').click();
        cy.contains('button', /^Inventory$/)
          .should('be.visible')
          .click();
      } else
        cy.contains('[role="tab"]', /^Inventory$/)
          .should('be.visible')
          .click();
      cy.get('button[aria-label="View Arrows"]', { timeout: 30000 }).should('be.visible');
      cy.get('button[aria-label="View ' + staffName + '"]')
        .closest('.mantine-Grid-root')
        .as('staffRow');
      cy.get('@staffRow').contains('button', 'Share runes', { timeout: 30000 }).should('be.visible');

      if (width >= 576) {
        cy.contains('p', /^Qty$/)
          .closest('.mantine-Grid-root')
          .then(($header) => {
            const cells = (grid: Element): DOMRect[] =>
              Array.from(grid.querySelector(':scope > .mantine-Grid-inner')!.children)
                .filter((cell) => cell.classList.contains('mantine-Grid-col'))
                .map((cell) => cell.getBoundingClientRect());
            const headings = cells($header[0]);
            for (const name of ['Arrows', '+2 striking spear', staffName, 'Rope (50 ft.)']) {
              cy.get(`button[aria-label="View ${name}"]`)
                .filter(':visible')
                .closest('.mantine-Grid-root')
                .then(($row) => {
                  const values = cells($row[0].querySelector('.mantine-Grid-root')!);
                  expect(values).to.have.length(3);
                  values.forEach((value, index) => {
                    expect(value.left, `${name} column ${index} position`).to.be.closeTo(headings[index].left, 1);
                    expect(value.width, `${name} column ${index} width`).to.be.closeTo(headings[index].width, 1);
                  });
                });
            }
          });
        cy.get('button[aria-label="View Arrows"]').closest('.mantine-Grid-root').should('contain.text', '20');
      } else {
        cy.contains('p', /^Qty$/).should('not.exist');
      }

      cy.get('@staffRow').then(($row) => {
        const row = $row[0].getBoundingClientRect();
        for (const button of $row[0].querySelectorAll('button')) {
          const bounds = button.getBoundingClientRect();
          expect(bounds.left, 'button stays inside row').to.be.at.least(row.left - 1);
          expect(bounds.right, 'button stays inside row').to.be.at.most(row.right + 1);
        }
      });
      cy.contains('button', /^Backpack$/).click();
      cy.get('button[aria-label="View Rope (50 ft.)"]:visible').should('have.length', 2);
      cy.document().then((doc) => {
        expect(doc.documentElement.scrollWidth).to.be.at.most(doc.documentElement.clientWidth);
      });
      cy.get('input[placeholder="Search items"]')
        .closest('.mantine-Stack-root')
        .then(($inventory) =>
          expect($inventory[0].querySelector('button button'), 'no nested item controls').to.eq(null)
        );
      cy.screenshot(`inventory-aligned-${width}px`);
    });
  }
});
