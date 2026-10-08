import {
  capture,
  captureScrolls,
  reviewPanels,
  reviewPortals,
  reviewInputs,
  recordedCatalogReads,
} from './visual-helpers.js';
const accounts = Cypress.env('fixtureAccounts'),
  scheme = Cypress.env('reviewScheme') ?? 'light';
function open(name) {
  cy.get('body', { log: false }).then((body) => body.find('[data-visual-dock]').css('visibility', 'visible'));
  cy.get('[data-testid=review-case]').clear().type(name, { parseSpecialCharSequences: false });
  cy.get('[data-testid=open-review-surface]').click();
  cy.get('body', { log: false }).then((body) => body.find('[data-visual-dock]').css('visibility', 'hidden'));
  cy.get('.mantine-Modal-content:visible,.mantine-Drawer-content:visible', { timeout: 30000 })
    .last()
    .should('be.visible');
}
function closeReviewModals() {
  cy.get('body').then(($body) => {
    const close = $body.find('.mantine-Modal-close:visible').last();
    if (!close.length) return;
    cy.wrap(close).click();
    cy.wait(250, { log: false });
    closeReviewModals();
  });
}
function cancelConfirm(name) {
  captureScrolls('confirmations/' + name);
  cy.get('.mantine-Modal-content:visible')
    .last()
    .contains('button', /^Cancel$/)
    .click();
}
describe('Conditional editor and navigation states', { testIsolation: false }, () => {
  before(() => {
    recordedCatalogReads();
    cy.intercept('POST', '**/functions/v1/get-user', (req) => {
      if (!req.body.id || req.body.id === accounts.owner.userId)
        req.reply({ status: 'success', data: accounts.owner.profile });
      else req.continue();
    });
    cy.intercept('POST', '**/auth/v1/token*').as('reviewSignIn');
    cy.visit('/login?redirect=characters', {
      onBeforeLoad(win) {
        win.localStorage.setItem('wg-color-scheme', JSON.stringify(scheme));
      },
    });
    cy.get('input[name=email]:visible').type(accounts.owner.email, { log: false });
    cy.get('input[name=password]:visible').type(accounts.owner.password, { log: false });
    cy.contains('button', 'Sign in with Email').click();
    cy.wait('@reviewSignIn', { timeout: 120000 }).its('response.statusCode').should('eq', 200);
    cy.location('pathname', { timeout: 30000 }).should('eq', '/characters');
    cy.window().then((win) => {
      win.history.pushState({}, '', `/sheet/${Cypress.env('fixtureScenes').casterId}/__visual/editor:item`);
      win.dispatchEvent(new win.PopStateEvent('popstate'));
    });
    cy.contains('Hit Points', { timeout: 120000 }).should('be.visible');
  });
  const filter = Cypress.env('reviewFilter');
  const review = (name, fn) =>
    !filter || filter.split(',').some((value) => name.includes(value)) ? it(name, fn) : it.skip(name, fn);
  for (const group of ['General', 'Armor', 'Shield', 'Weapon', 'Rune', 'Upgrade', 'Material'])
    review('item group ' + group, () => {
      open('editor:item');
      cy.contains('label', /^Group/)
        .parent()
        .find('input')
        .first()
        .scrollIntoView()
        .click();
      cy.contains('[role=option]:visible', new RegExp('^' + group + '$')).click();
      captureScrolls('item-groups/' + group);
      if (group === 'General') reviewPanels('item-groups/' + group);
      reviewInputs('item-groups/' + group);
    });
  review('inline icon and color controls', () => {
    open('editor:spell');
    cy.get('.mantine-Modal-content:visible')
      .last()
      .contains('button', /^Misc\. Sections$/)
      .click();
    cy.get('.mantine-Modal-content:visible')
      .last()
      .find('.mantine-SegmentedControl-label')
      .contains(/^Icon$/)
      .scrollIntoView()
      .click();
    captureScrolls('inline-icon/controls');
    reviewInputs('inline-icon/controls');
    cy.get('.mantine-Modal-content:visible').last().find('[aria-label=Icon]').closest('button').click();
    cy.contains('.mantine-Modal-content:visible', 'Select Icon').should('be.visible');
    captureScrolls('inline-icon/selector');
    cy.get('.mantine-Modal-close:visible').last().click();
  });
  review('default badge contrast', () => {
    open('drawer:class-archetype');
    captureScrolls('badge-contrast/class-archetype');
    if (scheme === 'light')
      cy.get('.mantine-Drawer-content:visible .mantine-Badge-root[data-variant=filled]')
        .first()
        .should(($el) => {
          const style = getComputedStyle($el[0]);
          const rgb = (value) =>
            value
              .match(/[\d.]+/g)
              .slice(0, 3)
              .map(Number);
          const luminance = (color) =>
            color
              .map((v) => {
                v /= 255;
                return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
              })
              .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
          const a = luminance(rgb(style.color)),
            b = luminance(rgb(style.backgroundColor));
          expect((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05), 'actual filled badge contrast').to.be.at.least(4.5);
        });
  });
  review('nested spell rank modal', () => {
    open('spells:list');
    cy.get('.mantine-Modal-content:visible')
      .last()
      .contains('button', /^Add Spell$/)
      .click();
    cy.get('.mantine-Modal-content:visible').last().find('input[placeholder*="Search"]').first().type('Heal');
    cy.contains('.mantine-Modal-content:visible', /Heal/).should('be.visible');
    cy.get('.mantine-Modal-content:visible')
      .last()
      .contains('button', /^Select$/)
      .first()
      .click();
    cy.contains('.mantine-Modal-content:visible', /Select Heal.*Rank/).should('be.visible');
    captureScrolls('spells/nested-rank');
    cy.get('.mantine-Modal-close:visible').last().click();
  });
  review('bundle categories', () => {
    open('editor:source-bundle');
    cy.get('.mantine-Modal-content:visible [role=tab]', { timeout: 120000 }).then(($tabs) => {
      const labels = [...$tabs].map((el) => el.textContent.trim());
      for (const label of labels) {
        cy.contains('.mantine-Modal-content:visible [role=tab]', label).scrollIntoView().click();
        captureScrolls('bundle-categories/' + label);
        cy.get('.mantine-Modal-content:visible .mantine-Tabs-panel').last().scrollIntoView();
        captureScrolls('bundle-categories/' + label + '/content');
        reviewPortals('bundle-categories/' + label, '.mantine-Modal-content:visible .mantine-Tabs-panel');
      }
    });
    cy.get('.mantine-Modal-content:visible')
      .last()
      .should(($el) => expect($el[0].scrollWidth).to.be.at.most($el[0].clientWidth + 1));
  });
  review('creature panels', () => {
    open('scene:creature-live');
    for (const label of [
      'Abilities',
      'Skills',
      'Inventory',
      'Spells',
      'Notes',
      'Details',
      'Health, Conditions, Saves',
    ]) {
      cy.get('[aria-label="Panel Grid"]:visible').last().click();
      cy.contains('.mantine-Popover-dropdown:visible button', label).click();
      captureScrolls('creature-panels/' + label);
      reviewPanels('creature-panels/' + label);
      reviewPortals('creature-panels/' + label);
    }
  });
  for (const [context, label] of [
    ['note', 'Delete Page'],
    ['encounter', 'Delete'],
    ['api-client', 'Delete Client'],
  ])
    review('confirmation ' + context, () => {
      open('context:' + context);
      cy.get('.mantine-Modal-content:visible')
        .last()
        .contains('button', new RegExp('^' + label + '$'))
        .scrollIntoView()
        .click();
      cancelConfirm(context);
    });
  review('remove operation confirmation', () => {
    open('operation:adjValue');
    cy.get('.mantine-Modal-content:visible .mantine-CloseButton-root').last().click();
    cy.get('.mantine-Modal-content:visible')
      .last()
      .contains('.mantine-Title-root', 'Remove Operation')
      .should('be.visible');
    cancelConfirm('operation');
  });
  review('existing rest confirmation', () => {
    closeReviewModals();
    cy.get('.mantine-Modal-content:visible').should('not.exist');
    cy.contains('button', /^Rest$/)
      .first()
      .click();
    cy.contains('Are you sure you want to rest?').should('be.visible');
    cancelConfirm('rest');
  });
});
