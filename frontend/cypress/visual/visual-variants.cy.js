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
  // Preserve the same recorded local reads for each case, not only the first editor.
  beforeEach(() => recordedCatalogReads());
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
  review('conditional row controls', () => {
    open('operation:conditional');
    cy.get('.mantine-Modal-content:visible svg.tabler-icon-circle-plus')
      .first()
      .closest('button')
      .scrollIntoView()
      .click();
    captureScrolls('conditional/second-condition');
    reviewPortals('conditional/second-condition');
  });
  review('heightening row controls', () => {
    open('editor:spell');
    cy.contains('.mantine-Modal-content:visible button', /^Heightened$/)
      .scrollIntoView()
      .click();
    cy.contains('.mantine-Modal-content:visible button', /^Add Heightening$/)
      .scrollIntoView()
      .click();
    captureScrolls('spells/heightening-row');
    reviewPortals('spells/heightening-row');
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
  review('bundle delete menu contrast', () => {
    open('editor:source-bundle');
    cy.contains('.mantine-Modal-content:visible [role=tab]', /^Items\b/)
      .scrollIntoView()
      .click();
    cy.get('[data-ui-review-id="SelectContent:Menu:1761"]:visible').first().click();
    cy.get('.mantine-Menu-dropdown:visible').should('have.css', 'opacity', '1');
    cy.contains('.mantine-Menu-dropdown:visible [role=menuitem]', /^Delete$/).should(($item) => {
      const item = $item[0];
      const styles = (element) => item.ownerDocument.defaultView.getComputedStyle(element);
      const luminance = (color) =>
        color
          .match(/[\d.]+/g)
          .slice(0, 3)
          .map(Number)
          .map((channel) => {
            const value = channel / 255;
            return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
          })
          .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
      const foreground = luminance(styles(item).color);
      const background = luminance(styles(item.closest('.mantine-Menu-dropdown')).backgroundColor);
      expect((Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05)).to.be.at.least(4.5);
    });
    capture('bundle-delete-menu/upper', { id: 'SelectContent:Menu:1761', kind: 'Menu', opened: true });
  });
  review('creature view and source feedback', () => {
    cy.window().then((win) => win.localStorage.setItem('creature-drawer-view', JSON.stringify({ view: 'SHEET' })));
    open('scene:creature-source');
    const inspectHint = (label, text, id, state) => {
      // Switching the native creature view recalculates its stat block before
      // the controls become available again on the local content stack.
      cy.get('[aria-label="' + label + '"]:visible', { timeout: 30000 })
        .last()
        .trigger('mouseover')
        .trigger('mouseenter');
      cy.contains('.mantine-HoverCard-dropdown:visible', text, { timeout: 10000 }).should('be.visible');
      capture('creature-source/' + state, { id, kind: 'HoverCard', opened: true });
      cy.get('[aria-label="' + label + '"]:visible')
        .last()
        .trigger('mouseout')
        .trigger('mouseleave');
      cy.window().then((win) =>
        Cypress.automation('remote:debugger:protocol', {
          command: 'Input.dispatchMouseEvent',
          params: { type: 'mouseMoved', x: win.innerWidth - 2, y: win.innerHeight - 2 },
        })
      );
      cy.get('.mantine-HoverCard-dropdown:visible').should('not.exist');
    };
    inspectHint('Help and Feedback', 'Something wrong?', 'DrawerCreatureBase:HoverCard:108', 'source-feedback');
    inspectHint('Switch View Mode', 'Open Stat Block View', 'CreatureDrawer:HoverCard:670', 'sheet-view-switch');
    cy.get('[aria-label="Switch View Mode"]:visible').last().click();
    inspectHint('Switch View Mode', 'Open Sheet View', 'CreatureDrawer:HoverCard:670', 'block-view-switch');
    captureScrolls('creature-source/stat-block');
    reviewPortals('creature-source/stat-block');
    cy.get('[aria-label="Switch View Mode"]:visible').last().click();
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
      cy.get('.phone-panel-picker:visible .mantine-Button-label').each(($label) =>
        expect($label[0].scrollWidth, 'creature panel label fits').to.be.at.most($label[0].clientWidth + 1)
      );
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
  for (const type of ['Ability Block', 'Spell', 'Language', 'Adjust Value', 'Custom'])
    review('remove option confirmation ' + type, () => {
      open('operation:select');
      cy.get('.mantine-Modal-content:visible input[placeholder="Type"]').click();
      cy.contains('[role=option]:visible', new RegExp('^' + type + '$')).click();
      if (type !== 'Custom')
        cy.contains('.mantine-Modal-content:visible .mantine-SegmentedControl-label', /^Predefined$/).click();
      cy.get('.mantine-Modal-content:visible svg.tabler-icon-circle-plus')
        .last()
        .closest('button')
        .scrollIntoView()
        .click();
      if (type === 'Custom') cy.contains('.mantine-Modal-content:visible button', /^Operations$/).click();
      reviewPortals('select-options/' + type.toLowerCase().replaceAll(' ', '-'));
      cy.get('.mantine-Modal-content:visible svg.tabler-icon-circle-minus')
        .last()
        .closest('button')
        .scrollIntoView()
        .click();
      cy.get('.mantine-Modal-content:visible')
        .last()
        .contains('.mantine-Title-root', 'Remove Option')
        .should('be.visible');
      cancelConfirm('option-' + type.toLowerCase().replaceAll(' ', '-'));
    });
});
