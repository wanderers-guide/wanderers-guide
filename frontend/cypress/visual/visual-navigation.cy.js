import {
  capture,
  captureScrolls,
  reviewPanels,
  reviewPortals,
  recordedCatalogReads,
  settled,
} from './visual-helpers.js';
const accounts = Cypress.env('fixtureAccounts'),
  scenes = Cypress.env('fixtureScenes'),
  scheme = Cypress.env('reviewScheme') ?? 'light';
const phone = Cypress.config('viewportWidth') < 600;
const filter = Cypress.env('reviewFilter');
const review = (name, fn) =>
  !filter || filter.split(',').some((value) => name.includes(value)) ? it(name, fn) : it.skip(name, fn);
function login(role, url, siteTheme, profileOverrides = {}, catalogTransform) {
  recordedCatalogReads(catalogTransform);
  // Exercise the existing local dice fallback without creating an external room.
  cy.intercept('https://api.dddice.com/**', { statusCode: 503, body: {} });
  const actor = accounts[role];
  cy.session(['visual-navigation', role, scheme], () => {
    cy.intercept('POST', '**/auth/v1/token*').as('reviewSignIn');
    cy.visit('/login?redirect=characters', {
      onBeforeLoad(win) {
        win.localStorage.setItem('wg-color-scheme', JSON.stringify(scheme));
      },
    });
    cy.get('input[name=email]:visible').type(actor.email, { log: false });
    cy.get('input[name=password]:visible').type(actor.password, { log: false });
    cy.contains('button', 'Sign in with Email').click();
    cy.wait('@reviewSignIn', { timeout: 120000 }).its('response.statusCode').should('eq', 200);
    cy.location('pathname', { timeout: 30000 }).should('eq', '/characters');
  });
  cy.intercept('POST', '**/functions/v1/get-user', (req) => {
    if (!req.body.id || req.body.id === actor.userId)
      req.reply({
        status: 'success',
        data: {
          ...actor.profile,
          ...profileOverrides,
          ...(siteTheme ? { site_theme: { ...actor.profile.site_theme, ...siteTheme } } : {}),
        },
      });
    else req.continue();
  }).as('navigationProfile');
  cy.visit('/', {
    onBeforeLoad(win) {
      win.localStorage.setItem('wg-color-scheme', JSON.stringify(scheme));
    },
  });
  // Enter protected routes only after the restored local session has loaded its display profile.
  cy.wait('@navigationProfile', { timeout: 120000 }).its('response.statusCode').should('eq', 200);
  cy.window().then((win) => {
    win.history.pushState({}, '', url);
    win.dispatchEvent(new win.PopStateEvent('popstate'));
  });
}
function panel(label, name) {
  if (phone) {
    cy.get('[aria-label="Panel Grid"]:visible').last().click();
    cy.get('.phone-panel-picker:visible .mantine-Button-label').each(($label) =>
      expect($label[0].scrollWidth, 'phone panel label fits').to.be.at.most($label[0].clientWidth + 1)
    );
    capture(name + '/grid');
    cy.contains('.mantine-Popover-dropdown:visible button', label).click();
  } else {
    cy.get('[role=tab]:visible', { timeout: 30000 }).should('exist');
    cy.get('body').then(($body) => {
      const tabs = $body.find('[role=tab]:visible').toArray();
      if (tabs.some((el) => el.textContent.includes(label))) cy.contains('[role=tab]:visible', label).click();
      else {
        cy.get('[aria-label="Tab Options"]:visible').trigger('mouseover').trigger('mouseenter');
        cy.contains('.mantine-Menu-item:visible', label).click();
      }
    });
  }
  if (name === 'navigation/campaign/Encounters')
    cy.get('main input[placeholder="HP"]', { timeout: 120000 }).should(($inputs) => {
      expect($inputs.length, 'populated local combatants').to.be.greaterThan(1);
      expect(
        [...$inputs].every((input) => input.value !== ''),
        'combatant statistics have loaded'
      ).to.eq(true);
    });
  captureScrolls(name, 'body');
  reviewPortals(name, 'body');
  cy.get('body').then(($body) => {
    reviewPanels(name, $body.find('.mantine-Tabs-panel:visible').length ? '.mantine-Tabs-panel:visible' : 'body');
  });
  reviewPortals(name, 'body');
  cy.document().then((doc) =>
    expect(doc.documentElement.scrollWidth, 'page stays within viewport').to.be.at.most(
      doc.documentElement.clientWidth + 1
    )
  );
}
/** Open and inspect the existing confirmation, then cancel without applying its action. */
function cancelConfirmation(name, title) {
  cy.get('body', { log: false }).then((body) => body.find('[data-visual-dock]').css('visibility', 'hidden'));
  cy.get('.mantine-Modal-content:visible', { timeout: 30000 })
    .last()
    .contains('.mantine-Title-root', title, { timeout: 30000 })
    .should('be.visible');
  if (name === 'campaign-default-homebrew') reviewPortals('confirmations/' + name);
  captureScrolls('confirmations/' + name);
  cy.get('.mantine-Modal-content:visible')
    .last()
    .contains('button', /^(Cancel|Skip|Continue without)$/)
    .click();
}
/** Select a native editor in the development-only review host. */
function openReviewSurface(name) {
  login('owner', `/sheet/${scenes.casterId}/__visual/${name}`);
  cy.contains('Hit Points', { timeout: 120000 }).should('be.visible');
  cy.get('[data-testid="review-case"]').clear().type(name, { parseSpecialCharSequences: false });
  cy.get('[data-testid="open-review-surface"]').click();
  cy.get('body', { log: false }).then((body) => body.find('[data-visual-dock]').css('visibility', 'hidden'));
  settled('.mantine-Modal-content:visible');
}
describe('Actual navigation and populated panels', () => {
  for (const [name, siteTheme] of [
    ['yellow accent', { color: '#fab005' }],
    ['dark accent', { color: '#25262b' }],
    ['dyslexia font', { dyslexia_font: true }],
    ['large UI', { zoom: 1.5 }],
  ])
    review('appearance ' + name, () => {
      login('owner', '/account', siteTheme);
      cy.contains('main', 'Appearance', { timeout: 120000 }).should('be.visible');
      cy.contains('button', /^Appearance$/).click();
      for (const label of ['Characters', 'Bundles', 'Campaigns'])
        cy.contains('main .mantine-Text-root', new RegExp('^' + label + '$'))
          .parent()
          .children('.mantine-Text-root')
          .first({ timeout: 120000 })
          .should(($counter) => expect($counter.text()).to.match(/^\d+$/));
      settled('main');
      captureScrolls('navigation/appearance/' + name, 'body');
      cy.get('main .mantine-ColorSwatch-root:visible').first().scrollIntoView().click();
      cy.get('.mantine-Popover-dropdown:visible .mantine-ColorPicker-wrapper').should('be.visible');
      captureScrolls('navigation/appearance/' + name + '/accent-picker', '.mantine-Popover-dropdown:visible');
      capture('navigation/appearance/' + name + '/accent-picker/open', {
        id: 'AccountPage:Popover:612',
        kind: 'Popover',
        opened: true,
      });
      cy.get('main .mantine-ColorSwatch-root:visible').first().click();
      cy.document().then((doc) =>
        expect(doc.documentElement.scrollWidth, 'appearance variant fits viewport').to.be.at.most(
          doc.documentElement.clientWidth + 1
        )
      );
      if (name === 'dyslexia font') cy.get('main').should('have.css', 'font-family').and('include', 'OpenDyslexic');
      cy.get('[aria-label="Switch to dark mode"]').focus().should('have.focus');
      capture('navigation/appearance/' + name + '/keyboard-focus');
      if (phone && name === 'large UI') {
        cy.get('.mantine-Burger-root:visible').click();
        captureScrolls('navigation/appearance/large UI/open-menu', 'body');
        cy.get('.mantine-Burger-root:visible').click();
      }
    });
  for (const id of ['casterId', 'variantId', 'playerId'])
    review('sheet ' + id, () => {
      login(id === 'playerId' ? 'player' : 'owner', '/sheet/' + scenes[id]);
      cy.contains('main', 'Hit Points', { timeout: 120000 }).should('be.visible');
      for (const label of [
        'Skills & Actions',
        'Inventory',
        'Spells',
        'Feats & Features',
        'Companions',
        'Details',
        'Notes',
      ])
        panel(label, 'navigation/sheet-' + id + '/' + label);
      if (phone) panel('Extras', 'navigation/sheet-' + id + '/Extras');
      if (id === 'casterId') {
        if (!phone) {
          cy.get('[aria-label="Text color"]:visible').each(($control, index) => {
            cy.wrap($control).scrollIntoView().click();
            capture('navigation/rich-text/color-' + index + '-palette');
            cy.get('[aria-label="Color picker"]:visible').click();
            capture('navigation/rich-text/color-' + index + '-picker');
            cy.get('.mantine-Popover-dropdown:visible [aria-label="Save"]').click();
          });
        }
        cy.get('[aria-label="Dice Roller"]:visible').click();
        cy.contains('.mantine-Drawer-content:visible', 'Dice Roller').should('be.visible');
        captureScrolls('navigation/dice-roller');
        reviewPanels('navigation/dice-roller');
        reviewPortals('navigation/dice-roller');
        cy.get('.mantine-Drawer-content:visible').last().contains('button', /^Add$/).click();
        cy.get('.mantine-Drawer-content:visible')
          .last()
          .contains('button', /^Roll Dice$/)
          .should('not.be.disabled')
          .click();
        cy.wait(1500, { log: false });
        cy.get('canvas').last().click({ force: true });
        cy.contains('button', /^View Presets$/).should('be.visible');
        captureScrolls('navigation/dice-roller/history');
        cy.get('.mantine-Drawer-close:visible').last().click();
      }
    });
  review('campaign panels', () => {
    login('gm', '/campaign/' + scenes.campaignId);
    cy.contains('main', 'The Shattered Observatory', { timeout: 120000 }).should('be.visible');
    for (const label of ['Notes', 'Encounters', 'Shops', 'Inspiration', 'Settings']) {
      panel(label, 'navigation/campaign/' + label);
      if (label === 'Inspiration') {
        for (const title of ['Generate Session Ideas', 'Generate NPCs']) {
          if (phone) cy.contains('[role=tab]:visible', title.includes('NPC') ? 'NPCs' : 'Session Ideas').click();
          cy.contains('main button', title).scrollIntoView().click();
          cy.contains('.mantine-Modal-content:visible', 'Generation Options').should('be.visible');
          captureScrolls('navigation/generation/' + title);
          cy.get('.mantine-Modal-close:visible').last().click();
        }
      }
    }
  });
  review('builder books', () => {
    login('owner', '/builder/' + scenes.casterId);
    cy.get('input[placeholder="Unknown Wanderer"]', { timeout: 120000 }).should('be.visible');
    reviewPortals('navigation/builder/home', 'main');
    if (phone) {
      cy.contains('main button', /^Builder$/).click();
      cy.contains('main button', /^Preview$/).click();
      cy.get('.mantine-Drawer-content:visible').should('be.visible');
      captureScrolls('navigation/builder/statistics-preview');
      reviewPortals('navigation/builder/statistics-preview');
      cy.get('.mantine-Drawer-close:visible').last().click();
      cy.contains('main button', /^Home$/).click();
    }
    cy.contains('[role=tab]:visible', /^Books$/).click();
    for (const label of [
      'Pathfinder Core',
      'Starfinder Core',
      'Adventure Paths',
      'Standalone Adventures',
      'Lost Omens',
      'Core Backports',
      'Playtest',
      'Miscellaneous',
    ]) {
      cy.contains('main button', new RegExp('^' + label))
        .scrollIntoView()
        .click();
      captureScrolls('navigation/books/' + label, 'body');
      cy.contains('main button', new RegExp('^' + label))
        .scrollIntoView()
        .click();
    }
  });
  review('surface gaps builder conditional choices', () => {
    const choice = (group) => ({
      id: 'local-review-choice-' + group,
      type: 'select',
      data: {
        title: 'Review ' + group + ' choice',
        description: 'A local review example for this existing selection surface.',
        modeType: 'PREDEFINED',
        optionType: 'CUSTOM',
        optionsPredefined: ['Explorer', 'Scholar'].map((title) => ({
          id: 'local-review-' + group + '-' + title,
          type: 'CUSTOM',
          title,
          description: 'A local review option.',
          operations: [],
        })),
      },
    });
    cy.intercept('POST', '**/functions/v1/update-character', { status: 'fail', data: { review: 'Write skipped' } });
    cy.intercept('POST', '**/functions/v1/find-character', (req) =>
      req.continue((res) => {
        if (req.body.id !== scenes.casterId || res.body.status !== 'success') return;
        const character = res.body.data;
        res.body.data = {
          ...character,
          options: { ...character.options, custom_operations: true },
          custom_operations: [choice('custom')],
          inventory: {
            ...character.inventory,
            items: character.inventory.items.map((entry, index) =>
              index === 0
                ? {
                    ...entry,
                    is_equipped: true,
                    is_invested: true,
                    item: { ...entry.item, operations: [choice('item')] },
                  }
                : entry
            ),
          },
        };
      })
    );
    login('owner', '/builder/' + scenes.casterId, undefined, {}, (catalog) => ({
      ...catalog,
      'content-source': catalog['content-source'].map((source) =>
        source.id === 1 ? { ...source, operations: [choice('book')] } : source
      ),
    }));
    cy.get('input[placeholder="Unknown Wanderer"]', { timeout: 120000 }).should('be.visible');
    if (phone) cy.contains('main button', /^Builder$/).click();
    else cy.contains('main [role=tab]', /^Builder$/).click();
    settled('main');
    cy.contains('main .mantine-Accordion-control', /^Initial Stats/)
      .scrollIntoView()
      .click();
    for (const [label, group] of [
      ['Books', 'book'],
      ['Items', 'item'],
      ['Custom', 'custom'],
    ]) {
      cy.contains('main .mantine-Accordion-control', new RegExp('^' + label))
        .scrollIntoView()
        .click();
      cy.contains('main', 'Review ' + group + ' choice').should('be.visible');
      captureScrolls('navigation/builder/conditional-' + label.toLowerCase(), 'body');
      reviewPortals('navigation/builder/conditional-' + label.toLowerCase(), 'body');
    }
  });
  review('content cleaning log modal', () => {
    login('admin', '/content-cleaning-source');
    cy.contains('main', 'Content Cleaning', { timeout: 120000 }).should('be.visible');
    cy.readFile(Cypress.env('recordedCatalogFile'), { log: false }).then((catalog) => {
      const record = catalog.item.find((row) => row.content_source_id === 1);
      const source = catalog['content-source'].find((row) => row.id === 1);
      expect(record, 'local catalog item').to.exist;
      cy.intercept('POST', '**/functions/v1/find-item', {
        status: 'success',
        data: [{ ...record, meta_data: { ...record.meta_data, cleaning: { updatedAt: '2026-10-07T12:00:00Z' } } }],
      });
      cy.window().then((win) => {
        win.localStorage.setItem('cleaning-status-item_' + record.id, 'done');
        win.localStorage.setItem(
          'cleaning-log-item_' + record.id,
          JSON.stringify([
            { type: 'thought', message: 'Reviewing the item fields.', timestamp: '2026-10-07T12:00:00Z' },
            { type: 'done', message: 'Cleaned successfully', timestamp: '2026-10-07T12:00:02Z' },
          ])
        );
      });
      cy.get('input[placeholder="Select content source"]').type(source.name);
      cy.contains('[role=option]:visible', source.name).click();
      cy.contains('main button', /^Fetch$/).click();
      cy.contains('main button', /^View$/).should('be.visible');
      reviewPortals('navigation/cleaning/record-controls', 'main');
      cy.contains('main button', /^View$/).click();
      cy.contains('.mantine-Modal-content:visible', 'Cleaning Log').should('be.visible');
      captureScrolls('navigation/cleaning/log-modal');
      reviewPanels('navigation/cleaning/log-modal');
      reviewPortals('navigation/cleaning/log-modal');
      cy.get('.mantine-Modal-close:visible').last().click();
    });
  });
  review('header navigation and global search', () => {
    login('owner', '/characters');
    cy.contains('main', 'Characters', { timeout: 120000 }).should('be.visible');
    settled('main');
    if (phone) {
      cy.get('.mantine-Burger-root:visible').click();
      capture('navigation/header/mobile-menu');
    } else {
      cy.contains('header button', 'Light mode owner').click();
      capture('navigation/header/account-menu');
      cy.contains('header button', 'Light mode owner').click();
    }
    cy.contains('button:visible', 'Search everything').first().click();
    cy.get('.mantine-Spotlight-root:visible,.mantine-Spotlight-content:visible', { timeout: 10000 }).should(
      'be.visible'
    );
    capture('navigation/search/empty');
    cy.get('.mantine-Spotlight-search input,.mantine-Spotlight-search').filter('input').type('heal');
    cy.contains('.mantine-Spotlight-action:visible', 'Heal', { timeout: 30000 }).should('be.visible');
    capture('navigation/search/results');
    reviewPortals('navigation/search', '.mantine-Spotlight-content:visible');
    cy.get('body').type('{esc}');
  });
  review('surface gaps character menus', () => {
    login('owner', '/characters');
    cy.contains('main', 'Characters', { timeout: 120000 }).should('be.visible');
    settled('main');
    reviewPortals('navigation/character-list', 'main');
    cy.get('main [aria-label="Import Character"]:visible').click();
    cy.contains('.mantine-Menu-item:visible', 'Import from JSON').should('be.visible');
    capture('navigation/character-list/import-menu', { id: 'CharactersPage:Menu:247', kind: 'Menu', opened: true });
    cy.get('main [aria-label="Import Character"]:visible').click();
    cy.get('main [aria-label="Options"]:visible').first().click();
    cy.contains('.mantine-Menu-item:visible', 'Delete Character').should('be.visible');
    capture('navigation/character-list/options-menu', { id: 'CharactersPage:Menu:601', kind: 'Menu', opened: true });
    cy.get('main [aria-label="Options"]:visible').first().click();
  });
  review('surface gaps campaign cards', () => {
    login('gm', '/campaigns');
    cy.contains('main', 'Campaigns', { timeout: 120000 }).should('be.visible');
    settled('main');
    captureScrolls('navigation/campaign-list', 'main');
    reviewPortals('navigation/campaign-list', 'main');
  });
  review('surface gaps homebrew navigation', () => {
    login('owner', '/homebrew');
    cy.contains('main', 'Homebrew', { timeout: 120000 }).should('be.visible');
    settled('main');
    reviewPanels('navigation/homebrew', 'main');
    reviewPortals('navigation/homebrew', 'main');
    cy.contains('main button', /^Create Bundle$/)
      .parent()
      .find('button')
      .last()
      .click();
    cy.contains('.mantine-Menu-item:visible', 'Import from Custom Pack').should('be.visible');
    capture('navigation/homebrew/import-menu', { id: 'HomebrewPage:Menu:466', kind: 'Menu', opened: true });
    cy.contains('main button', /^Create Bundle$/)
      .parent()
      .find('button')
      .last()
      .click();
  });
  review('confirmation delete account', () => {
    login('player', '/account');
    cy.contains('main button', /^Account$/, { timeout: 120000 }).click();
    cy.contains('main button', /^Delete Account$/)
      .scrollIntoView()
      .click();
    cancelConfirmation('delete-account', 'Delete Account');
  });
  review('confirmation delete character', () => {
    login('owner', '/characters');
    cy.get('main [aria-label="Options"]', { timeout: 120000 }).first().click();
    cy.contains('.mantine-Menu-item:visible', 'Delete Character').click();
    cancelConfirmation('delete-character', 'Delete Character');
  });
  for (const action of ['delete campaign', 'kick player'])
    review('confirmation ' + action, () => {
      login('gm', '/campaign/' + scenes.campaignId);
      if (phone) {
        cy.get('[aria-label="Panel Grid"]:visible', { timeout: 120000 }).last().click();
        cy.contains('.mantine-Popover-dropdown:visible button', 'Settings').click();
      } else cy.contains('[role=tab]:visible', 'Settings', { timeout: 120000 }).click();
      const label = action === 'delete campaign' ? 'Delete Campaign' : 'Kick Player';
      cy.contains('main button', label).scrollIntoView().click();
      if (action === 'kick player') cy.get('.mantine-Menu-item:visible').first().click();
      cancelConfirmation(action.replaceAll(' ', '-'), action === 'kick player' ? /^Kick / : label);
    });
  review('confirmation publish bundle', () => {
    openReviewSurface('editor:source-bundle');
    cy.contains('label', /^Published$/)
      .parent()
      .find('input[type=checkbox]')
      .then(($input) => {
        if ($input.is(':checked')) cy.wrap($input).uncheck({ force: true });
        cy.wrap($input).click({ force: true });
      });
    cancelConfirmation('publish-bundle', 'Publish Bundle');
  });
  review('confirmation override creature', () => {
    openReviewSurface('editor:creature-populated');
    cy.contains('.mantine-Modal-content:visible [role=tab]', 'Auto Builder').click();
    cy.contains('.mantine-Modal-content:visible button', /^Process/).click();
    cancelConfirmation('override-creature', 'Override Existing Creature');
  });
  review('confirmation decrease level', () => {
    cy.intercept('POST', '**/functions/v1/find-character', (req) => {
      req.continue((res) => {
        if (req.body.id === scenes.casterId && res.body.status === 'success') {
          res.body.data = { ...res.body.data, level: 2 };
        }
      });
    });
    login('owner', '/builder/' + scenes.casterId);
    cy.contains('label', /^Level$/, { timeout: 120000 })
      .parent()
      .find('input')
      .click();
    cy.contains('[role=option]:visible', /^1$/).click();
    cancelConfirmation('decrease-level', /^Decrease Level/);
  });
  for (const type of ['ancestry', 'background', 'class'])
    review('confirmation change ' + type, () => {
      openReviewSurface('picker:' + type + ':change');
      cy.get('.mantine-Modal-content:visible button')
        .filter((_, el) => /^Select$/.test(el.textContent) && !el.disabled)
        .first()
        .click();
      cancelConfirmation('change-' + type, 'Change ' + type[0].toUpperCase() + type.slice(1));
    });
  review('confirmation delete society record', () => {
    openReviewSurface('editor:society-existing');
    cy.contains('.mantine-Modal-content:visible button', 'Delete Record').scrollIntoView().click();
    cancelConfirmation('delete-society-record', 'Are you sure you want to delete this record?');
  });
  review('confirmation delete companion', () => {
    login('owner', '/sheet/' + scenes.casterId);
    cy.contains('main', 'Hit Points', { timeout: 120000 }).should('be.visible');
    panel('Companions', 'navigation/confirmations/companion');
    cy.get('[aria-label="Remove Companion"]:visible').first().scrollIntoView().click();
    cancelConfirmation('delete-companion', 'Delete Companion');
  });
  review('confirmation import encounter', () => {
    openReviewSurface('context:encounter');
    cy.readFile('/private/tmp/wg-light-mode-verification/visual-data.json', { log: false }).then((fixture) => {
      cy.get('.mantine-Modal-content:visible input[type=file]').selectFile(
        {
          contents: Cypress.Buffer.from(JSON.stringify({ version: 1, encounter: fixture.encounter })),
          fileName: 'local-review-encounter.json',
          mimeType: 'application/json',
        },
        { force: true }
      );
    });
    cancelConfirmation('import-encounter', 'Import Encounter');
  });
  review('confirmation delete bundle', () => {
    login('owner', '/homebrew');
    cy.contains('main [role=tab]', 'My Creations', { timeout: 120000 }).click();
    cy.get('main [aria-label="Options"]', { timeout: 120000 }).last().scrollIntoView().click();
    cy.contains('.mantine-Menu-item:visible', 'Delete').click();
    cancelConfirmation('delete-bundle', 'Delete Bundle');
  });
  review('confirmation unsubscribe bundle', () => {
    login('player', '/homebrew', undefined, {
      subscribed_content_sources: [
        { source_id: 900, source_name: 'Sapphire Archive', added_at: '2026-10-07T12:00:00Z' },
      ],
    });
    cy.contains('main [role=tab]', 'Subscriptions', { timeout: 120000 }).click();
    cy.get('main [aria-label="Options"]', { timeout: 120000 }).first().scrollIntoView().click();
    cy.contains('.mantine-Menu-item:visible', 'Unsubscribe').click();
    cancelConfirmation('unsubscribe-bundle', 'Unsubscribe');
  });
  review('confirmation remove benefiting user', () => {
    cy.intercept('POST', '**/functions/v1/gm-users-in-group', { status: 'success', data: [accounts.player.profile] });
    login('gm', '/account');
    cy.contains('main', 'Users in your Group', { timeout: 120000 })
      .parent()
      .parent()
      .find('.mantine-CloseButton-root')
      .first()
      .scrollIntoView()
      .click();
    cancelConfirmation('remove-benefiting-user', 'Remove User');
  });
  for (const location of ['builder', 'campaign'])
    review('confirmation dependencies ' + location, () => {
      // These existing Cancel handlers enable the requested book. Keep that change in the review browser only.
      cy.intercept('POST', '**/functions/v1/update-character', { status: 'fail', data: { review: 'Write skipped' } });
      cy.intercept('POST', '**/functions/v1/update-campaign', { status: 'fail', data: { review: 'Write skipped' } });
      login(
        location === 'builder' ? 'owner' : 'gm',
        location === 'builder' ? '/builder/' + scenes.casterId : '/campaign/' + scenes.campaignId
      );
      if (location === 'campaign') {
        if (phone) {
          cy.get('[aria-label="Panel Grid"]:visible', { timeout: 120000 }).last().click();
          cy.contains('.mantine-Popover-dropdown:visible button', 'Settings').click();
        } else cy.contains('[role=tab]:visible', 'Settings', { timeout: 120000 }).click();
      } else cy.contains('[role=tab]:visible', /^Books$/, { timeout: 120000 }).click();
      cy.contains('main button', /^Lost Omens/)
        .scrollIntoView()
        .click();
      cy.contains('label', /^Rival Academies$/)
        .scrollIntoView()
        .click();
      cancelConfirmation('dependencies-' + location, 'Enable Dependencies');
    });
  for (const nested of [false, true])
    review('confirmation campaign defaults' + (nested ? ' homebrew' : ''), () => {
      cy.intercept('POST', '**/functions/v1/update-character', { status: 'fail', data: { review: 'Write skipped' } });
      cy.readFile('/private/tmp/wg-light-mode-verification/visual-data.json', { log: false }).then((fixture) => {
        cy.intercept('POST', '**/functions/v1/find-campaign', {
          status: 'success',
          data: [{ ...fixture.campaign, recommended_content_sources: { enabled: [900], disabled: [] } }],
        });
      });
      login('owner', '/builder/' + scenes.builderId);
      cy.get('input[placeholder="Enter Join Key"]', { timeout: 120000 }).scrollIntoView().type('local-review{enter}');
      cy.contains('.mantine-Modal-content:visible', 'Campaign Default Settings').should('be.visible');
      captureScrolls('confirmations/campaign-default-settings');
      if (nested) {
        cy.contains('.mantine-Modal-content:visible button', 'Apply Settings').click();
        cancelConfirmation('campaign-default-homebrew', 'Campaign Default Homebrew');
      } else cancelConfirmation('campaign-default-settings', 'Campaign Default Settings');
    });
  review('confirmation revoke client access', () => {
    cy.intercept('POST', '**/functions/v1/find-character', (req) =>
      req.continue((res) => {
        if (req.body.id === scenes.casterId && res.body.status === 'success')
          res.body.data = {
            ...res.body.data,
            details: {
              ...res.body.data.details,
              api_clients: {
                client_access: [
                  { publicUserId: String(accounts.owner.profileId), clientId: 'local-review', addedAt: 1791374400 },
                ],
              },
            },
          };
      })
    );
    login('owner', '/builder/' + scenes.casterId, undefined, {
      api: { clients: [{ id: 'local-review', name: 'Observatory Journal', api_key: 'LOCAL-REVIEW-PLACEHOLDER' }] },
    });
    cy.contains('main a', 'Revoke Access', { timeout: 120000 }).scrollIntoView().click();
    cancelConfirmation('revoke-access', 'Revoke Access');
  });
  review('confirmation overcharge wand', () => {
    // Keep the exhausted charge in a read fixture; cancelling never changes the inventory.
    cy.intercept('POST', '**/functions/v1/update-character', { status: 'fail', data: { review: 'Write skipped' } });
    cy.intercept('POST', '**/functions/v1/find-character', (req) =>
      req.continue((res) => {
        if (req.body.id === scenes.casterId && res.body.status === 'success') {
          const character = res.body.data;
          res.body.data = {
            ...character,
            inventory: {
              ...character.inventory,
              items: character.inventory.items.map((entry) =>
                entry.item.name.toLowerCase().includes('wand')
                  ? {
                      ...entry,
                      item: { ...entry.item, meta_data: { ...entry.item.meta_data, charges: { current: 1, max: 1 } } },
                    }
                  : entry
              ),
            },
          };
        }
      })
    );
    login('owner', '/sheet/' + scenes.casterId);
    cy.contains('main', 'Hit Points', { timeout: 120000 }).should('be.visible');
    if (phone) {
      cy.get('[aria-label="Panel Grid"]:visible').last().click();
      cy.contains('.mantine-Popover-dropdown:visible button', 'Spells').click();
    } else cy.contains('[role=tab]:visible', /^Spells$/).click();
    cy.contains('main button', /^Wands/)
      .scrollIntoView()
      .click();
    cy.contains('main button', /Wand of/)
      .scrollIntoView()
      .click();
    cy.contains('.mantine-Drawer-content:visible button', /^Cast /)
      .scrollIntoView()
      .click();
    cancelConfirmation('overcharge-wand', 'Overcharge Wand');
  });
});
