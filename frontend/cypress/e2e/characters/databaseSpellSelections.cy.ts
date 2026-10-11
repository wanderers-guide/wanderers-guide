import { CharacterSchema, ContentSourceSchema, SpellSchema } from '../../../src/schemas/content';
import { OperationSchema } from '../../../src/schemas/operations';

const actor = '00000000-0000-4000-8000-000000991902';
const first = '6082549e-6035-451d-a2dd-f90766e54d55';
const second = '5a22ab22-74b9-4658-b194-558c386668d4';
const predefined = 'a7da4994-13ef-4bfd-84a1-8d7380dc5cbd';
const predefinedChoice = '923ef5f1-2515-4734-b5f4-083ba9b8b93e';
const profile = { id: 991902, user_id: actor, display_name: 'Database fixture', is_admin: false, is_mod: false };
const source = ContentSourceSchema.parse({
  id: 991902,
  created_at: '',
  name: 'Database fixture',
  foundry_id: null,
  url: null,
  description: '',
  operations: null,
  user_id: actor,
  contact_info: null,
  require_key: false,
  keys: null,
  is_published: false,
  deprecated: false,
  required_content_sources: null,
  group: 'Homebrew',
  artwork_url: null,
  meta_data: null,
});
const pulse = SpellSchema.parse({
  id: 991902,
  created_at: '',
  name: 'Fixture Pulse',
  rank: 1,
  traditions: ['ARCANE'],
  rarity: 'COMMON',
  availability: 'STANDARD',
  cast: 'TWO-ACTIONS',
  requirements: null,
  cost: null,
  trigger: null,
  defense: null,
  range: '30 feet',
  area: null,
  targets: null,
  duration: null,
  description: '',
  heightened: null,
  traits: [],
  content_source_id: source.id,
  version: '1.0',
  meta_data: {},
});
const wave = SpellSchema.parse({ ...pulse, id: 991903, name: 'Fixture Wave', rank: 2 });
const spells = [pulse, wave];
const choices = [first, second].map((id, index) =>
  OperationSchema.parse({
    id,
    type: 'select',
    data: {
      title: 'Select a Spell',
      modeType: 'FILTERED',
      optionType: 'SPELL',
      optionsFilters: {
        id: index ? '4dd41bb1-99c2-4691-8437-018a882b021a' : 'dafc677e-8404-4a32-b15a-2400618034b1',
        type: 'SPELL',
        level: {},
        knownSpellSource: 'TECHNOMANCER',
        ...(index ? { distinctRankFromSelections: [first] } : {}),
        spellData: { type: 'NORMAL', castingSource: 'TECHNOMANCER', listSources: ['TECHNOMANCER_CACHE'] },
      },
    },
  })
);
const original = CharacterSchema.parse({
  id: 991902,
  created_at: '',
  updated_at: '2026-10-10T00:00:00.000Z',
  user_id: actor,
  campaign_id: null,
  name: 'Database fixture',
  level: 8,
  experience: 0,
  hero_points: 1,
  hp_current: 1,
  hp_temp: 0,
  stamina_current: 0,
  resolve_current: 0,
  notes: null,
  roll_history: null,
  spells: {
    slots: [],
    list: [
      { spell_id: pulse.id, rank: 1, source: 'TECHNOMANCER' },
      { spell_id: pulse.id, rank: 3, source: 'TECHNOMANCER' },
      { spell_id: wave.id, rank: 2, source: 'TECHNOMANCER' },
    ],
    innate_casts: [],
    focus_point_current: 0,
  },
  inventory: { items: [], coins: { cp: 0, sp: 0, gp: 0, pp: 0 } },
  details: { conditions: [] },
  meta_data: { reset_hp: false },
  operation_data: { selections: { [`character_${predefined}`]: predefinedChoice } },
  variants: null,
  content_sources: { enabled: [source.id] },
  companions: { list: [] },
  options: { custom_operations: true },
  custom_operations: [
    ...choices,
    {
      id: predefined,
      type: 'select',
      data: {
        title: 'Predefined Spell',
        modeType: 'PREDEFINED',
        optionType: 'SPELL',
        optionsPredefined: [
          {
            id: predefinedChoice,
            type: 'SPELL',
            operation: {
              id: 'd1a2304b-6f11-489a-af95-a841c9068e39',
              type: 'giveSpell',
              data: { type: 'NORMAL', castingSource: 'TECHNOMANCER', rank: 1, spellId: pulse.id },
            },
          },
        ],
      },
    },
  ],
});

