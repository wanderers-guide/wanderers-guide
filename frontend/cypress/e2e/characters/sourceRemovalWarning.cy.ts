import { paginateAbilityFixture } from '../../support/content-pagination';
import { AncestrySchema, type Character, type ContentSource } from '../../../src/schemas/content';

type Fixture = { table: string; row: Record<string, any> & { id: number } };

/** Exercise the real Builder warning and sheet failure using read-only catalog fixtures. */
describe('Removing a character source', () => {
  const actor = '00000000-0000-4000-8000-000000000001';
  const sourceId = 990901;
  let catalog: Fixture[];
  let character: Character;
  let writes: Record<string, unknown>[];
  const source: ContentSource = {
    id: sourceId,
    created_at: '',
    name: 'Warning Test Source',
    foundry_id: null,
    url: null,
    description: '',
    operations: [],
    user_id: null,
    contact_info: null,
    require_key: false,
    is_published: true,
    required_content_sources: [],
    group: 'lost-omens',
    meta_data: null,
    artwork_url: null,
    keys: null,
    deprecated: false,
  };
  before(() => {
    cy.task<Fixture[]>('contentFixture:sources', [1, 3], { log: false, timeout: 60000 }).then((rows) => {
      catalog = rows;
    });
  });
  beforeEach(() => {
    writes = [];
    character = {
      id: 990902,
      created_at: '',
      updated_at: 'fixture-version',
      user_id: actor,
      name: 'Source warning fixture',
      campaign_id: null,
      level: 10,
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
      content_sources: { enabled: [1, 3, sourceId] },
      companions: { list: [] },
      options: {},
      custom_operations: [],
    };
    cy.intercept('**/auth/v1/**', () => {
      throw new Error('Unexpected live authentication request');
    });
    cy.intercept('POST', '**/functions/v1/*', (req) => {
      const endpoint = new URL(req.url).pathname.split('/').pop()!;
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      let data: unknown;
      if (endpoint === 'find-character') data = character;
      else if (endpoint === 'update-character') {
        writes.push(body);
        character = { ...character, ...body };
        data = [character];
      } else if (endpoint === 'get-user')
        data = {
          id: 990903,
          user_id: actor,
          display_name: 'Warning fixture',
          is_developer: true,
          subscribed_content_sources: [],
        };
      else if (['get-content-versions', 'get-content-source-stats'].includes(endpoint)) data = [];
      else if (endpoint === 'report-client-error') data = true;
      else if (endpoint.startsWith('find-')) {
        const table = endpoint.slice(5).replaceAll('-', '_');
        let rows = catalog.filter((entry) => entry.table === table).map(({ row }) => row);
        if (table === 'content_source') rows = [...rows, source];
        // The current catalog can disagree with the snapshot saved on a character after a reprint.
        if (table === 'ancestry' && character.details?.ancestry)
          rows = rows.map((row) =>
            row.id === character.details?.ancestry?.id ? { ...row, content_source_id: sourceId } : row
          );
        if (table === 'background' && character.details?.background)
          rows = rows.map((row) =>
            row.id === character.details?.background?.id ? { ...row, content_source_id: sourceId } : row
          );
        if (table === 'class')
          rows = rows.map((row) =>
            [character.details?.class?.id, character.details?.class_2?.id].includes(row.id)
              ? { ...row, content_source_id: sourceId }
              : row
          );
        if (body.id !== undefined)
          rows = rows.filter((row) => (Array.isArray(body.id) ? body.id : [body.id]).includes(row.id));
        if (Array.isArray(body.content_sources))
          rows = rows.filter((row) => body.content_sources.includes(row.content_source_id));
        if (body.name) rows = rows.filter((row) => row.name.toLowerCase().includes(body.name.toLowerCase()));
        if (table === 'ability_block') rows = paginateAbilityFixture(rows, body);
        data = body.id !== undefined && !Array.isArray(body.id) ? (rows[0] ?? null) : rows;
      } else throw new Error(`Unexpected API request: ${endpoint}`);
      req.reply({ body: { status: 'success', data } });
    });
  });
  const visit = (path: string) =>
    cy.visit(path, {
      onBeforeLoad(win) {
        const host = new URL(Cypress.expose('functions_url')).hostname.split('.')[0];
        const exp = 4102444800;
        win.localStorage.setItem(
          `sb-${host}-auth-token`,
          JSON.stringify({
            access_token: `${btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${btoa(JSON.stringify({ sub: actor, role: 'authenticated', exp }))}.fixture`,
            refresh_token: 'fixture',
            token_type: 'bearer',
            expires_at: exp,
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
  const openSources = () => {
    cy.contains('button', 'Lost Omens').click();
  };
  const sourceSwitch = () =>
    cy
      .contains('label', source.name)
      .invoke('attr', 'for')
      .then((id) => cy.get(`input[id="${id}"]`));

  for (const [field, table, label] of [
    ['ancestry', 'ancestry', 'ancestry'],
    ['background', 'background', 'background'],
    ['class', 'class', 'class'],
    ['class_2', 'class', 'secondary class'],
  ] as const) {
    it(`warns for the selected ${label} before changing sources, including a moved saved snapshot`, () => {
      cy.then(() => {
        const record = structuredClone(catalog.find((entry) => entry.table === table)!.row);
        character.details = { ...character.details, [field]: record };
      });
      visit('/builder/990902');
      openSources();
      sourceSwitch().should('be.checked').uncheck({ force: true });
      cy.get('[role="dialog"]')
        .should('contain.text', ` ${label} uses Warning Test Source.`)
        .and('contain.text', 'Disabling this source may remove character options.')
        .and('not.contain.text', 'prevent');
      sourceSwitch().should('be.checked');
      if (field === 'ancestry') {
        cy.screenshot('source-removal-warning-desktop', { capture: 'viewport' });
        cy.viewport(390, 844);
        cy.get('[role="dialog"]').contains('button', 'Confirm').should('be.visible');
        cy.screenshot('source-removal-warning-mobile', { capture: 'viewport' });
        cy.viewport(1000, 660);
      }
      cy.then(() => expect(writes).to.have.length(0));
      cy.get('[role="dialog"]').contains('button', 'Cancel').click();
      cy.get('[role="dialog"]').should('not.exist');
      sourceSwitch().should('be.checked');
      cy.then(() => {
        expect(writes).to.have.length(0);
        expect(character.content_sources?.enabled).to.include(sourceId);
      });
      sourceSwitch().uncheck({ force: true });
      cy.get('[role="dialog"]').contains('button', 'Confirm').click();
      cy.get('[role="dialog"]').should('not.exist');
      sourceSwitch().should('not.be.checked');
    });
  }

  it('disables an unused source without prompting', () => {
    visit('/builder/990902');
    openSources();
    sourceSwitch().uncheck({ force: true });
    sourceSwitch().should('not.be.checked');
    cy.get('[role="dialog"]').should('not.exist');
  });

  it('keeps the sheet route and shows its error boundary when selected ancestry content is disabled', () => {
    cy.then(() => {
      const ancestry = AncestrySchema.parse(catalog.find((entry) => entry.table === 'ancestry')!.row);
      character.details = { ...character.details, ancestry };
      character.content_sources = { enabled: [1, 3] };
    });
    visit('/sheet/990902');
    cy.contains('Unable to open this page', { timeout: 30000 }).should('be.visible');
    cy.location('pathname').should('eq', '/sheet/990902');
    cy.then(() => expect(writes).to.have.length(0));
  });
});
