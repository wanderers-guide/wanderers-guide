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
function login(role, url, siteTheme) {
  recordedCatalogReads();
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
        data: { ...actor.profile, ...(siteTheme ? { site_theme: { ...actor.profile.site_theme, ...siteTheme } } : {}) },
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
  captureScrolls(name, 'body');
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
          .first()
          .should(($counter) => expect($counter.text()).to.match(/^\d+$/));
      settled('main');
      captureScrolls('navigation/appearance/' + name, 'body');
      cy.document().then((doc) =>
        expect(doc.documentElement.scrollWidth, 'appearance variant fits viewport').to.be.at.most(
          doc.documentElement.clientWidth + 1
        )
      );
      if (name === 'dyslexia font') cy.get('main').should('have.css', 'font-family').and('include', 'OpenDyslexic');
      cy.get('[aria-label="Switch to dark mode"]').focus().should('have.focus');
      capture('navigation/appearance/' + name + '/keyboard-focus');
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
            cy.contains('.mantine-Popover-dropdown:visible button', /^Cancel$/).click();
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
    cy.get('body').type('{esc}');
  });
});