type WorkerControl = { hold: boolean; queued: Array<() => void>; release: () => void; restore: () => void };
type FixtureWindow = Window & { Worker: typeof Worker; databaseWorkerControl: WorkerControl };

describe('Source-owned database spell choices', () => {
  let saved = structuredClone(original);
  let spellIdReads = 0;
  const visit = () => {
    cy.visit(`/builder/${original.id}`, {
      onBeforeLoad(win) {
        const fixtureWindow = win as unknown as FixtureWindow;
        const NativeWorker = fixtureWindow.Worker;
        const control: WorkerControl = {
          hold: false,
          queued: [],
          release() {
            this.hold = false;
            for (const send of this.queued.splice(0)) send();
          },
          restore() {
            this.release();
            fixtureWindow.Worker = NativeWorker;
          },
        };
        fixtureWindow.databaseWorkerControl = control;
        fixtureWindow.Worker = class extends NativeWorker {
          private fixtureCalculation: boolean;
          constructor(url: string | URL, options?: WorkerOptions) {
            super(url, options);
            this.fixtureCalculation = /\/operations\.worker\./.test(new URL(String(url), win.location.href).pathname);
          }
          postMessage(message: unknown, options?: StructuredSerializeOptions | Transferable[]) {
            const send = () => {
              if (Array.isArray(options)) super.postMessage(message, options);
              else super.postMessage(message, options);
            };
            const packet = message as { execution?: { data?: { character?: { id?: number } } } };
            if (this.fixtureCalculation && control.hold && packet.execution?.data?.character?.id === original.id)
              control.queued.push(send);
            else send();
          }
        };
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
        win.localStorage.setItem('user-data', JSON.stringify(profile));
      },
    });
    cy.contains('.mantine-Accordion-control', /^Custom/, { timeout: 30000 }).click();
    customPanel().find('.selection-choice-base').should('have.length', 3);
  };

  beforeEach(() => {
    saved = structuredClone(original);
    spellIdReads = 0;
    cy.intercept('**/auth/v1/**', () => {
      throw new Error('Database fixture must not contact authentication');
    });
    cy.intercept('**/rest/v1/**', () => {
      throw new Error('Database fixture must not contact the database');
    });
    cy.intercept('**/storage/v1/**', () => {
      throw new Error('Database fixture must not contact storage');
    });
    cy.intercept('**/functions/v1/*', (req) => {
      expect(req.method, 'fixture API method').to.equal('POST');
      const endpoint = new URL(req.url).pathname.split('/').pop()!;
      let data: unknown;
      if (endpoint === 'get-user') data = profile;
      else if (endpoint === 'find-character') data = req.body.id !== undefined ? saved : [saved];
      else if (endpoint === 'update-character') {
        expect(req.body.id, 'only the synthetic character may be saved').to.equal(original.id);
        saved = CharacterSchema.parse({ ...saved, ...req.body, updated_at: new Date().toISOString() });
        data = [saved];
      } else if (endpoint === 'find-content-source') data = req.body.id !== undefined ? source : [source];
      else if (endpoint === 'find-spell') {
        if (typeof req.body.id === 'number') {
          spellIdReads++;
          data = spells.find((spell) => spell.id === req.body.id);
          expect(data, 'only seeded spells may be read by ID').not.to.equal(undefined);
        } else data = spells;
      } else if (
        [
          'get-content-versions',
          'find-ability-block',
          'find-item',
          'find-trait',
          'find-class',
          'find-ancestry',
          'find-background',
          'find-language',
          'find-archetype',
          'find-versatile-heritage',
          'find-class-archetype',
          'find-creature',
        ].includes(endpoint)
      )
        data = [];
      else throw new Error(`Unexpected database fixture API: ${endpoint}`);
      req.reply({ statusCode: 200, body: { status: 'success', data } });
    });
  });

  afterEach(() => {
    cy.window().then((win) => (win as unknown as FixtureWindow).databaseWorkerControl?.restore());
  });

  const customPanel = () =>
    cy
      .contains('.mantine-Accordion-control', /^Custom/, { timeout: 30000 })
      .closest('.mantine-Accordion-item')
      .find('.mantine-Accordion-panel');
  const selection = (index: number) => customPanel().find('.selection-choice-base').eq(index);
  const reopen = (index: number) => selection(index).find('button').eq(1).click();
  const searchPulse = () => cy.get('.mantine-Modal-body input[placeholder="Search spells"]').type('Fixture Pulse');
  const selectButtons = () =>
    cy.get('.mantine-Modal-body button').filter((_, button) => button.textContent === 'Select');

  it('keeps both ranks searchable and switches an unsaved choice while its recalculation is held', () => {
    visit();
    cy.window().then((win) => {
      (win as unknown as FixtureWindow).databaseWorkerControl.hold = true;
    });
    selection(0).contains('button', 'Select a Spell').click();
    searchPulse();
    selectButtons().should('have.length', 2).eq(0).click();
    cy.window().should((win) =>
      expect((win as unknown as FixtureWindow).databaseWorkerControl.queued.length).to.be.greaterThan(0)
    );
    reopen(0);
    searchPulse();
    selectButtons().should('have.length', 2).eq(0).should('be.disabled');
    selectButtons().eq(1).should('not.be.disabled').click();
    reopen(0);
    searchPulse();
    selectButtons().eq(0).should('not.be.disabled');
    selectButtons().eq(1).should('be.disabled');
    cy.get('.mantine-Modal-header button').click();
    cy.window().then((win) => (win as unknown as FixtureWindow).databaseWorkerControl.release());
    cy.wrap(null, { timeout: 15000 }).should(() =>
      expect(saved.operation_data!.selections[`character_${first}`]).to.equal(`${pulse.id}:3`)
    );
    cy.reload();
    cy.contains('.mantine-Accordion-control', /^Custom/, { timeout: 30000 }).click();
    reopen(0);
    searchPulse();
    selectButtons().should('have.length', 2).eq(0).should('not.be.disabled');
    selectButtons().eq(1).should('be.disabled');
    cy.screenshot('database-spell-ranks-saved');
  });

  it('limits only the second choice to a different rank from the first saved choice', () => {
    saved.operation_data!.selections[`character_${first}`] = `${pulse.id}:3`;
    visit();
    selection(1).contains('button', 'Select a Spell').click();
    searchPulse();
    selectButtons().should('have.length', 1).should('not.be.disabled');
    selectButtons().first().parents('.mantine-Group-root').first().should('contain.text', '1.');
    selectButtons().first().click();
    cy.wrap(null, { timeout: 15000 }).should(() =>
      expect(saved.operation_data!.selections[`character_${second}`]).to.equal(`${pulse.id}:1`)
    );
  });

  it('retains numeric fetching and selected state for PREDEFINED authored UUIDs', () => {
    visit();
    cy.wrap(null, { timeout: 15000 }).should(() => expect(spellIdReads).to.be.greaterThan(0));
    reopen(2);
    searchPulse();
    selectButtons().should('have.length', 1).should('be.disabled');
    cy.then(() => expect(saved.operation_data!.selections[`character_${predefined}`]).to.equal(predefinedChoice));
  });
});
