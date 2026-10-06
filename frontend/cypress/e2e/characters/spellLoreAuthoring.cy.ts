import { AbilityBlockSchema, CharacterSchema, ContentSourceSchema, SpellSchema } from '../../../src/schemas/content';

const actor = '00000000-0000-4000-8000-000000000181';
const profile = { id: 990181, user_id: actor, display_name: 'Authoring Fixture', is_admin: false, is_mod: false };
const source = ContentSourceSchema.parse({
  id: 990181,
  created_at: '',
  name: 'Authoring Fixture',
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
const lore = AbilityBlockSchema.parse({
  id: 990210,
  created_at: '',
  name: 'Additional Lore',
  type: 'feat',
  level: 1,
  actions: null,
  rarity: 'COMMON',
  prerequisites: [],
  frequency: null,
  cost: null,
  trigger: null,
  requirements: null,
  access: null,
  description: '',
  special: null,
  operations: [],
  traits: [],
  content_source_id: source.id,
  version: '1.0',
  meta_data: {},
});
const spell = SpellSchema.parse({
  id: 990181,
  created_at: '',
  name: 'Detect Magic',
  rank: 0,
  traditions: ['OCCULT'],
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
  operations: [],
  traits: [],
  content_source_id: source.id,
  version: '1.0',
  meta_data: {},
});
const metadata = { type: 'INNATE' as const, tradition: 'OCCULT' as const, rank: 0, casts: 1 };
const original = CharacterSchema.parse({
  id: 990181,
  created_at: '',
  updated_at: '2026-10-05T00:00:00.000Z',
  user_id: actor,
  campaign_id: null,
  name: 'Authoring Fixture',
  level: 7,
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
  content_sources: { enabled: [source.id] },
  companions: { list: [] },
  options: { custom_operations: true },
  custom_operations: [
    { id: 'direct', type: 'giveSpell', data: { ...metadata, spellId: spell.id } },
    { id: 'lore', type: 'giveAbilityBlock', data: { type: 'feat', abilityBlockId: lore.id } },
    {
      id: 'filtered',
      type: 'select',
      data: {
        title: 'Filtered spell',
        modeType: 'FILTERED',
        optionType: 'SPELL',
        optionsFilters: { id: 'filter', type: 'SPELL', level: { min: 0, max: 1 }, spellData: metadata },
      },
    },
    {
      id: 'predefined',
      type: 'select',
      data: {
        title: 'Predefined spell',
        modeType: 'PREDEFINED',
        optionType: 'SPELL',
        optionsPredefined: [
          {
            id: 'choice',
            type: 'SPELL',
            operation: { id: 'give', type: 'giveSpell', data: { ...metadata, spellId: spell.id } },
          },
        ],
      },
    },
  ],
});

describe('Spell attribute and granted Lore authoring', () => {
  let saved = structuredClone(original);
  beforeEach(() => {
    saved = structuredClone(original);
    cy.intercept('**/auth/v1/**', () => {
      throw new Error('Synthetic authoring must not contact authentication');
    });
    cy.intercept('POST', '**/functions/v1/*', (req) => {
      const endpoint = new URL(req.url).pathname.split('/').pop()!;
      let data: unknown = [];
      if (endpoint === 'get-user') data = profile;
      else if (endpoint === 'find-character') data = typeof req.body.id === 'number' ? saved : [saved];
      else if (endpoint === 'update-character') {
        saved = CharacterSchema.parse({ ...saved, ...req.body, updated_at: new Date().toISOString() });
        data = [saved];
      } else if (endpoint === 'find-content-source') data = typeof req.body.id === 'number' ? source : [source];
      else if (endpoint === 'find-ability-block') data = typeof req.body.id === 'number' ? lore : [lore];
      else if (endpoint === 'find-spell') data = typeof req.body.id === 'number' ? spell : [spell];
      else if (!endpoint.startsWith('find-') && endpoint !== 'get-content-versions')
        throw new Error(`Unexpected authoring request: ${endpoint}`);
      req.reply({ statusCode: 200, body: { status: 'success', data } });
    });
    cy.visit(`/builder/${original.id}`, {
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
    cy.contains('[role="tab"]', 'Options', { timeout: 30000 }).click();
    cy.contains('button', 'Open Operations').click();
    cy.get<HTMLInputElement>('input')
      .filter((_, input) => (input as HTMLInputElement).labels?.[0]?.textContent === 'Casting attribute')
      .should('have.length', 3);
  });

  const attribute = (index: number) =>
    cy
      .get<HTMLInputElement>('input')
      .filter((_, input) => (input as HTMLInputElement).labels?.[0]?.textContent === 'Casting attribute')
      .eq(index);
  const loreInput = () =>
    cy
      .get<HTMLInputElement>('input')
      .filter((_, input) => (input as HTMLInputElement).labels?.[0]?.textContent === 'Granted Lore (optional)');
  const pick = (index: number, label: string) => {
    attribute(index).click();
    cy.get('[role="option"]')
      .filter(':visible')
      .contains(new RegExp(`^${label}$`))
      .click();
  };

  it('persists all three spell metadata controls and the Lore subject across reload', () => {
    pick(0, 'Intelligence');
    pick(1, 'Wisdom');
    pick(2, 'Constitution');
    loreInput().type('Elven Lore');
    cy.wrap(null, { timeout: 15000 }).should(() => {
      const operations = saved.custom_operations!;
      expect(operations[0].type === 'giveSpell' && operations[0].data.attribute).to.eq('ATTRIBUTE_INT');
      expect(operations[1].type === 'giveAbilityBlock' && operations[1].data.grantedLore).to.eq('Elven Lore');
      expect(
        operations[2].type === 'select' &&
          operations[2].data.optionsFilters?.type === 'SPELL' &&
          operations[2].data.optionsFilters.spellData?.attribute
      ).to.eq('ATTRIBUTE_WIS');
      expect(
        operations[3].type === 'select' &&
          operations[3].data.optionsPredefined?.[0].type === 'SPELL' &&
          operations[3].data.optionsPredefined[0].operation.data.attribute
      ).to.eq('ATTRIBUTE_CON');
    });
    cy.reload();
    cy.contains('[role="tab"]', 'Options', { timeout: 30000 }).click();
    cy.contains('button', 'Open Operations').click();
    attribute(0).should('have.value', 'Intelligence');
    attribute(1).should('have.value', 'Wisdom');
    attribute(2).should('have.value', 'Constitution');
    loreInput().should('have.value', 'Elven Lore');
    cy.contains('Blank preserves existing choice rules.').should('not.exist');
    cy.screenshot('spell-lore-controls-reloaded');
  });

  it('clearing an attribute restores the default and changing spell mode hides the control', () => {
    pick(0, 'Intelligence');
    cy.wrap(null, { timeout: 15000 }).should(() =>
      expect(saved.custom_operations![0].type === 'giveSpell' && saved.custom_operations![0].data.attribute).to.eq(
        'ATTRIBUTE_INT'
      )
    );
    attribute(0).closest('.mantine-Select-root').find('button').click();
    cy.wrap(null, { timeout: 15000 }).should(() =>
      expect(saved.custom_operations![0].type === 'giveSpell' && saved.custom_operations![0].data.attribute).to.eq(
        undefined
      )
    );
    cy.get('.mantine-Modal-body')
      .find('label')
      .contains(/^Normal$/)
      .first()
      .click();
    cy.get<HTMLInputElement>('input')
      .filter((_, input) => (input as HTMLInputElement).labels?.[0]?.textContent === 'Casting attribute')
      .should('have.length', 2);
  });

  for (const width of [390, 1280]) {
    it(`fits the approved controls at ${width}px`, () => {
      cy.viewport(width, 900);
      cy.reload();
      cy.contains('[role="tab"]', 'Options', { timeout: 30000 }).click();
      cy.contains('button', 'Open Operations').click();
      attribute(0).should('be.visible');
      loreInput().should('exist');
      cy.document().then((doc) =>
        expect(doc.documentElement.scrollWidth).to.be.at.most(doc.documentElement.clientWidth)
      );
      cy.screenshot(`spell-lore-${width}`);
    });
  }
});
