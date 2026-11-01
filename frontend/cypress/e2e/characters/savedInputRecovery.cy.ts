import { paginateAbilityFixture } from '../../support/content-pagination';
import { AncestrySchema, type Character, type ContentSource } from '../../../src/schemas/content';

type Fixture = { table: string; row: Record<string, any> & { id: number } };

/** Reproduce saved input failures with the real worker, Builder controls, and persistence boundary. */
describe('Recovering saved character inputs', () => {
  const actor = '00000000-0000-4000-8000-000000000001';
  const sourceId = 990901;
  let catalog: Fixture[];
  let character: Character;
  let writes: Record<string, unknown>[];
  const source: ContentSource = {
    id: sourceId,
    created_at: '',
    name: 'Recovery Test Source',
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
      updated_at: '2026-11-01T12:00:00Z',
      user_id: actor,
      name: 'Recovery fixture',
      campaign_id: null,
      level: 10,
      experience: 0,
      hero_points: 1,
      hp_current: 1,
      hp_temp: 0,
      stamina_current: 0,
      resolve_current: 0,
      notes: { pages: [{ name: 'Notes', icon: '', color: '', contents: 'Keep these saved notes' }] },
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
        character = { ...character, ...body, updated_at: '2026-11-01T12:01:00Z' };
        data = [character];
      } else if (endpoint === 'get-user')
        data = {
          id: 990903,
          user_id: actor,
          display_name: 'Recovery fixture',
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
  const visit = (path: string, signedIn = true) =>
    cy.visit(path, {
      onBeforeLoad(win) {
        const host = new URL(Cypress.expose('functions_url')).hostname.split('.')[0];
        const exp = 4102444800;
        if (signedIn)
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
        if (!signedIn) win.localStorage.removeItem(`sb-${host}-auth-token`);
        win.localStorage.removeItem('user-data');
      },
    });

  for (const width of [390, 1280]) {
    for (const cause of ['source', 'attribute'] as const) {
      it(`lets the owner repair a saved ${cause} failure and reopen the sheet at ${width}px`, () => {
        cy.viewport(width, 844);
        cy.then(() => {
          if (cause === 'source') {
            const ancestry = AncestrySchema.parse(catalog.find((entry) => entry.table === 'ancestry')!.row);
            // Keep this fixture focused on source resolution rather than ancestry choices.
            ancestry.operations = [];
            catalog = catalog.map((entry) =>
              entry.table === 'ancestry' && entry.row.id === ancestry.id ? { ...entry, row: ancestry } : entry
            );
            character.details = { ...character.details, ancestry };
            character.content_sources = { enabled: [1, 3] };
          } else {
            character.options = { custom_operations: true };
            character.custom_operations = [
              {
                id: 'saved-invalid-adjustment',
                type: 'adjValue',
                data: { variable: 'ATTRIBUTE_STR', value: { value: 2, partial: false } },
              },
            ];
          }
        });
        visit('/sheet/990902');
        cy.contains('a', 'Edit character', { timeout: 30000 }).should('be.visible');
        cy.contains('Hit Points').should('not.exist');
        cy.contains('a', 'Edit character').focus().should('have.focus');
        cy.contains('Unable to calculate this character').should(($title) => {
          const bounds = $title[0].getBoundingClientRect();
          expect(bounds.left).to.be.at.least(0);
          expect(bounds.right).to.be.at.most(width);
        });
        cy.then(() => expect(writes, 'failed calculations never save partial stats').to.have.length(0));
        cy.screenshot(`saved-${cause}-recovery-${width}`, { capture: 'viewport' });
        cy.contains('a', 'Edit character').click();
        cy.location('pathname').should('eq', '/builder/990902');
        if (cause === 'source') {
          cy.contains('button', 'Lost Omens').click();
          cy.contains('label', source.name)
            .invoke('attr', 'for')
            .then((id) => cy.get(`input[id="${id}"]`).check({ force: true }));
        } else {
          cy.contains('[role="tab"]', 'Options').click();
          cy.contains('button', 'Open Operations').click();
          cy.get('[role="dialog"]').find('input[placeholder="Number to Add"]').clear().type('1').blur();
          cy.get('[role="dialog"]').find('input[placeholder="Number to Add"]').should('have.value', '+1');
          cy.get('[role="dialog"]').type('{esc}');
          cy.get('[role="dialog"]').should('not.exist');
        }
        cy.wrap(null).should(() => {
          expect(writes.length, 'the repair uses normal character persistence').to.be.greaterThan(0);
          if (cause === 'source') expect(character.content_sources?.enabled).to.include(sourceId);
          else
            expect(character.custom_operations?.[0].data).to.deep.equal({
              variable: 'ATTRIBUTE_STR',
              value: { value: 1, partial: false },
            });
          expect(character.notes?.pages[0].contents).to.equal('Keep these saved notes');
        });
        // A fresh load proves that the persisted repair, rather than local state, recovers the real worker.
        visit('/sheet/990902');
        cy.contains('Hit Points', { timeout: 30000 }).should('be.visible');
        cy.contains('a', 'Edit character').should('not.exist');
        cy.screenshot(`saved-${cause}-recovered-${width}`, { capture: 'viewport' });
        cy.then(() => expect(character.notes?.pages[0].contents).to.equal('Keep these saved notes'));
      });
    }
  }

  it('keeps public viewers read-only when a saved operation cannot calculate', () => {
    character.options = { custom_operations: true };
    character.custom_operations = [
      {
        id: 'saved-invalid-adjustment',
        type: 'adjValue',
        data: { variable: 'ATTRIBUTE_STR', value: { value: -2, partial: false } },
      },
    ];
    visit('/sheet/990902', false);
    cy.contains('Unable to calculate this character', { timeout: 30000 }).should('be.visible');
    cy.contains('a', 'Edit character').should('not.exist');
    cy.contains('Hit Points').should('not.exist');
    cy.then(() => expect(writes).to.have.length(0));
  });
});
