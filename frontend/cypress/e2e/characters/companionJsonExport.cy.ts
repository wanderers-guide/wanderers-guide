import { CharacterSchema, ContentSourceSchema, CreatureSchema } from '../../../src/schemas/content';

const actor = '00000000-0000-4000-8000-000000000225';
const profile = { id: 990225, user_id: actor, display_name: 'Export Fixture', is_admin: false, is_mod: false };
const source = ContentSourceSchema.parse({
  id: 990225,
  created_at: '',
  name: 'Export Fixture Source',
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
const living = {
  name: 'Companion export fixture',
  level: 5,
  experience: 0,
  hp_current: 3,
  hp_temp: 0,
  stamina_current: 0,
  resolve_current: 0,
  notes: null,
  roll_history: null,
  spells: null,
  inventory: { items: [], coins: { cp: 0, sp: 0, gp: 0, pp: 0 } },
  operation_data: { selections: {} },
  meta_data: { reset_hp: false },
};
const child = CreatureSchema.parse({
  ...living,
  id: 990226,
  name: 'First companion',
  level: 2,
  created_at: '',
  rarity: 'COMMON',
  content_source_id: source.id,
  version: '1.0',
  deprecated: false,
  details: {
    description: '',
    conditions: [{ name: 'Frightened', value: 1, description: '', for_creature: true, for_object: false }],
  },
  abilities_base: [],
  abilities_added: [],
  operations: [
    { id: 'hp', type: 'setValue', data: { variable: 'MAX_HEALTH_ANCESTRY', value: 20 } },
    { id: 'con', type: 'setValue', data: { variable: 'ATTRIBUTE_CON', value: { value: 2 } } },
    { id: 'dex', type: 'setValue', data: { variable: 'ATTRIBUTE_DEX', value: { value: 3 } } },
    { id: 'armor', type: 'setValue', data: { variable: 'UNARMORED_DEFENSE', value: { value: 'T' } } },
    {
      id: 'owner-speed',
      type: 'bindValue',
      data: { variable: 'SPEED', value: { storeId: 'CHARACTER', variable: 'SPEED' } },
    },
    {
      id: 'self-speed',
      type: 'bindValue',
      data: { variable: 'SPEED_CLIMB', value: { storeId: 'COMPANION_0', variable: 'SPEED' } },
    },
  ],
});
const second = CreatureSchema.parse({
  ...child,
  name: 'Second companion',
  details: { description: '', conditions: [] },
  operations: [{ id: 'hp', type: 'setValue', data: { variable: 'MAX_HEALTH_ANCESTRY', value: 10 } }],
});
const character = CharacterSchema.parse({
  ...living,
  id: 990224,
  created_at: '',
  campaign_id: null,
  user_id: actor,
  hero_points: 1,
  details: { conditions: [] },
  options: { custom_operations: true },
  variants: null,
  custom_operations: [{ id: 'owner-speed', type: 'setValue', data: { variable: 'SPEED', value: 35 } }],
  content_sources: { enabled: [source.id] },
  companions: { list: [child, second] },
});

describe('Companion JSON export', () => {
  it('downloads the version 4 file through the existing menu with calculated companions and unchanged import data', () => {
    cy.intercept('**/auth/v1/**', () => {
      throw new Error('Export fixture must not contact authentication');
    });
    cy.intercept('POST', '**/functions/v1/*', (req) => {
      const endpoint = new URL(req.url).pathname.split('/').pop()!;
      let data: unknown;
      if (endpoint === 'get-user') data = profile;
      else if (endpoint === 'get-content-versions') data = [];
      else if (endpoint === 'find-character') data = [character];
      else if (endpoint === 'find-content-source') data = [source];
      else if (
        [
          'find-ability-block',
          'find-trait',
          'find-spell',
          'find-class',
          'find-ancestry',
          'find-background',
          'find-item',
          'find-language',
          'find-creature',
          'find-archetype',
          'find-class-archetype',
          'find-versatile-heritage',
        ].includes(endpoint)
      )
        data = [];
      else throw new Error(`Unexpected export fixture request: ${endpoint}`);
      req.reply({ statusCode: 200, body: { status: 'success', data } });
    });
    cy.visit('/characters', {
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
        win.localStorage.setItem('user-data', JSON.stringify(profile));
      },
    });
    cy.get(`a[href="/builder/${character.id}"]`, { timeout: 30000 })
      .closest('.mantine-Group-root')
      .find('[aria-label="Options"]')
      .click();
    cy.contains('Export to JSON').click();
    cy.readFile(`${Cypress.config('downloadsFolder')}/companion-export-fixture.json`, { timeout: 30000 }).then(
      (result) => {
        expect(result.version).to.eq(4);
        expect(CharacterSchema.parse(result.character)).to.deep.eq(character);
        expect(result.content.companions).to.have.length(2);
        expect(
          result.content.companions.map((entry: { index: number; id: number }) => [entry.index, entry.id])
        ).to.deep.eq([
          [0, child.id],
          [1, second.id],
        ]);
        expect(result.content.companions[0].content.max_hp).to.eq(24);
        expect(result.content.companions[0].content.ac).to.eq(16);
        expect(
          result.content.companions[0].content.speeds.find((speed: { name: string }) => speed.name === 'SPEED').value
            .total
        ).to.eq(35);
        expect(
          result.content.companions[0].content.speeds.find((speed: { name: string }) => speed.name === 'SPEED_CLIMB')
            .value.total
        ).to.eq(35);
        expect(result.content.companions[1].content.max_hp).to.eq(10);
      }
    );
    cy.screenshot('companion-json-export-existing-menu');
  });
});
