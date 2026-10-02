import type { Character, Class as CharacterClass, Condition, InventoryItem, Item } from '../../../src/schemas/content';

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
            '6th-rank [petal storm](link_spell_8999)'
          );
          expect(items.find((item) => item.id === 12676)?.name).to.eq('Wand of Refracting Rays (6th-level)');
          expect(items.find((item) => item.id === 12676)?.description).to.include(
            'You cast 6th-rank *[Chromatic Ray](link_spell_5322)*'
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
      cy.contains('button', /^Crafting\b/, { timeout: 30000 })
        .scrollIntoView()
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
