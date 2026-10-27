import { paginateAbilityFixture } from '../../support/content-pagination';

/** Intercept every API boundary; these regressions never write to a real account. */
describe('October Discord regressions', () => {
  const actor = '00000000-0000-4000-8000-000000000001';
  let fixtures: { table: string; row: { id: number; [key: string]: any } }[] = [];
  let character: Record<string, any>;
  let releaseSessionRefresh: (() => void) | undefined;
  let releaseBuilderContent: (() => void) | undefined;
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
    cy.task<any>('contentFixture:sources', [1], { log: false, timeout: 60000 }).then((rows) => {
      fixtures = rows;
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
    });
  });
  beforeEach(() => {
    cy.intercept('**/auth/v1/**', () => {
      throw new Error('Unexpected live auth request');
    });
    cy.intercept('POST', '**/functions/v1/*', (req) => {
      const endpoint = new URL(req.url).pathname.split('/').pop()!;
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      let data: any;
      if (endpoint === 'create-character') {
        req.alias = 'rejectedCreation';
        return req.reply({
          body: { status: 'error', message: 'Reconnect Patreon in Account to verify additional character slots.' },
        });
      }
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
        if (table === 'ability_block') rows = paginateAbilityFixture(rows, body);
        data = body.id !== undefined && !Array.isArray(body.id) ? (rows[0] ?? null) : rows;
      } else throw new Error(`Unexpected API ${endpoint}`);
      req.reply({ body: { status: 'success', data } });
    });
  });
  afterEach(() => {
    if (releaseSessionRefresh) {
      releaseSessionRefresh();
      cy.wait('@stalledSessionRefresh', { responseTimeout: 20000 });
    }
    releaseSessionRefresh = undefined;
    releaseBuilderContent?.();
    releaseBuilderContent = undefined;
  });
  const savedSession = (expiresAt: number) => ({
    access_token: `${btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${btoa(JSON.stringify({ sub: actor, role: 'authenticated', exp: expiresAt }))}.fixture`,
    refresh_token: 'fixture',
    token_type: 'bearer',
    expires_at: expiresAt,
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
  });
  const visit = (url: string, expiresAt: number = 4102444800) =>
    cy.visit(url, {
      onBeforeLoad(win) {
        const host = new URL(Cypress.expose('functions_url')).hostname.split('.')[0];
        win.localStorage.setItem(`sb-${host}-auth-token`, JSON.stringify(savedSession(expiresAt)));
        win.localStorage.removeItem('user-data');
      },
    });
  it('recovers pending Builder math on Home and persists an immediate name edit before reload', () => {
    const writerId = '00000000-0000-4000-8000-000000000099';
    let server: typeof character = { ...structuredClone(character), updated_at: '2026-10-27T12:00:00.000Z' };
    const retiredItem = fixtures.find(
      ({ table, row }) =>
        table === 'item' &&
        row.id !== 9252 &&
        !row.operations?.length &&
        !row.meta_data?.container_default_items?.length
    )!.row;
    server.inventory.items = [
      {
        id: 'retired-operation-grant',
        item: structuredClone(retiredItem),
        is_formula: false,
        is_equipped: false,
        is_invested: false,
        is_implanted: false,
        container_contents: [],
      },
    ];
    server.meta_data.given_item_ids = [retiredItem.id];
    const base = structuredClone(server);
    let writes = 0;
    let contentStarted = false;
    const held = new Promise<void>((resolve) => {
      releaseBuilderContent = resolve;
    });
    cy.intercept('POST', '**/functions/v1/find-character', (request) => {
      const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
      request.reply({ body: { status: 'success', data: body.id ? server : [server] } });
    });
    cy.intercept('POST', '**/functions/v1/update-character', (request) => {
      const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
      expect(body.expected_updated_at).to.eq(server.updated_at);
      const { expected_updated_at: _version, ...fields } = body;
      server = { ...server, ...fields, updated_at: new Date(Date.parse(base.updated_at) + ++writes).toISOString() };
      request.reply({ body: { status: 'success', data: [server] } });
    }).as('recoveredHomeSave');
    cy.intercept('POST', '**/functions/v1/find-ability-block', (request) => {
      contentStarted = true;
      const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
      const rows = fixtures
        .filter(({ table, row }) => table === 'ability_block' && body.content_sources.includes(row.content_source_id))
        .map(({ row }) => row);
      return held.then(() => request.reply({ body: { status: 'success', data: paginateAbilityFixture(rows, body) } }));
    });
    cy.then(() =>
      Cypress.automation('remote:debugger:protocol', {
        command: 'Storage.clearDataForOrigin',
        params: { origin: Cypress.config('baseUrl'), storageTypes: 'all' },
      })
    );
    cy.visit('/builder/36514', {
      onBeforeLoad(win) {
        const host = new URL(Cypress.expose('functions_url')).hostname.split('.')[0];
        win.localStorage.setItem(`sb-${host}-auth-token`, JSON.stringify(savedSession(4102444800)));
        win.localStorage.setItem(
          `autosave-character-36514-${actor}:writer:${writerId}`,
          JSON.stringify({
            version: 2,
            actorId: actor,
            writerId,
            requiresCalculation: true,
            base,
            body: { ...base, name: 'Retained Builder draft', expected_updated_at: base.updated_at },
          })
        );
      },
    });
    cy.get('input[placeholder="Unknown Wanderer"]', { timeout: 30000 })
      .should('have.value', 'Retained Builder draft')
      .clear()
      .type('Home name before calculation');
    cy.wrap(null).should(() => {
      expect(contentStarted, 'Home resumes the required calculation').to.eq(true);
      expect(writes, 'unfinished derived values cannot be saved').to.eq(0);
    });
    cy.then(() => {
      releaseBuilderContent?.();
    });
    cy.wait('@recoveredHomeSave', { responseTimeout: 60000 }).then(({ request }) => {
      expect(request.body.name).to.eq('Home name before calculation');
      expect(request.body.meta_data.calculated_stats.hp_max).to.be.a('number');
      expect(request.body.inventory.items.some((entry: any) => entry.item.id === 9252)).to.eq(true);
      expect(request.body.inventory.items.some((entry: any) => entry.item.id === retiredItem.id)).to.eq(false);
      expect(request.body.meta_data.given_item_ids).not.to.include(retiredItem.id);
    });
    cy.reload();
    cy.get('input[placeholder="Unknown Wanderer"]', { timeout: 30000 }).should(
      'have.value',
      'Home name before calculation'
    );
    cy.contains('We just rolled a Nat 1...').should('not.exist');
  });
  it(
    'loads a public sheet while an expired saved session is waiting for refresh',
    { defaultCommandTimeout: 20000 },
    () => {
      let privateWrites = 0;
      let refreshStarted = false;
      const stalled = new Promise<void>((resolve) => {
        releaseSessionRefresh = resolve;
      });
      cy.intercept('POST', '**/auth/v1/token*', (request) => {
        refreshStarted = true;
        return stalled.then(() =>
          request.reply({
            statusCode: 400,
            body: {
              code: 'refresh_token_not_found',
              error_code: 'refresh_token_not_found',
              message: 'Saved session is no longer valid',
            },
          })
        );
      }).as('stalledSessionRefresh');
      cy.intercept('POST', '**/functions/v1/find-character', (request) => {
        const authorization = request.headers.authorization;
        const bearer = typeof authorization === 'string' ? authorization.split(' ')[1] : '';
        const payload = JSON.parse(atob(bearer.split('.')[1].replaceAll('-', '+').replaceAll('_', '/')));
        expect(payload.role, 'a pending refresh must not block a public read or reuse the expired identity').to.eq(
          'anon'
        );
        request.reply({
          body: { status: 'success', data: { ...character, options: { ...character.options, is_public: true } } },
        });
      });
      cy.intercept('POST', '**/functions/v1/update-character', (request) => {
        privateWrites += 1;
        request.reply({ statusCode: 403, body: { status: 'fail', data: { code: 'FORBIDDEN' } } });
      });
      visit('/sheet/36514', 1);
      cy.wrap(null).should(() =>
        expect(refreshStarted, 'the real auth client attempted to refresh the expired session').to.eq(true)
      );
      cy.contains('Hit Points', { timeout: 10000 }).should('be.visible');
      cy.then(() => {
        expect(privateWrites, 'anonymous recovery cannot save a character').to.eq(0);
        releaseSessionRefresh?.();
      });
      cy.wait('@stalledSessionRefresh', { responseTimeout: 20000 }).then(() => {
        releaseSessionRefresh = undefined;
      });
      cy.window().should((win) => {
        const host = new URL(Cypress.expose('functions_url')).hostname.split('.')[0];
        expect(
          win.localStorage.getItem(`sb-${host}-auth-token`) === null,
          'the failed refresh has settled before leaving this fixture'
        ).to.eq(true);
      });
      cy.contains('Hit Points', { timeout: 10000 }).should('be.visible');
    }
  );
  for (const restored of [true, false]) {
    it(
      `keeps a private sheet on its route until the pending session ${restored ? 'recovers' : 'confirms sign-out'}`,
      { defaultCommandTimeout: 20000 },
      () => {
        const stalled = new Promise<void>((resolve) => {
          releaseSessionRefresh = resolve;
        });
        cy.intercept('POST', '**/auth/v1/token*', (request) =>
          stalled.then(() =>
            request.reply(
              restored
                ? {
                    statusCode: 200,
                    body: savedSession(Math.floor(Date.now() / 1000) + 3600),
                  }
                : {
                    statusCode: 400,
                    body: {
                      code: 'refresh_token_not_found',
                      error_code: 'refresh_token_not_found',
                      message: 'Saved session is no longer valid',
                    },
                  }
            )
          )
        ).as('stalledSessionRefresh');
        cy.intercept('POST', '**/functions/v1/find-character', (request) => {
          const bearer = String(request.headers.authorization).split(' ')[1];
          const payload = JSON.parse(atob(bearer.split('.')[1].replaceAll('-', '+').replaceAll('_', '/')));
          if (payload.role === 'anon') request.alias = 'anonymousPrivateSheet';
          request.reply({ body: { status: 'success', data: payload.role === 'anon' ? null : character } });
        });
        visit('/sheet/36514', 1);
        cy.wait('@anonymousPrivateSheet');
        // Keep the real SDK refresh pending across a quiet retry and the old unauthorized path.
        cy.wait(3000);
        cy.location('pathname').should('eq', '/sheet/36514');
        cy.contains('Loading...').should('be.visible');
        cy.then(() => releaseSessionRefresh?.());
        cy.wait('@stalledSessionRefresh', { responseTimeout: 20000 }).then(() => {
          releaseSessionRefresh = undefined;
        });
        if (restored) {
          cy.contains('Hit Points', { timeout: 20000 }).should('be.visible');
          cy.location('pathname').should('eq', '/sheet/36514');
        } else cy.location('pathname', { timeout: 20000 }).should('eq', '/sheet-unauthorized');
      }
    );
  }
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
    cy.wait('@rejectedCreation', { requestTimeout: 30000, responseTimeout: 30000 });
    cy.contains('Import failed', { timeout: 30000 }).should('be.visible');
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
      const sources = [...new Set<number>([3, ...build.content_sources.enabled])];
      cy.task<any>('contentFixture:sources', sources, { log: false, timeout: 60000 }).then((rows) => {
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
