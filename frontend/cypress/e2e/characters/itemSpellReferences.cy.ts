import type {
  AbilityBlock,
  Character,
  Class as CharacterClass,
  Condition,
  InventoryItem,
  Item,
} from '../../../src/schemas/content';
import { InventoryItemSchema, ItemSchema } from '../../../src/schemas/content';

type ItemSpellFixture = { key: string; gm: { email: string; password: string } };

describe('Treasure Vault item spell references', () => {
  let fixture: ItemSpellFixture | undefined;
  let token: string | undefined;
  let characterId: number | undefined;
  let calculationFailures: string[] = [];
  let pendingContentReads = new Map<string, number>();

  const request = <T>(endpoint: string, body: Record<string, unknown>): Cypress.Chainable<T> =>
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
        return cy.wrap<T>(body.data, { log: false });
      });

  const readCharacter = () => request<Character>('find-character', { id: characterId });
  const sheetLoaded = () => {
    cy.document().then(
      { timeout: 90000 },
      (document) =>
        new Cypress.Promise<void>((resolve, reject) => {
          const started = Date.now();
          const check = () => {
            const text = document.body.textContent ?? '';
            const pending = [...pendingContentReads.keys()].join(', ') || 'none';
            if (text.includes("Couldn't calculate this character")) {
              reject(
                new Error(
                  `Character calculation failed: ${calculationFailures.join('; ') || 'no console detail'}. Pending content reads: ${pending}`
                )
              );
            } else if (
              [...document.querySelectorAll('p')].some(
                (element) => element.textContent?.trim() === 'Hit Points' && Cypress.dom.isVisible(element)
              )
            )
              resolve();
            else if (Date.now() - started >= 89000)
              reject(new Error(`Character sheet did not finish loading. Pending content reads: ${pending}`));
            else setTimeout(check, 100);
          };
          check();
        })
    );
    cy.contains('Hit Points', { timeout: 90000 }).should('be.visible');
    cy.get('html').should('have.attr', 'data-mantine-color-scheme', 'dark');
    cy.contains("Couldn't calculate this character").should('not.exist');
  };
  const spellPanel = (phone: boolean) => {
    if (phone) {
      cy.get('button[aria-label="Panel Grid"]').click();
      cy.contains('button', /^Spells$/).click();
    } else {
      cy.get('body').then(($body) => {
        const tab = $body.find('[role="tab"]').filter((_, element) => element.textContent?.trim() === 'Spells');
        if (tab.length) cy.wrap(tab.first()).click();
        else {
          cy.get('button[aria-label="Tab Options"]').trigger('mouseover');
          cy.contains('[role="menuitem"]', /^Spells$/).click();
        }
      });
    }
    cy.get('[data-wg-name="spells-accordion"]', { timeout: 30000 }).should('be.visible');
  };
  const expand = (label: string) => {
    cy.contains('button.mantine-Accordion-control', label, { timeout: 30000 }).then(($button) => {
      if ($button.attr('aria-expanded') !== 'true') {
        // The staff control also contains Add Charges. Click its label, not that nested button.
        cy.wrap($button).contains('p', label).scrollIntoView().click();
      }
    });
    return cy
      .contains('button.mantine-Accordion-control', label, { timeout: 30000 })
      .should('have.attr', 'aria-expanded', 'true')
      .then(($control) => {
        const regionId = $control.attr('aria-controls');
        expect(regionId, 'expanded accordion region').to.be.a('string').and.not.be.empty;
        /** Expanded aria state precedes Mantine's height transition and safe scrolling. */
        return cy
          .get(`[id="${regionId}"]`, { timeout: 30000 })
          .should('exist')
          .and('not.have.attr', 'aria-hidden', 'true')
          .should(($region) => {
            expect($region[0].style.height, 'accordion height transition settled').to.eq('');
            expect($region[0].style.overflow, 'accordion overflow transition settled').to.eq('');
          });
      });
  };
  const showItemSections = () => {
    expand('Boreal Staff');
    expand('Spellhearts');
    expand('Wands');
  };
  const spellheartButton = (tier: 'Greater' | 'Major') => {
    const label = new RegExp(`Brightbloom Posy \\(${tier}\\)[\\s\\S]*Petal Storm`);
    cy.contains('button', label, { timeout: 30000 }).scrollIntoView();
    return cy.contains('button', label, { timeout: 30000 });
  };
  const elementalButton = () => {
    cy.contains('button', 'Elemental Absorption', { timeout: 30000 }).scrollIntoView();
    return cy.contains('button', 'Elemental Absorption', { timeout: 30000 });
  };
  const wandButton = () => {
    const label = /Wand of Refracting Rays \(6th-level\)[\s\S]*Chromatic Ray/;
    cy.contains('button', label, { timeout: 30000 }).scrollIntoView();
    return cy.contains('button', label, { timeout: 30000 });
  };
  const expectCastingRank = (open: () => void, name: string, rank: number) => {
    open();
    cy.contains('.mantine-Drawer-root', name, { timeout: 30000 }).within(() => {
      cy.contains('button', new RegExp(`^Cast Spell ${rank}$`))
        .should('be.visible')
        .and('not.be.disabled');
      cy.get('button[aria-label="Close drawer"]').click();
    });
    cy.get('.mantine-Drawer-content, .mantine-Drawer-overlay').should('not.exist');
  };
  const normalPicker = () => {
    cy.get('[data-wg-name="prepared-druid"]', { timeout: 30000 }).contains('button', 'Manage').scrollIntoView().click();
    cy.contains('.mantine-Modal-content', 'Manage Spells - Druid').as('manageSpells');
    cy.get('@manageSpells')
      .find('[data-wg-name="rank-4"]')
      .contains('button', /^Select Spell$/)
      .first()
      .scrollIntoView()
      .click();
    cy.get('input[placeholder="Search spells"]').last().closest('.mantine-Modal-body').as('normalPicker');
  };
  const searchPicker = (name: string) =>
    cy.get('@normalPicker').find('input[placeholder="Search spells"]').clear().type(name);
  const closePicker = () => {
    cy.get('@normalPicker').closest('.mantine-Modal-content').find('button.mantine-Modal-close').click();
    cy.contains('.mantine-Modal-title', /^Select Spell$/).should('not.exist');
    cy.get('@manageSpells').find('button.mantine-Modal-close').click();
  };

  beforeEach(() => {
    fixture = undefined;
    token = undefined;
    characterId = undefined;
    calculationFailures = [];
    pendingContentReads = new Map();
    cy.on('window:before:load', (window) => {
      const originalError = window.console.error.bind(window.console);
      window.console.error = (...args: unknown[]) => {
        if (args[0] === 'Character calculation failed:') {
          const error = args[1];
          calculationFailures.push(
            typeof error === 'object' && error !== null && 'message' in error ? String(error.message) : String(error)
          );
        }
        originalError(...args);
      };
    });
    cy.intercept('POST', '**/functions/v1/**', (request) => {
      const endpoint = new URL(request.url).pathname.split('/').at(-1) ?? '';
      if (!endpoint.startsWith('find-') && endpoint !== 'get-content-versions') return;
      pendingContentReads.set(endpoint, (pendingContentReads.get(endpoint) ?? 0) + 1);
      request.on('after:response', () => {
        const remaining = (pendingContentReads.get(endpoint) ?? 1) - 1;
        if (remaining > 0) pendingContentReads.set(endpoint, remaining);
        else pendingContentReads.delete(endpoint);
      });
    });
    for (const origin of [Cypress.env('functions_url'), Cypress.config('baseUrl')]) {
      const url = new URL(String(origin));
      expect(url.protocol, 'local HTTP test origin').to.eq('http:');
      expect(['localhost', '127.0.0.1', '[::1]'], 'local test hostname').to.include(url.hostname);
    }
    cy.task<ItemSpellFixture>('campaignFixture:create', null, { log: false }).then((created) => {
      fixture = created;
      cy.intercept('POST', '**/auth/v1/token*').as('itemSpellSignIn');
      cy.visit('/login?redirect=characters');
      cy.get('input[name="email"]:visible').type(created.gm.email, { log: false });
      cy.get('input[name="password"]:visible').type(created.gm.password, { log: false });
      cy.contains('button', 'Sign in with Email').click();
      cy.wait('@itemSpellSignIn', { timeout: 30000 }).then(({ response }) => {
        expect(response?.statusCode, 'local sign-in response').to.eq(200);
        token = response?.body.access_token;
        expect(typeof token, 'synthetic account session').to.eq('string');
      });
      cy.location('pathname', { timeout: 10000 }).should('eq', '/characters');
    });
    cy.then(() => request<CharacterClass[]>('find-class', { content_sources: [1] })).then((classes) => {
      const playerClass = classes.find((entry) => entry.name === 'Druid');
      expect(playerClass, 'published primal prepared class').to.exist;
      request<Item[]>('find-item', { id: [11794, 11813, 11814, 12676] })
        .then((items) => {
          expect(items.map((item) => item.id).sort()).to.deep.eq([11794, 11813, 11814, 12676]);
          expect(items.every((item) => item.content_source_id === 16)).to.eq(true);
          expect(items.find((item) => item.id === 11794)?.description).to.include('(link_spell_8867)');
          expect(items.find((item) => item.id === 11814)?.description).to.include(
            '6th-rank *[petal storm](link_spell_8999)*'
          );
          expect(items.find((item) => item.id === 12676)?.name).to.eq('Wand of Refracting Rays (6th-level)');
          expect(items.find((item) => item.id === 12676)?.description).to.include(
            'You cast 6th-rank *[chromatic ray](link_spell_5322)*'
          );
          const inventory: InventoryItem[] = items.map((item) => ({
            id: crypto.randomUUID(),
            item:
              item.id === 11794 || item.id === 12676
                ? {
                    ...item,
                    meta_data: {
                      ...item.meta_data,
                      bulk: item.meta_data?.bulk ?? {},
                      charges: { max: item.id === 11794 ? 6 : 1, current: 0 },
                    },
                  }
                : item,
            is_formula: false,
            is_equipped: item.id === 11794,
            is_invested: false,
            is_implanted: false,
            container_contents: [],
          }));
          return request<Character>('create-character', {
            name: 'Treasure Vault item spell check',
            level: 12,
            hp_current: 60,
            details: { class: playerClass, conditions: [] },
            inventory: { items: inventory, coins: { cp: 0, sp: 0, gp: 0, pp: 0 } },
            content_sources: { enabled: [1, 3, 16] },
            meta_data: { reset_hp: false },
            options: { custom_operations: true, ignore_bulk_limit: true },
            custom_operations: [
              ...Object.entries({ STR: 0, DEX: 3, CON: 2, INT: 0, WIS: 4, CHA: 0 }).map(([attribute, value]) => ({
                id: crypto.randomUUID(),
                type: 'setValue',
                data: { variable: `ATTRIBUTE_${attribute}`, value: { value } },
              })),
              { id: crypto.randomUUID(), type: 'setValue', data: { variable: 'MAX_HEALTH_ANCESTRY', value: 8 } },
              { id: crypto.randomUUID(), type: 'setValue', data: { variable: 'SPEED', value: 25 } },
            ],
          });
        })
        .then((created) => {
          characterId = created.id;
        });
    });
  });

  afterEach(() => {
    if (characterId && token)
      request('delete-content', { id: characterId, type: 'character' }).then(() =>
        request<Character[]>('find-character', { id: [characterId] }).should('deep.equal', [])
      );
    if (fixture) cy.task('campaignFixture:cleanup', fixture.key, { log: false });
  });

  it('recovers the saved Ash Puppet cast without rewriting its snapshot or initializing charges on mount', () => {
    cy.viewport(1280, 900);
    let legacy: InventoryItem;
    let casting = false;
    // Independently reviewed historical snapshot, not copied from the runtime resolver.
    const historicalDescription =
      "This wand is composed of ash that has been compressed, shaped, and sealed with a clear lacquer. When you trace the wand's tip along a solid surface, it leaves a black trail of charcoal. Writing with the wand in this way never damages or wears the wand down.\n\n**Activate** Cast a Spell\n\n**Effect** You cast \\[\\[Disintegrate\\]\\]. If the spell reduces a living creature to fine powder, you animate that creature's ashes into a \\[\\[Sulfur Zombie\\]\\] with the same general appearance as the disintegrated creature. You control this sulfur zombie, which gains the minion and summoned traits. You can issue a verbal command to the sulfur zombie as a single action with the auditory and concentrate traits. The sulfur zombie crumbles into inanimate ash when reduced to 0 Hit Points or after 1 minute, whichever comes first.";
    cy.then(() => request<Item[]>('find-item', { id: [12695] }))
      .then((items) => {
        expect(items).to.have.length(1);
        expect(items[0].description).to.include('**Effect** You cast [Disintegrate](link_spell_4571).');
        const item = ItemSchema.parse(items[0]);
        expect(item.created_at).to.eq('2024-04-19T04:25:49.043177+00:00');
        if (!item.meta_data) throw new Error('Published Ash Puppet metadata is required for this snapshot fixture.');
        item.description = historicalDescription;
        item.meta_data = { ...item.meta_data };
        delete item.meta_data.charges;
        legacy = InventoryItemSchema.parse({
          id: crypto.randomUUID(),
          item,
          is_formula: false,
          is_equipped: false,
          is_invested: false,
          is_implanted: false,
          container_contents: [],
        });
        expect(legacy.item).not.to.have.property('uuid');
        return readCharacter();
      })
      .then((saved) =>
        request('update-character', {
          id: characterId,
          expected_updated_at: saved.updated_at,
          inventory: { ...saved.inventory, items: [...saved.inventory!.items, legacy] },
        })
      );
    cy.intercept('POST', '**/functions/v1/update-character', (request) => {
      if (request.body.id !== characterId) return;
      const entry = request.body.inventory?.items?.find((item: InventoryItem) => item.id === legacy?.id);
      if (!entry) return;
      if (!casting) expect(entry, 'saved snapshot unchanged by actual mount and drawer opening').to.deep.eq(legacy);
      else if (entry.item.meta_data?.charges?.current === 1) request.alias = 'savedAshCast';
    });
    const ashButton = () => {
      const label = /Wand of the Ash Puppet[\s\S]*Disintegrate/;
      cy.contains('button', label, { timeout: 30000 }).scrollIntoView();
      return cy.contains('button', label, { timeout: 30000 });
    };
    const unchanged = () =>
      readCharacter().then((saved) => {
        expect(saved.inventory!.items.find((entry) => entry.id === legacy.id)).to.deep.eq(legacy);
      });
    cy.then(() => cy.visit(`/sheet/${characterId}`));
    sheetLoaded();
    spellPanel(false);
    expand('Wands');
    expectCastingRank(() => ashButton().click(), 'Disintegrate', 6);
    unchanged();
    cy.reload();
    sheetLoaded();
    spellPanel(false);
    expand('Wands');
    expectCastingRank(() => ashButton().click(), 'Disintegrate', 6);
    unchanged();
    ashButton().click();
    cy.contains('.mantine-Drawer-root', 'Disintegrate').within(() => {
      cy.contains('button', /^Cast Spell 6$/)
        .should('be.visible')
        .and('not.be.disabled');
      cy.get('.mantine-Drawer-content').should('be.visible');
    });
    cy.document().screenshot('treasure-vault-saved-ash-disintegrate-rank-6', { capture: 'viewport' });
    cy.contains('.mantine-Drawer-root', 'Disintegrate').within(() => {
      cy.then(() => {
        casting = true;
      });
      cy.contains('button', /^Cast Spell 6$/)
        .should('not.be.disabled')
        .click();
    });
    cy.wait('@savedAshCast', { timeout: 30000 }).its('response.body.status').should('eq', 'success');
    readCharacter().then((saved) => {
      const cast = saved.inventory!.items.find((entry) => entry.id === legacy.id)!;
      expect(cast.item.meta_data?.charges?.current).to.eq(1);
      expect(cast.item.meta_data?.charges?.max).to.eq(undefined);
      const expected = structuredClone(legacy);
      if (!expected.item.meta_data) throw new Error('Saved Ash Puppet metadata must remain present.');
      expected.item.meta_data = { ...expected.item.meta_data, charges: { current: 1 } };
      expect(cast).to.deep.eq(expected);
    });
  });

  it('uses the real casting source for an older saved Spellheart and preserves its explicit override', () => {
    cy.viewport(1280, 900);
    let legacy: InventoryItem;
    // Reviewed pre100 body: Bullhorn only, without the later Biting Words activation.
    const historicalDescription =
      "This two-pronged fork of metal emits a constant low hum, vibrating slightly when touched. The spell attack roll of any spell cast by Activating this item is +9, and the spell DC is 19.\n\n*   **Armor** You gain resistance 2 to [sonic](link_trait_1484) damage and a +1 item bonus to saving throws against effects with the [auditory](link_trait_1469) or [sonic](link_trait_1484) trait.\n    \n*   **Weapon** After you cast a [sonic](link_trait_1484) spell by activating the fork, the weapon reverberates with trapped sound waves. Your next [Strike](link_action_19856) causes the target to be deafened for 1 round if it hits (or for 3 rounds on a critical hit). If you don't make a [Strike](link_action_19856) by the end of your next turn, the sound waves dissipate with no effect.\n    \n\n**Activate** [Cast a Spell](link_action_19611); **Effect** You cast [bullhorn](link_spell_6722).";
    cy.then(() => request<Item[]>('find-item', { id: [12326] }))
      .then((items) => {
        expect(items).to.have.length(1);
        expect(items[0].meta_data?.spellheart_casting).to.deep.eq({ attack: 9, dc: 19 });
        const item = ItemSchema.parse(items[0]);
        expect(item.created_at).to.eq('2024-04-19T04:21:32.107616+00:00');
        if (!item.meta_data)
          throw new Error('Published Resonating Fork metadata is required for this snapshot fixture.');
        item.description = historicalDescription;
        item.meta_data = { ...item.meta_data };
        delete item.meta_data.spellheart_casting;
        legacy = InventoryItemSchema.parse({
          id: crypto.randomUUID(),
          item,
          is_formula: false,
          is_equipped: false,
          is_invested: false,
          is_implanted: false,
          container_contents: [],
        });
        expect(legacy.item).not.to.have.property('uuid');
        expect(legacy.item.meta_data).not.to.have.property('spellheart_casting');
        return readCharacter();
      })
      .then((saved) =>
        request('update-character', {
          id: characterId,
          expected_updated_at: saved.updated_at,
          inventory: { ...saved.inventory, items: [...saved.inventory!.items, legacy] },
        })
      );
    cy.intercept('POST', '**/functions/v1/update-character', (request) => {
      if (request.body.id !== characterId) return;
      const entry = request.body.inventory?.items?.find((item: InventoryItem) => item.id === legacy?.id);
      if (entry) expect(entry, 'saved Spellheart snapshot unchanged by fallback or drawer opening').to.deep.eq(legacy);
    });
    const unchanged = () =>
      readCharacter().then((saved) => {
        expect(saved.content_sources?.enabled).to.deep.eq([1, 3, 16]);
        expect(saved.inventory!.items.find((entry) => entry.id === legacy.id)).to.deep.eq(legacy);
      });
    const showBullhorn = (attack: number, dc: number, screenshot?: string) => {
      spellPanel(false);
      expand('Spellhearts');
      cy.contains('button', /Resonating Fork[\s\S]*Biting Words/).should('not.exist');
      const label = /Resonating Fork[\s\S]*Bullhorn/;
      cy.contains('button', label, { timeout: 30000 }).scrollIntoView();
      cy.contains('button', label, { timeout: 30000 }).click();
      cy.contains('.mantine-Drawer-root', 'Bullhorn', { timeout: 30000 }).within(() => {
        cy.contains('button', /^Cast Cantrip 6$/)
          .should('be.visible')
          .and('not.be.disabled');
        cy.contains('span', /^Attack$/)
          .next('span')
          .should(($value) => {
            expect($value.text().trim().split('/')[0].trim(), 'first spell attack modifier').to.eq(`+${attack}`);
          });
        cy.contains('span', /^DC$/).next('span').should('have.text', String(dc));
        cy.get('.mantine-Drawer-content').should('be.visible');
      });
      if (screenshot) cy.document().screenshot(screenshot, { capture: 'viewport' });
      cy.contains('.mantine-Drawer-root', 'Bullhorn', { timeout: 30000 }).within(() => {
        cy.get('button[aria-label="Close drawer"]').click();
      });
      cy.get('.mantine-Drawer-content, .mantine-Drawer-overlay').should('not.exist');
    };
    cy.then(() => cy.visit(`/sheet/${characterId}`));
    sheetLoaded();
    // Expert proficiency (4) + level 12 + Wisdom 4 = +20, DC30.
    // The incompatible NONE/Charisma0 path would display +16, DC26 instead.
    showBullhorn(20, 30, 'treasure-vault-saved-spellheart-bullhorn-higher-casting-source');
    unchanged();
    cy.reload();
    sheetLoaded();
    showBullhorn(20, 30);
    unchanged();

    cy.visit('/characters');
    readCharacter().then((saved) => {
      if (!legacy.item.meta_data) throw new Error('Saved Resonating Fork metadata must remain present.');
      legacy = InventoryItemSchema.parse({
        ...legacy,
        item: {
          ...legacy.item,
          meta_data: { ...legacy.item.meta_data, spellheart_casting: { attack: 30, dc: 40 } },
        },
      });
      return request('update-character', {
        id: characterId,
        expected_updated_at: saved.updated_at,
        inventory: {
          ...saved.inventory,
          items: saved.inventory!.items.map((entry) => (entry.id === legacy.id ? legacy : entry)),
        },
      });
    });
    cy.then(() => cy.visit(`/sheet/${characterId}`));
    sheetLoaded();
    showBullhorn(30, 40, 'treasure-vault-saved-spellheart-bullhorn-own-printed-override');
    unchanged();
    cy.reload();
    sheetLoaded();
    showBullhorn(30, 40);
    unchanged();
  });

  for (const scenario of [
    {
      className: 'Wizard',
      attribute: 'INT',
      itemId: 12695,
      itemName: 'Wand of the Ash Puppet',
      section: 'Wands',
      spellName: 'Disintegrate',
      rank: 6,
      maxCharges: 1,
    },
    {
      className: 'Cleric',
      attribute: 'WIS',
      itemId: 11679,
      itemName: 'Accursed Staff',
      section: 'Accursed Staff',
      spellName: 'Bane',
      rank: 1,
      maxCharges: 6,
    },
  ] as const) {
    it(`uses the ${scenario.className}'s real casting attribute for ${scenario.itemName} without rewriting it`, () => {
      cy.viewport(1280, 900);
      let original: InventoryItem;
      let fistControl: InventoryItem | undefined;
      let spellbookControl: InventoryItem | undefined;
      let inventoryBaseline: NonNullable<Character['inventory']> | undefined;
      let givenItemIdsBaseline: number[] | undefined;
      if (scenario.className === 'Cleric') {
        request<AbilityBlock[]>('find-ability-block', { id: [34053] }).then((doctrines) => {
          expect(doctrines).to.have.length(1);
          expect(doctrines[0].name).to.eq('Cloistered Cleric Doctrine');
          expect(doctrines[0].type).to.eq('feat');
          expect(doctrines[0].content_source_id).to.eq(1);
        });
      }
      if (scenario.className === 'Wizard') {
        request<AbilityBlock[]>('find-ability-block', { id: [21238] }).then((features) => {
          expect(features).to.have.length(1);
          expect(features[0].name).to.eq('Wizard Spellcasting');
          expect(features[0].type).to.eq('class-feature');
          expect(features[0].content_source_id).to.eq(1);
          expect(features[0].operations).to.deep.include({
            id: 'e001288e-a043-4268-a513-812e67491ffd',
            type: 'giveItem',
            data: { itemId: 7799 },
          });
        });
        request<Item[]>('find-item', { id: [7799] }).then((items) => {
          expect(items).to.have.length(1);
          const spellbook = ItemSchema.parse(items[0]);
          expect(spellbook.id).to.eq(7799);
          expect(spellbook.name).to.eq('Spellbook (Blank)');
          expect(spellbook.content_source_id).to.eq(1);
          expect(spellbook.group).to.eq('GENERAL');
          if (!spellbook.meta_data) throw new Error('The published Spellbook must have metadata.');
          expect(spellbook.meta_data.hp_max).to.eq(0);
          expect(spellbook.meta_data.base_item).to.eq(undefined);
          expect(spellbook.meta_data.base_item_content).to.eq(undefined);
          expect(spellbook.meta_data.container_default_items ?? []).to.deep.eq([]);
          // Wizard Spellcasting grants this ordinary item before opening any wand.
          spellbookControl = InventoryItemSchema.parse({
            id: 'extra-item-7799',
            item: { ...spellbook, meta_data: { ...spellbook.meta_data, hp: spellbook.meta_data.hp_max } },
            is_formula: false,
            is_equipped: false,
            is_invested: false,
            is_implanted: false,
            container_contents: [],
          });
        });
      }
      request<Item[]>('find-item', { id: [9252] }).then((items) => {
        expect(items).to.have.length(1);
        const fist = ItemSchema.parse(items[0]);
        expect(fist.id).to.eq(9252);
        expect(fist.name).to.eq('Fist');
        expect(fist.content_source_id).to.eq(1);
        expect(fist.group).to.eq('WEAPON');
        expect(fist.traits).to.deep.eq([1569, 1570, 1571, 2398]);
        if (!fist.meta_data) throw new Error('The published Fist must have metadata.');
        expect(fist.meta_data.category).to.eq('unarmed_attack');
        expect(fist.meta_data.damage?.damageType).to.eq('bludgeoning');
        expect(fist.meta_data.hp_max).to.eq(0);
        expect(fist.meta_data.base_item).to.eq(undefined);
        expect(fist.meta_data.base_item_content).to.eq(undefined);
        expect(fist.meta_data.container_default_items ?? []).to.deep.eq([]);
        // Match the ordinary addExtraItems control before the first calculation.
        fistControl = InventoryItemSchema.parse({
          id: 'extra-item-9252',
          item: { ...fist, meta_data: { ...fist.meta_data, hp: fist.meta_data.hp_max } },
          is_formula: false,
          is_equipped: true,
          is_invested: false,
          is_implanted: false,
          container_contents: [],
        });
      });
      cy.then(() => request<CharacterClass[]>('find-class', { content_sources: [1] })).then((classes) => {
        const playerClass = classes.find((entry) => entry.name === scenario.className);
        expect(playerClass, `published ${scenario.className} class`).to.exist;
        request<Item[]>('find-item', { id: [scenario.itemId] })
          .then((items) => {
            expect(items).to.have.length(1);
            const item = ItemSchema.parse(items[0]);
            expect(item.name).to.eq(scenario.itemName);
            expect(item.content_source_id).to.eq(16);
            if (!item.meta_data) throw new Error('The published casting item must have metadata.');
            original = InventoryItemSchema.parse({
              id: crypto.randomUUID(),
              item: {
                ...item,
                meta_data: { ...item.meta_data, charges: { max: scenario.maxCharges, current: 0 } },
              },
              is_formula: false,
              is_equipped: true,
              is_invested: false,
              is_implanted: false,
              container_contents: [],
            });
            return readCharacter();
          })
          .then((saved) => {
            if (!saved.inventory || !fistControl) throw new Error('The complete inventory baseline is required.');
            expect(saved.meta_data?.given_item_ids ?? []).to.deep.eq([]);
            if (scenario.className === 'Wizard' && !spellbookControl)
              throw new Error('The Wizard Spellbook baseline is required.');
            inventoryBaseline = {
              ...saved.inventory,
              items: [original, fistControl, ...(spellbookControl ? [spellbookControl] : [])],
            };
            givenItemIdsBaseline = [9252, ...(spellbookControl ? [7799] : [])];
            return request('update-character', {
              id: characterId,
              expected_updated_at: saved.updated_at,
              details: { ...saved.details, class: playerClass },
              inventory: inventoryBaseline,
              meta_data: { ...saved.meta_data, given_item_ids: givenItemIdsBaseline },
              custom_operations: [
                ...(saved.custom_operations ?? []),
                // Use the actual doctrine's level-based rules, not a synthetic proficiency override.
                ...(scenario.className === 'Cleric'
                  ? [
                      {
                        id: crypto.randomUUID(),
                        type: 'giveAbilityBlock',
                        data: { type: 'feat', abilityBlockId: 34053 },
                      },
                    ]
                  : []),
                ...Object.entries({
                  INT: scenario.attribute === 'INT' ? 4 : 0,
                  WIS: scenario.attribute === 'WIS' ? 4 : 0,
                }).map(([attribute, value]) => ({
                  id: crypto.randomUUID(),
                  type: 'setValue',
                  data: { variable: `ATTRIBUTE_${attribute}`, value: { value } },
                })),
              ],
            });
          });
      });
      const unchanged = () =>
        readCharacter().then((saved) => {
          if (!inventoryBaseline || !fistControl) throw new Error('The complete inventory baseline is required.');
          expect(saved.inventory, 'opening preserves the complete saved inventory, including coins').to.deep.eq(
            inventoryBaseline
          );
          expect(saved.inventory!.coins).to.deep.eq(inventoryBaseline.coins);
          expect(saved.inventory!.items.find((entry) => entry.id === original.id)).to.deep.eq(original);
          expect(saved.inventory!.items.find((entry) => entry.id === 'extra-item-9252')).to.deep.eq(fistControl);
          if (spellbookControl)
            expect(saved.inventory!.items.find((entry) => entry.id === 'extra-item-7799')).to.deep.eq(spellbookControl);
          expect(saved.meta_data?.given_item_ids).to.deep.eq(givenItemIdsBaseline);
        });
      const showCast = (capture: boolean) => {
        spellPanel(false);
        expand(scenario.section);
        const label =
          scenario.section === 'Wands'
            ? new RegExp(`${scenario.itemName}[\\s\\S]*${scenario.spellName}`)
            : scenario.spellName;
        cy.contains('button', label, { timeout: 30000 }).scrollIntoView();
        cy.contains('button', label, { timeout: 30000 }).click();
        cy.contains('.mantine-Drawer-root', scenario.spellName, { timeout: 30000 }).within(() => {
          // The Attack trait Badge precedes the numeric statistics in some spells.
          cy.contains('span', /^DC$/)
            .closest('.mantine-Paper-root')
            .should('have.length', 1)
            .within(() => {
              cy.contains('span', /^Attack$/)
                .next('span')
                .should(($value) => {
                  expect(
                    $value
                      .text()
                      .trim()
                      .split('/')
                      .map((part) => part.trim()),
                    'level 12 + expert 4 + casting attribute 4'
                  ).to.deep.eq(['+20', '+15', '+10']);
                });
              cy.contains('span', /^DC$/).next('span').should('have.text', '30');
            });
          cy.contains('button', new RegExp(`^Cast Spell ${scenario.rank}$`))
            .should('be.visible')
            .and('not.be.disabled');
          cy.get('.mantine-Drawer-content').should('be.visible');
        });
        if (capture)
          cy.document().screenshot(`treasure-vault-${scenario.className.toLowerCase()}-item-casting`, {
            capture: 'viewport',
          });
        cy.contains('.mantine-Drawer-root', scenario.spellName).within(() => {
          cy.get('button[aria-label="Close drawer"]').click();
        });
        cy.get('.mantine-Drawer-content, .mantine-Drawer-overlay').should('not.exist');
        unchanged();
      };
      unchanged();
      cy.then(() => cy.visit(`/sheet/${characterId}`));
      sheetLoaded();
      showCast(true);
      cy.reload();
      sheetLoaded();
      showCast(false);
    });
  }

  it('keeps formulas as knowledge without physical crafting bonuses, weapon attacks or rest charge resets', () => {
    cy.viewport(1280, 900);
    let toolkit: InventoryItem;
    const fatigued: Condition = {
      name: 'Fatigued',
      description: `You’re tired and can’t summon much energy. You take a –1 status penalty to AC and saving throws. You can’t use exploration activities performed while traveling, such as those on pages 438–439.
    You recover from fatigue after a full night’s rest.`,
      for_creature: true,
      for_object: false,
    };
    expect(fatigued.name).to.eq('Fatigued');
    expect(fatigued.description).to.be.a('string').and.not.be.empty;
    expect(fatigued.for_creature).to.eq(true);
    expect(fatigued.for_object).to.eq(false);
    const skillsPanel = () => {
      cy.get('body').then(($body) => {
        const tab = $body
          .find('[role="tab"]')
          .filter((_, element) => element.textContent?.trim() === 'Skills & Actions');
        if (tab.length) cy.wrap(tab.first()).click();
        else {
          cy.get('button[aria-label="Tab Options"]').trigger('mouseover');
          cy.contains('[role="menuitem"]', /^Skills & Actions$/).click();
        }
      });
      cy.get('input[placeholder="Search skills"]', { timeout: 30000 }).should('be.visible');
    };
    const craftingTimeline = (physical: boolean) => {
      cy.get('input[placeholder="Search skills"]').clear().type('Crafting');
      // The debounced filter replaces index-keyed skill buttons. Wait for its list,
      // then requery after scrolling so the click never keeps a detached subject.
      cy.get('input[placeholder="Search skills"]')
        .closest('.mantine-Stack-root')
        .find('.mantine-ScrollArea-viewport button')
        .should(($buttons) => {
          expect($buttons).to.have.length(1);
          expect($buttons[0].textContent).to.match(/^Crafting\b/);
        });
      cy.contains('button', /^Crafting\b/, { timeout: 30000 }).scrollIntoView();
      cy.contains('button', /^Crafting\b/, { timeout: 30000 })
        .should('be.visible')
        .click();
      cy.contains('.mantine-Drawer-root', 'Crafting', { timeout: 30000 }).within(() => {
        cy.contains('button.mantine-Accordion-control', /^Timeline$/).click();
        if (physical) {
          cy.contains("From Artisan's Toolkit (Sterling)").should('be.visible');
          cy.contains('+1 item bonus to Craft items.').should('be.visible');
        } else {
          cy.contains("From Artisan's Toolkit (Sterling)").should('not.exist');
          cy.contains('+1 item bonus to Craft items.').should('not.exist');
        }
        cy.get('button[aria-label="Close drawer"]').click();
      });
      cy.get('.mantine-Drawer-content, .mantine-Drawer-overlay').should('not.exist');
    };
    const rest = (alias: string) => {
      let awaitingRest = true;
      // A normal autosave retains the seeded Fatigued condition. Alias only the actual
      // rest write that removes it, so an earlier calculated-stat save cannot satisfy this wait.
      cy.intercept('POST', '**/functions/v1/update-character', (request) => {
        const conditions = request.body.details?.conditions;
        if (
          awaitingRest &&
          request.body.id === characterId &&
          Array.isArray(conditions) &&
          !conditions.some((condition: { name: string }) => condition.name === 'Fatigued')
        ) {
          request.alias = alias;
          awaitingRest = false;
        }
      });
      cy.contains('button', /^Rest$/).click();
      cy.contains('.mantine-Modal-content', 'Are you sure you want to rest?').within(() => {
        cy.contains('button', /^Rest$/).click();
      });
      cy.wait(`@${alias}`, { timeout: 30000 }).its('response.body.status').should('eq', 'success');
    };

    cy.then(() => request<Item[]>('find-item', { id: [6724] }))
      .then((items) => {
        expect(items).to.have.length(1);
        expect(items[0].name).to.eq("Artisan's Toolkit (Sterling)");
        expect(items[0].group).to.eq('GENERAL');
        toolkit = {
          id: crypto.randomUUID(),
          item: items[0],
          is_formula: true,
          is_equipped: false,
          is_invested: false,
          is_implanted: false,
          container_contents: [],
        };
        return readCharacter();
      })
      .then((saved) =>
        request('update-character', {
          id: characterId,
          expected_updated_at: saved.updated_at,
          details: { ...saved.details, conditions: [structuredClone(fatigued)] },
          inventory: {
            ...saved.inventory,
            items: [
              ...saved.inventory!.items.map((entry) =>
                entry.item.id === 11794
                  ? {
                      ...entry,
                      is_formula: true,
                      is_equipped: true,
                      item: {
                        ...entry.item,
                        meta_data: {
                          ...entry.item.meta_data,
                          bulk: entry.item.meta_data?.bulk ?? {},
                          charges: { max: 9, current: 4 },
                        },
                      },
                    }
                  : entry
              ),
              toolkit,
            ],
          },
        })
      );
    cy.then(() => cy.visit(`/sheet/${characterId}`));
    sheetLoaded();
    skillsPanel();
    craftingTimeline(false);
    // Boreal Staff is both a real published weapon and a spell-bearing staff.
    // Its formula remains in the spell view but must not enter the physical attacks section.
    cy.get('input[placeholder="Search actions & activities"]').type('Boreal Staff');
    cy.contains('button.mantine-Accordion-control', 'Weapon Attacks').should('not.exist');
    spellPanel(false);
    expand('Boreal Staff');
    elementalButton().should('be.visible');
    rest('formulaRest');
    readCharacter().then((saved) => {
      const staff = saved.inventory!.items.find((entry) => entry.item.id === 11794)!;
      expect(staff.is_formula).to.eq(true);
      expect(staff.is_equipped).to.eq(true);
      expect(staff.item.meta_data?.charges).to.deep.eq({ max: 9, current: 4 });
      expect(saved.inventory!.items.find((entry) => entry.id === toolkit.id)?.is_formula).to.eq(true);
      expect(saved.details?.conditions?.some((condition) => condition.name === 'Fatigued')).to.eq(false);
    });

    // A separately saved physical control must still grant the printed conditional bonus and attack.
    cy.visit('/characters');
    readCharacter().then((saved) =>
      request('update-character', {
        id: characterId,
        expected_updated_at: saved.updated_at,
        details: { ...saved.details, conditions: [structuredClone(fatigued)] },
        inventory: {
          ...saved.inventory,
          items: saved.inventory!.items.map((entry) =>
            entry.id === toolkit.id || entry.item.id === 11794 ? { ...entry, is_formula: false } : entry
          ),
        },
      })
    );
    cy.then(() => cy.visit(`/sheet/${characterId}`));
    sheetLoaded();
    skillsPanel();
    craftingTimeline(true);
    cy.get('input[placeholder="Search actions & activities"]').type('Boreal Staff');
    cy.contains('button.mantine-Accordion-control', 'Weapon Attacks')
      .should('be.visible')
      .then(($control) => {
        if ($control.attr('aria-expanded') !== 'true') cy.wrap($control).contains('p', 'Weapon Attacks').click();
      });
    cy.contains('button', 'Boreal Staff').should('be.visible');
    rest('physicalRest');
    readCharacter().then((saved) => {
      const staff = saved.inventory!.items.find((entry) => entry.item.id === 11794)!;
      expect(staff.is_formula).to.eq(false);
      expect(staff.item.meta_data?.charges).to.deep.eq({ max: 6, current: 0 });
      expect(saved.details?.conditions?.some((condition) => condition.name === 'Fatigued')).to.eq(false);
    });
  });

  for (const { phone, width, height } of [
    { phone: false, width: 1280, height: 900 },
    { phone: true, width: 390, height: 844 },
  ]) {
    it(`resolves owned item spells without enabling their book on ${phone ? 'phone' : 'desktop'}`, () => {
      cy.viewport(width, height);
      cy.then(() => cy.visit(`/sheet/${characterId}`));
      sheetLoaded();
      spellPanel(phone);
      showItemSections();
      elementalButton().closest('[data-wg-name]').contains('3rd');
      expectCastingRank(() => elementalButton().click(), 'Elemental Absorption', 3);
      expectCastingRank(() => spellheartButton('Major').click(), 'Petal Storm', 6);
      expectCastingRank(() => spellheartButton('Greater').click(), 'Petal Storm', 4);
      expectCastingRank(() => wandButton().click(), 'Chromatic Ray', 6);

      cy.get('input[placeholder="Search spells"]').scrollIntoView().type('Petal Storm');
      spellheartButton('Major').should('be.visible');
      cy.contains('button', 'Elemental Absorption').should('not.exist');
      cy.get('button[aria-label="Filter Two Actions"]').scrollIntoView().click();
      spellheartButton('Major').should('be.visible');
      cy.get('input[placeholder="Search spells"]').scrollIntoView().clear();
      spellheartButton('Major').should('be.visible');
      cy.get('button[aria-label="Filter One Action"]').scrollIntoView().click();
      cy.contains('button', 'Elemental Absorption').should('not.exist');
      cy.contains('button', /Brightbloom Posy \(Major\)[\s\S]*Petal Storm/).should('not.exist');
      cy.get('button[aria-label="Filter All Actions"]').scrollIntoView().click();
      showItemSections();
      elementalButton().should('be.visible');
      cy.screenshot(`treasure-vault-item-spells-${phone ? 'phone' : 'desktop'}`);

      readCharacter().then((saved) => expect(saved.content_sources?.enabled).to.deep.eq([1, 3, 16]));
      normalPicker();
      for (const name of ['Elemental Absorption', 'Petal Storm']) {
        searchPicker(name);
        cy.get('@normalPicker').contains('No spells found!', { timeout: 30000 }).should('be.visible');
        cy.get('@normalPicker')
          .contains('p', new RegExp(`^${name}$`))
          .should('not.exist');
      }
      closePicker();

      cy.visit('/characters');
      readCharacter().then((saved) =>
        request('update-character', {
          id: characterId,
          expected_updated_at: saved.updated_at,
          content_sources: { enabled: [1, 3, 16, 842] },
        })
      );
      cy.then(() => cy.visit(`/sheet/${characterId}`));
      sheetLoaded();
      spellPanel(phone);
      normalPicker();
      searchPicker('Petal Storm');
      cy.get('@normalPicker')
        .contains('p', /^Petal Storm$/, { timeout: 30000 })
        .parents('.mantine-Group-root')
        .filter(':has(button)')
        .first()
        .contains('button', /^Select$/)
        .scrollIntoView()
        .click();
      cy.get('@manageSpells').find('button.mantine-Modal-close').click();
      cy.get('[data-wg-name="prepared-druid"]')
        .contains('button', 'Petal Storm', { timeout: 30000 })
        .scrollIntoView()
        .click();
      cy.contains('.mantine-Drawer-root', 'Petal Storm')
        .contains('button', /^Cast Spell 4$/)
        .should('be.visible');
      cy.get('button[aria-label="Close drawer"]').click();
      cy.get('.mantine-Drawer-content, .mantine-Drawer-overlay').should('not.exist');
      showItemSections();
      expectCastingRank(() => spellheartButton('Major').click(), 'Petal Storm', 6);
      expectCastingRank(() => spellheartButton('Greater').click(), 'Petal Storm', 4);
      cy.reload();
      sheetLoaded();
      spellPanel(phone);
      showItemSections();
      expectCastingRank(() => spellheartButton('Major').click(), 'Petal Storm', 6);
      expectCastingRank(() => elementalButton().click(), 'Elemental Absorption', 3);
      expectCastingRank(() => wandButton().click(), 'Chromatic Ray', 6);
    });
  }
});
