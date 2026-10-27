export {};

/** Intercept every API boundary; these regressions never write to a real account. */
describe('October Discord regressions', () => {
  const actor = '00000000-0000-4000-8000-000000000001';
  let fixtures: { table: string; row: Record<string, any> }[] = [];
  let character: Record<string, any>;
  const encounters = Array.from({ length: 20 }, (_, index) => ({
    id: 910000 + index,
    created_at: '',
    user_id: actor,
    name: `Encounter ${index + 1}`,
    icon: 'combat',
    color: '#228be6',
    campaign_id: null,
    combatants: { list: [] },
    meta_data: { party_level: 1, party_size: 4 },
  }));
  before(() => {
    const script = `
      import { readContentRows } from './scripts/operation-test-harness.mjs';
      const tables = ['ability_block','item','class','ancestry','background','spell','trait','language','archetype','versatile_heritage','class_archetype'];
      const fixtures = await readContentRows([...tables.map(table => ({table,sourceIds:[1]})),{table:'content_source',id:1}]);
      console.log(JSON.stringify(fixtures));
    `;
    cy.exec(`node --input-type=module -e '${script.replaceAll("'", "'\\''")}'`, { log: false, timeout: 60000 }).then(
      ({ stdout }) => {
        fixtures = JSON.parse(stdout);
        character = {
          id: 36514,
          created_at: '',
          updated_at: 'fixture-version',
          user_id: actor,
          name: 'Long Lore regression',
          level: 11,
          experience: 0,
          hero_points: 1,
          hp_current: 1,
          hp_temp: 0,
          stamina_current: 0,
          resolve_current: 0,
          notes: null,
          roll_history: null,
          spells: null,
          inventory: { items: [], coins: { cp: 0, sp: 0, gp: 0, pp: 0 } },
          details: { conditions: [] },
          meta_data: { reset_hp: false },
          operation_data: { selections: {} },
          variants: null,
          content_sources: { enabled: [1] },
          companions: { list: [] },
          options: { custom_operations: true },
          custom_operations: [
            { id: 'ancestry-hp', type: 'setValue', data: { variable: 'MAX_HEALTH_ANCESTRY', value: 8 } },
            { id: 'class-hp', type: 'setValue', data: { variable: 'MAX_HEALTH_CLASS_PER_LEVEL', value: 6 } },
            {
              id: 'long-lore',
              type: 'createValue',
              data: {
                type: 'prof',
                variable: 'SKILL_LORE_REBELLION_LORE_AND_STRATEGY_WITH_AN_EXTREMELY_LONG_NAME',
                value: { value: 'T', attribute: 'ATTRIBUTE_INT' },
              },
            },
          ],
        };
      }
    );
  });
  beforeEach(() => {
    cy.intercept('**/auth/v1/**', () => {
      throw new Error('Unexpected live auth request');
    });
    cy.intercept('POST', '**/functions/v1/*', (req) => {
      const endpoint = new URL(req.url).pathname.split('/').pop()!;
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      let data: any;
      if (endpoint === 'create-character')
        return req.reply({
          body: { status: 'error', message: 'Reconnect Patreon in Account to verify additional character slots.' },
        });
      if (endpoint === 'update-character')
        return req.reply({ body: { status: 'success', data: [{ ...character, ...body }] } });
      if (endpoint === 'find-character') data = body.id ? character : [character];
      else if (endpoint === 'find-encounter') data = encounters;
      else if (endpoint === 'get-user')
        data = {
          id: 910001,
          user_id: actor,
          display_name: 'Regression fixture',
          is_developer: true,
          subscribed_content_sources: [],
        };
      else if (endpoint === 'get-content-versions' || endpoint === 'get-content-source-stats') data = [];
      else if (endpoint === 'report-client-error') data = true;
      else if (endpoint.startsWith('find-')) {
        const table = endpoint.slice(5).replaceAll('-', '_');
        let rows = fixtures.filter((fixture) => fixture.table === table).map(({ row }) => row);
        if (body.id !== undefined)
          rows = rows.filter((row) => (Array.isArray(body.id) ? body.id : [body.id]).includes(row.id));
        if (body.name) rows = rows.filter((row) => row.name.toLowerCase().includes(body.name.toLowerCase()));
        if (Array.isArray(body.content_sources))
          rows = rows.filter((row) => body.content_sources.includes(row.content_source_id));
        if (body.dedication_feat_id) rows = rows.filter((row) => row.dedication_feat_id === body.dedication_feat_id);
        data = body.id !== undefined && !Array.isArray(body.id) ? (rows[0] ?? null) : rows;
      } else throw new Error(`Unexpected API ${endpoint}`);
      req.reply({ body: { status: 'success', data } });
    });
  });
  const visit = (url: string) =>
    cy.visit(url, {
      onBeforeLoad(win) {
        const host = new URL(Cypress.env('functions_url')).hostname.split('.')[0];
        const token = `${win.btoa('{}')}.${win.btoa(JSON.stringify({ sub: actor, exp: 4102444800 }))}.fixture`;
        win.localStorage.setItem(
          `sb-${host}-auth-token`,
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
        win.localStorage.removeItem('user-data');
      },
    });
  it('releases creation loading and shows an application error returned with HTTP 200', () => {
    visit('/characters');
    cy.get('button[aria-label="Create Character"]').click();
    cy.contains('Could not create character').should('be.visible');
    cy.contains('Reconnect Patreon').should('be.visible');
    cy.get('button[aria-label="Create Character"]').should('not.have.attr', 'data-loading');
  });
  it('preserves the actionable server error when importing a valid JSON file', () => {
    visit('/characters');
    cy.get('input[type="file"][accept="application/JSON"]').selectFile(
      {
        contents: Cypress.Buffer.from(JSON.stringify({ version: 4, character: { name: 'Valid import', level: 1 } })),
        fileName: 'character.json',
        mimeType: 'application/json',
      },
      { force: true }
    );
    cy.contains('Import failed').should('be.visible');
    cy.contains('Reconnect Patreon').should('be.visible');
    cy.contains('Invalid JSON file').should('not.exist');
    cy.get('button[aria-label="Import Character"]').should('not.have.attr', 'data-loading');
    cy.contains('Please wait...').should('not.exist');
  });
  it('keeps all twenty encounters reachable in the scrollable navigation', () => {
    cy.viewport(1280, 900);
    visit('/encounters');
    cy.get('[role="tablist"] .mantine-ScrollArea-viewport').as('encounterList');
    cy.get('@encounterList').should(($list) => expect($list[0].scrollHeight).to.be.greaterThan($list[0].clientHeight));
    cy.get('@encounterList').scrollTo('bottom');
    cy.get('[role="tablist"] .mantine-ScrollArea-scrollbar[data-orientation="vertical"]').should('be.visible');
    cy.contains('[role="tab"]', 'Encounter 20').should('be.visible').click();
    cy.contains('[role="tab"]', 'Encounter 20').should('have.attr', 'aria-selected', 'true');
    cy.screenshot('discord-encounter-navigation-desktop');
  });
  it('calculates nonzero stats and keeps Actions beside an oversized Lore label', () => {
    cy.viewport(1280, 900);
    visit('/sheet/36514');
    cy.contains('Hit Points', { timeout: 60000 }).should('be.visible');
    cy.contains('74').should('exist');
    cy.get('input[placeholder="Search skills"]').then(($skills) => {
      cy.get('input[placeholder="Search actions & activities"]').should(($actions) => {
        expect(
          Math.abs($actions[0].getBoundingClientRect().top - $skills[0].getBoundingClientRect().top)
        ).to.be.lessThan(3);
      });
    });
    cy.document().then((doc) => expect(doc.documentElement.scrollWidth).to.be.at.most(doc.documentElement.clientWidth));
    cy.screenshot('discord-long-lore-desktop');
    cy.viewport(390, 844);
    cy.contains('Hit Points').should('be.visible');
    cy.document().then((doc) => expect(doc.documentElement.scrollWidth).to.be.at.most(doc.documentElement.clientWidth));
    cy.screenshot('discord-long-lore-mobile');
  });

  it('recalculates the reported level-11 Druid with cold and warm caches in the real worker', () => {
    cy.fixture('oct26-druid-build.json').then((build) => {
      character = {
        ...build,
        user_id: actor,
        name: 'Druid regression',
        updated_at: 'fixture-version',
        hp_current: 116,
        hp_temp: 0,
        meta_data: { reset_hp: false },
      };
      const script = `
        import { readContentRows } from './scripts/operation-test-harness.mjs';
        import { writeFile } from 'node:fs/promises';
        const tables = ['ability_block','item','class','ancestry','background','spell','trait','language','archetype','versatile_heritage','class_archetype'];
        const sources = [...new Set([3,...${JSON.stringify(build.content_sources.enabled)}])];
        const fixtures = await readContentRows([...tables.map(table => ({table,sourceIds:sources})),...sources.map(id => ({table:'content_source',id}))]);
        await writeFile('/tmp/wg-oct26-druid-content.json', JSON.stringify(fixtures));
      `;
      cy.exec(`node --input-type=module -e '${script.replaceAll("'", "'\\''")}'`, { log: false, timeout: 60000 });
      cy.readFile('/tmp/wg-oct26-druid-content.json', { log: false, timeout: 60000 }).then((rows) => {
        fixtures = rows;
        expect(fixtures.some(({ table, row }) => table === 'ancestry' && row.id === build.details.ancestry.id)).to.eq(
          true,
          'Common Core ancestry must be present'
        );
      });
    });
    cy.viewport(1366, 768);
    visit('/sheet/910010');
    const assertDruid = () => {
      cy.contains('Hit Points', { timeout: 90000 }).should('be.visible');
      cy.contains('116').should('exist');
      cy.contains('+19').should('exist');
      cy.contains('We just rolled a Nat 1...').should('not.exist');
    };
    assertDruid();
    cy.screenshot('discord-druid-desktop-cold');
    cy.reload();
    assertDruid();
    cy.viewport(390, 844);
    cy.reload();
    assertDruid();
    cy.screenshot('discord-druid-mobile-warm');
  });
});
