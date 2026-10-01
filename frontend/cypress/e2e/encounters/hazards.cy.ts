export {};

type Row = { id: number; name: string; content_source_id?: number; [key: string]: any };
type Fixture = { table: string; row: Row };
const fixtureScript = `
  import { readFile } from "node:fs/promises";
  import { readContentRows } from "./scripts/operation-test-harness.mjs";
  const entries = JSON.parse((await readFile("../supabase/migrations/20260928020000_war_of_immortals_hazards.sql", "utf8")).split("$entries$")[1]);
  const rows = await readContentRows([
    ...[1, 3, 400].map(id => ({table: "content_source", id})),
    ...[4414, 4851, 4650, 4668, 4899, 4830].map(id => ({table: "spell", id})),
    ...[19721, 19856].map(id => ({table: "ability_block", id})),
  ]);
  const traits = new Set([...entries.flatMap(entry => entry.details.trait_ids), ...rows.flatMap(({row}) => row.traits ?? [])]);
  rows.push(...await readContentRows([...traits].map(id => ({table: "trait", id}))));
  rows.push(...entries.map((entry, index) => ({table: "creature", row: {
    id: 911001 + index, uuid: entry.uuid, created_at: "2026-09-28T00:00:00Z", type: "hazard",
    name: entry.name, level: entry.level, rarity: "RARE", details: entry.details,
    content_source_id: 400, deprecated: false, version: "1.0",
    meta_data: {source: {book: "War of Immortals", page: entry.page, url: entry.url}},
  }})));
  console.log(JSON.stringify(rows));
`;
const actor = '00000000-0000-4000-8000-000000000001';
const creature = {
  id: 920001,
  created_at: '',
  name: 'Encounter Creature',
  level: 7,
  experience: 0,
  rarity: 'COMMON',
  inventory: null,
  hp_current: 60,
  hp_temp: 0,
  stamina_current: 0,
  resolve_current: 0,
  details: { description: '' },
  notes: null,
  roll_history: null,
  spells: null,
  operation_data: null,
  operations: null,
  abilities_base: null,
  abilities_added: null,
  meta_data: null,
  content_source_id: 400,
  deprecated: false,
  version: '1.0',
};

