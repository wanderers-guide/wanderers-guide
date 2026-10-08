import { capture, captureScrolls, reviewPanels, reviewPortals, recordedCatalogReads } from './visual-helpers.js';
const accounts = Cypress.env('fixtureAccounts'),
  scenes = Cypress.env('fixtureScenes'),
  scheme = Cypress.env('reviewScheme') ?? 'light';
const phone = Cypress.config('viewportWidth') < 600;
const filter = Cypress.env('reviewFilter');
const review = (name, fn) =>
  !filter || filter.split(',').some((value) => name.includes(value)) ? it(name, fn) : it.skip(name, fn);
function login(role, url) {
  recordedCatalogReads();
  const actor = accounts[role];
  cy.intercept('POST', '**/functions/v1/get-user', (req) => {
    if (!req.body.id || req.body.id === actor.userId) req.reply({ status: 'success', data: actor.profile });
    else req.continue();
  });
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
  } else
    cy.get('body').then(($body) => {
      const tabs = $body.find('[role=tab]:visible').toArray();
      if (tabs.some((el) => el.textContent.trim() === label))
        cy.contains('[role=tab]:visible', new RegExp('^' + label + '$')).click();
      else {
        cy.get('[aria-label="Tab Options"]:visible').trigger('mouseover').trigger('mouseenter');
        cy.contains('.mantine-Menu-item:visible', new RegExp('^' + label + '$')).click();
      }
    });
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
        cy.get('[aria-label="Dice Roller"]:visible').click();
        cy.contains('.mantine-Drawer-content:visible', 'Dice Roller').should('be.visible');
        captureScrolls('navigation/dice-roller');
        reviewPanels('navigation/dice-roller');
        reviewPortals('navigation/dice-roller');
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
  review('header navigation and global search', () => {
    login('owner', '/characters');
    cy.contains('main', 'Characters', { timeout: 120000 }).should('be.visible');
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
