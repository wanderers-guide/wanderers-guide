/** Source-backed review of real modal and drawer surfaces against isolated local records. */
const cases = [
  'scene:creature-live',
  'scene:campaign-party',
  'scene:modes',
  ...[
    'adjValue',
    'addBonusToValue',
    'setValue',
    'createValue',
    'bindValue',
    'giveAbilityBlock',
    'giveLanguage',
    'conditional',
    'select',
    'giveSpell',
    'giveItem',
    'giveTrait',
    'giveSpellSlot',
    'injectSelectOption',
    'injectText',
    'sendNotification',
    'defineCastingSource',
  ].map((type) => `operation:${type}`),
  ...['action', 'feat', 'physical-feature', 'sense', 'class-feature', 'heritage', 'mode'].map(
    (type) => `editor:ability:${type}`
  ),
  ...[
    'ancestry',
    'archetype',
    'background',
    'class',
    'class-archetype',
    'versatile-heritage',
    'creature',
    'creature-populated',
    'combatant',
    'item',
    'item-populated',
    'language',
    'spell',
    'trait',
    'hazard',
    'source',
    'source-bundle',
    'source-contents',
    'society',
  ].map((type) => `editor:${type}`),
  'import:pathbuilder',
  'search:advanced',
  'feedback',
  'unlock-homebrew',
  'operations:edit',
  'operations:view',
  'spells:slots',
  'spells:prepared',
  'spells:list',
  ...[
    'lore',
    'dice',
    'icon',
    'image',
    'portrait',
    'note',
    'condition',
    'items',
    'buy',
    'spell-slot',
    'staff',
    'initiative',
    'encounter',
    'generate',
    'api-client',
  ].map((type) => `context:${type}`),
  ...[
    'ancestry',
    'archetype',
    'background',
    'class',
    'class-archetype',
    'versatile-heritage',
    'language',
    'trait',
    'spell',
    'item',
    'creature',
    'hazard',
    'content-source',
    'action',
    'feat',
    'class-feature',
    'heritage',
    'sense',
    'physical-feature',
    'mode',
    'generic',
    'condition',
    'manage-coins',
    'stat-prof:SKILL_ARCANA',
    'stat-prof:SAVE_FORT',
    'stat-prof:CLASS_DC',
    'stat-attr',
    'stat-attr:ATTRIBUTE_INT',
    'stat-hp',
    'stat-ac',
    'stat-weapon',
    'stat-speed',
    'stat-perception',
    'stat-resist-weak',
    'inv-item',
    'inv-item:shield',
    'inv-item:armor',
    'inv-item:backpack',
    'inv-item:potion',
    'inv-item:staff',
    'inv-item:arrows',
    'cast-spell',
    'cast-spell:exhausted',
  ].map((type) => `drawer:${type}`),
  ...[
    'ancestry',
    'background',
    'class',
    'archetype',
    'class-archetype',
    'versatile-heritage',
    'language',
    'trait',
    'spell',
    'item',
    'creature',
    'hazard',
    'feat',
    'heritage',
    'action',
    'class-feature',
    'sense',
    'physical-feature',
    'mode',
  ].map((type) => `picker:${type}`),
];
const scheme = Cypress.env('reviewScheme') ?? 'light';
const width = Cypress.config('viewportWidth');
const prefix = `${scheme}-${width}`;
import { captureScrolls, reviewPanels, reviewPortals, reviewInputs, recordedCatalogReads } from './visual-helpers.js';
describe(`Actual app surfaces ${prefix}`, { testIsolation: false }, () => {
  before(() => {
    recordedCatalogReads();
    const accounts = Cypress.env('fixtureAccounts'),
      role = Cypress.env('reviewRole') ?? 'owner',
      actor = accounts[role];
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
    cy.contains('header', `Light mode ${role}`, { timeout: 30000 }).should('exist');
    cy.window().then((win) => {
      win.history.pushState(
        {},
        '',
        `/sheet/${Cypress.env('fixtureScenes')[role === 'player' ? 'playerId' : 'casterId']}/__visual/editor:item`
      );
      win.dispatchEvent(new win.PopStateEvent('popstate'));
    });
    cy.contains('Hit Points', { timeout: 120000 }).should('be.visible');
  });
  for (const name of cases.filter(
    (name) =>
      !Cypress.env('reviewFilter') ||
      Cypress.env('reviewFilter')
        .split(',')
        .some((filter) => name.startsWith(filter))
  ))
    it(name, () => {
      cy.get('body', { log: false }).then((body) => body.find('[data-visual-dock]').css('visibility', 'visible'));
      cy.get('[data-testid="review-case"]', { timeout: 30000 })
        .clear()
        .type(name, { parseSpecialCharSequences: false });
      cy.get('[data-testid="open-review-surface"]').click();
      cy.get('body', { log: false }).then((body) => body.find('[data-visual-dock]').css('visibility', 'hidden'));
      const selector =
        name.startsWith('drawer:') || name.startsWith('scene:')
          ? '.mantine-Drawer-content:visible'
          : '.mantine-Modal-content:visible';
      cy.get(selector, { timeout: 30000 }).last().should('be.visible').and('have.css', 'opacity', '1');
      cy.get(selector)
        .last()
        .find('.mantine-Loader-root:visible,.mantine-LoadingOverlay-root:visible', { timeout: 120000 })
        .should('not.exist');
      const label = name.replaceAll(':', '-');
      captureScrolls(label);
      if (Cypress.env('reviewInputs')) reviewInputs(label);
      if (Cypress.env('reviewInteractions')) {
        reviewPanels(label);
        reviewPortals(label);
      }
      cy.get(selector)
        .last()
        .should(($surface) => {
          expect($surface[0].scrollWidth, 'surface stays within its viewport').to.be.at.most(
            $surface[0].clientWidth + 1
          );
        });
    });
});