describe('Hazard encounter controls', () => {
  let fixtures: Fixture[];
  let saved: any;
  before(() =>
    cy.exec(`node --input-type=module -e '${fixtureScript}'`, { log: false, timeout: 60000 }).then(({ stdout }) => {
      fixtures = JSON.parse(stdout);
    })
  );
  beforeEach(() => {
    saved = {
      id: 910001,
      created_at: '',
      user_id: actor,
      name: 'Mixed Encounter',
      icon: 'combat',
      color: '#228be6',
      campaign_id: null,
      combatants: { list: [{ _id: 'existing-creature', type: 'CREATURE', ally: false, initiative: 22, creature }] },
      meta_data: { party_level: 7, party_size: 4 },
    };
    cy.intercept('**/auth/v1/**', () => {
      throw new Error('Encounter fixture must not contact authentication');
    });
    cy.intercept('POST', '**/functions/v1/*', (req) => {
      const endpoint = new URL(req.url).pathname.split('/').pop()!;
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      let data: any;
      if (endpoint === 'find-encounter') data = [saved];
      else if (endpoint === 'create-encounter') {
        expect(body.id).to.eq(saved.id);
        expect(body.combatants.list.find((entry: any) => entry._id === 'existing-creature').creature).to.deep.eq(
          creature
        );
        saved = JSON.parse(JSON.stringify(body));
        data = saved;
        req.alias = 'saveEncounter';
      } else if (endpoint === 'get-user')
        data = { id: 910001, user_id: actor, display_name: 'Encounter Fixture', is_admin: false, is_mod: false };
      else if (endpoint === 'get-content-versions') data = [];
      else if (endpoint.startsWith('find-')) {
        const table = endpoint.slice(5).replaceAll('-', '_');
        let rows = fixtures.filter((fixture) => fixture.table === table).map(({ row }) => row);
        if (table === 'creature') rows = body.type === 'hazard' ? rows : [creature];
        if (body.id !== undefined)
          rows = rows.filter((row) => (Array.isArray(body.id) ? body.id : [body.id]).includes(row.id));
        if (body.name) rows = rows.filter((row) => row.name.toLowerCase() === body.name.toLowerCase());
        if (Array.isArray(body.content_sources))
          rows = rows.filter((row) => body.content_sources.includes(row.content_source_id));
        data = body.id !== undefined && !Array.isArray(body.id) ? rows[0] : rows;
      } else throw new Error(`Unexpected fixture endpoint ${endpoint}`);
      req.reply({ body: { status: 'success', data } });
    });
  });
  const visit = () =>
    cy.visit('/encounters', {
      onBeforeLoad(win) {
        // A synthetic session for this intercepted browser fixture, never a real account or token.
        const authHost = new URL(Cypress.env('functions_url')).hostname.split('.')[0];
        const storageKey = `sb-${authHost}-auth-token`;
        const token = `${win.btoa('{}')}.${win.btoa(JSON.stringify({ sub: actor, exp: 4102444800 }))}.fixture`;
        win.localStorage.setItem(
          storageKey,
          JSON.stringify({
            access_token: token,
            refresh_token: 'fixture',
            token_type: 'bearer',
            expires_at: 4102444800,
            expires_in: 3600,
            user: {
              id: actor,
              aud: 'authenticated',
              role: 'authenticated',
              email: 'fixture@example.invalid',
              app_metadata: {},
              user_metadata: {},
              created_at: '',
            },
          })
        );
        win.localStorage.setItem(
          'user-data',
          JSON.stringify({
            id: 910001,
            user_id: actor,
            display_name: 'Encounter Fixture',
            is_admin: false,
            is_mod: false,
          })
        );
      },
    });
  const add = (name: string) => {
    cy.contains('button', 'Add Hazard').click();
    cy.get('input[placeholder="Search hazards"]').type(name);
    cy.get(`button[aria-label="Select ${name}"]`).should('be.visible').click();
    cy.wait('@saveEncounter').then(() =>
      expect(saved.combatants.list.some((entry: any) => entry.hazard?.name === name)).to.eq(true)
    );
  };
  for (const [screen, width, height] of [
    ['desktop', 1280, 800],
    ['mobile', 390, 844],
  ] as const) {
    it(`adds, tracks, saves and reloads mixed hazards on ${screen}`, () => {
      cy.viewport(width, height);
      visit();
      cy.contains('Encounter Creature', { timeout: 30000 }).should('be.visible');
      add('Wind Surge');
      cy.contains('48 XP').should('exist');
      cy.get('[data-hazard-id]')
        .should('have.length', 1)
        .within(() => {
          cy.contains('Simple Hazard 7').should('exist');
          cy.get('input[type="text"]').should('not.exist');
        });
      add("Lightning's Dance");
      cy.contains('button', 'Roll Initiative').click();
      cy.get('.mantine-Modal-body').within(() => {
        cy.contains('Wind Surge').should('not.exist');
        cy.get('input').filter('[value="Stealth, +20"]').should('exist');
        cy.contains('button', 'Roll Initiative').click();
      });
      cy.wait('@saveEncounter').then(() => {
        expect(saved.combatants.list.find((entry: any) => entry._id === 'existing-creature').initiative).to.eq(22);
        expect(
          saved.combatants.list.find((entry: any) => entry.hazard?.name === "Lightning's Dance").initiative
        ).to.be.within(21, 40);
      });
      add('Boneburst');
      add('Boneburst');
      add('Primal Chaos Aura');
      add('Trump of the Oliphaunt');
      cy.get('[data-hazard-id]')
        .filter(':has(input[aria-label="Boneburst HP"])')
        .first()
        .invoke('attr', 'data-hazard-id')
        .as('damagedHazardId');
      cy.get('input[aria-label="Boneburst HP"]').first().clear().type('45{enter}');
      cy.wait('@saveEncounter');
      cy.get('[data-hazard-id]')
        .filter(':has(input[aria-label="Boneburst HP"])')
        .first()
        .find('input[type="checkbox"]')
        .check();
      cy.wait('@saveEncounter').then(function () {
        const bonebursts = saved.combatants.list.filter((entry: any) => entry.hazard?.name === 'Boneburst');
        expect(bonebursts.find((entry: any) => entry._id === this.damagedHazardId).hazard_state).to.deep.eq({
          hp_current: 45,
          disabled: true,
        });
        expect(bonebursts.find((entry: any) => entry._id !== this.damagedHazardId).hazard_state).to.deep.eq({
          hp_current: 90,
          disabled: false,
        });
        expect(saved.meta_data).to.deep.eq({ party_level: 7, party_size: 4 });
      });
      cy.reload();
      cy.get('[data-hazard-id]').should('have.length', 6);
      cy.get<string>('@damagedHazardId').then((id) => {
        cy.get(`[data-hazard-id="${id}"] input[aria-label="Boneburst HP"]`).should('have.value', '45');
        cy.get(`[data-hazard-id]:not([data-hazard-id="${id}"]) input[aria-label="Boneburst HP"]`).should(
          'have.value',
          '90'
        );
      });
      cy.get('[data-hazard-id]').find('button[aria-label="Add Condition"]').should('not.exist');
      cy.contains('[data-hazard-id] button', 'Boneburst').first().click();
      cy.get('.mantine-Drawer-content').should('be.visible').contains('Hardness').should('exist');
      cy.get('button[aria-label="Close drawer"]').click();
      cy.document().should((doc) =>
        expect(doc.documentElement.scrollWidth).to.be.at.most(doc.documentElement.clientWidth)
      );
      cy.screenshot(`hazard-encounter-${screen}`);
      cy.get('button[aria-label="Remove Wind Surge"]').click();
      cy.wait('@saveEncounter').then(() =>
        expect(saved.combatants.list.filter((entry: any) => entry.type === 'HAZARD')).to.have.length(5)
      );
    });
    it(`keeps hazard previews above the picker and creature choices separate on ${screen}`, () => {
      cy.viewport(width, height);
      visit();
      cy.contains('Encounter Creature', { timeout: 30000 }).should('be.visible');
      cy.contains('button', 'Add Creature').click();
      cy.get('.mantine-Modal-body').contains('Encounter Creature').should('exist');
      cy.get('.mantine-Modal-body').contains('Wind Surge').should('not.exist');
      cy.get('.mantine-Modal-body')
        .contains('button', /^Select$/)
        .click();
      cy.wait('@saveEncounter').then(() => {
        expect(saved.meta_data).to.deep.eq({ party_level: 7, party_size: 4 });
        expect(saved.combatants.list.filter((entry: any) => entry.type === 'CREATURE')).to.have.length(2);
      });
      cy.contains('button', 'Add Hazard').click();
      cy.get('.mantine-Modal-body').contains('Encounter Creature').should('not.exist');
      cy.get('.mantine-Modal-body').contains('Trump of the Oliphaunt').click();
      cy.get('.mantine-Drawer-content').should('be.visible').contains('Hazard 12').should('exist');
      cy.document().should((doc) => {
        const drawer = doc.querySelector('.mantine-Drawer-inner')!;
        const modal = doc.querySelector('.mantine-Modal-inner')!;
        expect(Number(doc.defaultView!.getComputedStyle(drawer).zIndex)).to.be.greaterThan(
          Number(doc.defaultView!.getComputedStyle(modal).zIndex)
        );
        expect(drawer.getBoundingClientRect().right).to.be.at.most(width + 1);
      });
      cy.screenshot(`hazard-picker-preview-${screen}`);
      cy.get('button[aria-label="Close drawer"]').click();
      cy.get('input[placeholder="Search hazards"]').should('be.visible').type('Trump');
      cy.get('button[aria-label="Select Trump of the Oliphaunt"]').click();
      cy.wait('@saveEncounter');
      cy.contains('[data-hazard-id]', 'Trump of the Oliphaunt').should('be.visible');
    });
  }
});
