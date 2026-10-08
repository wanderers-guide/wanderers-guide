/** Source-backed review of real modal and drawer surfaces against isolated local records. */
const cases = [
  'scene:creature-live',
  'scene:campaign-party',
  ...[
    'adjValue',
    'addBonusToValue',
    'setValue',
    'createValue',
    'bindValue',
    'giveAbilityBlock',
    'removeAbilityBlock',
    'giveLanguage',
    'removeLanguage',
    'conditional',
    'select',
    'giveSpell',
    'removeSpell',
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
import { captureScrolls, reviewPanels, reviewPortals, recordedCatalogReads } from './visual-helpers.js';
describe(`Actual app surfaces ${prefix}`, { testIsolation: false }, () => {
  before(() => {
    recordedCatalogReads();
    const accounts = Cypress.env('fixtureAccounts');
    cy.intercept('POST', '**/functions/v1/get-user', { status: 'success', data: accounts.owner.profile });

    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.setItem('wg-color-scheme', JSON.stringify(scheme));
        win.localStorage.setItem('sb-127-auth-token', JSON.stringify(accounts.owner.session));
        win.localStorage.setItem('user-data', JSON.stringify(accounts.owner.profile));
      },
    });
    cy.contains('header', 'Light mode owner', { timeout: 30000 }).should('exist');
    cy.window().then((win) => {
      win.history.pushState({}, '', `/sheet/${Cypress.env('fixtureScenes').casterId}/__visual/editor:item`);
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
      cy.get('[data-testid="review-case"]', { timeout: 30000 })
        .clear()
        .type(name, { parseSpecialCharSequences: false });
      cy.get('[data-testid="open-review-surface"]').click();
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
      if (Cypress.env('reviewInteractions')) {
        reviewPanels(label);
        reviewPortals(label);
      }
    });
});
