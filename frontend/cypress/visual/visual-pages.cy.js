/** Real route/role/panel capture; external integrations and paid work never run. */
import { capture, captureScrolls, reviewPanels, reviewPortals, recordedCatalogReads } from './visual-helpers.js';
const scheme = Cypress.env('reviewScheme') ?? 'light',
  scenes = Cypress.env('fixtureScenes'),
  accounts = Cypress.env('fixtureAccounts');
const cases = [
  { name: 'home-visitor', url: '/', ready: 'Journey with Guidance' },
  { name: 'login', url: '/login', ready: 'Sign in to continue' },
  {
    name: 'registration',
    url: '/login',
    ready: 'Sign in to continue',
    action: () => cy.contains('a', "Don't have an account? Sign up").click(),
  },
  {
    name: 'forgot-password',
    url: '/login',
    ready: 'Sign in to continue',
    action: () => cy.contains('a', 'Forgot your password?').click(),
  },
  {
    name: 'login-validation',
    url: '/login',
    ready: 'Sign in to continue',
    action: () => cy.contains('button', 'Sign in with Email').click(),
  },
  { name: 'update-password', url: '/update-password', ready: 'Update Password' },
  { name: 'missing', url: '/visual-review-missing-route', ready: 'You found a secret place.' },
  { name: 'sheet-unauthorized', url: '/sheet-unauthorized', ready: 'Private Character' },
  { name: 'characters-owner', role: 'owner', url: '/characters', ready: 'Characters' },
  { name: 'characters-player', role: 'player', url: '/characters', ready: 'Characters' },
  { name: 'campaigns-owner', role: 'owner', url: '/campaigns', ready: 'Campaigns' },
  { name: 'campaigns-gm', role: 'gm', url: '/campaigns', ready: 'Campaigns' },
  { name: 'encounters-empty', role: 'owner', url: '/encounters', ready: 'Encounters' },
  { name: 'encounters-gm', role: 'gm', url: '/encounters', ready: 'Encounters' },
  { name: 'account-player', role: 'player', url: '/account', ready: 'Appearance' },
  { name: 'account-owner', role: 'owner', url: '/account', ready: 'Appearance' },
  { name: 'account-gm', role: 'gm', url: '/account', ready: 'Appearance' },
  { name: 'admin', role: 'admin', url: '/admin', ready: 'Edit Content' },
  { name: 'homebrew-owner', role: 'owner', url: '/homebrew', ready: 'Homebrew' },
  { name: 'homebrew-player', role: 'player', url: '/homebrew', ready: 'Homebrew' },
  { name: 'builder-empty', role: 'owner', url: `/builder/${scenes.builderId}`, ready: 'Builder' },
  { name: 'builder-martial', role: 'owner', url: `/builder/${scenes.martialId}`, ready: 'Builder' },
  { name: 'builder-caster', role: 'owner', url: `/builder/${scenes.casterId}`, ready: 'Builder' },
  { name: 'builder-variants', role: 'owner', url: `/builder/${scenes.variantId}`, ready: 'Builder' },
  { name: 'sheet-martial', role: 'owner', url: `/sheet/${scenes.martialId}`, ready: 'Hit Points' },
  { name: 'sheet-caster', role: 'owner', url: `/sheet/${scenes.casterId}`, ready: 'Hit Points' },
  { name: 'sheet-player', role: 'player', url: `/sheet/${scenes.playerId}`, ready: 'Hit Points' },
  { name: 'sheet-public', url: `/sheet/${scenes.casterId}`, ready: 'Hit Points' },
  { name: 'sheet-variants', role: 'owner', url: `/sheet/${scenes.variantId}`, ready: 'Hit Points' },
  { name: 'campaign-gm', role: 'gm', url: `/campaign/${scenes.campaignId}`, ready: 'The Shattered Observatory' },
  {
    name: 'campaign-player-redirect',
    role: 'player',
    url: `/campaign/${scenes.campaignId}`,
    ready: 'No campaigns found',
  },
  { name: 'stat-block-character', role: 'owner', url: `/stat-block/character/${scenes.casterId}`, ready: 'Merisiel' },
  { name: 'stat-block-creature', url: `/stat-block/creature/${scenes.creatureIds[0]}`, ready: 'Giant Orchid Mantis' },
  {
    name: 'oauth-access',
    role: 'owner',
    url: `/oauth/access?character_id=${scenes.casterId}&user_id=${accounts.owner.profileId}&client_id=local-review`,
    ready: 'wants to access your character',
  },
  { name: 'review-overview', role: 'mod', url: '/content-update-overview', ready: 'Content Update Overview' },
  ...(scenes.reviewUpdateIds ?? []).map((id, index) => ({
    name: `review-${['pending', 'approved', 'rejected'][index]}`,
    role: 'mod',
    url: `/content-update/${id}`,
    ready: 'Content Update by',
  })),
  { name: 'content-cleaning-source', role: 'admin', url: '/content-cleaning-source', ready: 'Content Cleaning' },
  {
    name: 'cleaning-log-complete',
    role: 'admin',
    url: '/content-cleaning/local-visual-complete',
    ready: 'Content Cleaning',
    setup: (win) => {
      win.localStorage.setItem('cleaning-status-local-visual-complete', 'done');
      win.localStorage.setItem(
        'cleaning-log-local-visual-complete',
        JSON.stringify([
          { type: 'thought', message: 'Reviewing the item fields.', timestamp: '2026-10-07T12:00:00Z' },
          {
            type: 'tool',
            message: 'fetchContent(item) → 1 result',
            detail: '{"type":"item"}',
            contentResults: {
              contentType: 'item',
              records: [{ id: scenes.homebrewItemId, name: 'Sapphire Watcher Spear' }],
            },
            timestamp: '2026-10-07T12:00:01Z',
          },
          { type: 'done', message: 'Cleaned successfully', timestamp: '2026-10-07T12:00:02Z' },
        ])
      );
    },
  },
  {
    name: 'cleaning-log-error',
    role: 'admin',
    url: '/content-cleaning/local-visual-error',
    ready: 'Content Cleaning',
    setup: (win) => {
      win.localStorage.setItem('cleaning-status-local-visual-error', 'error');
      win.localStorage.setItem(
        'cleaning-log-local-visual-error',
        JSON.stringify([
          { type: 'error', message: 'The local review service is unavailable.', timestamp: '2026-10-07T12:00:00Z' },
        ])
      );
    },
  },
  { name: 'patreon-redirect', role: 'owner', url: '/auth/patreon/redirect', loading: true },
  { name: 'gm-share-redirect', role: 'player', url: `/gm-share/${accounts.gm.userId}`, loading: true },
];
describe(`App routes ${scheme}-${Cypress.config('viewportWidth')}`, () => {
  for (const scene of cases.filter(
    (s) =>
      !Cypress.env('reviewFilter') ||
      Cypress.env('reviewFilter')
        .split(',')
        .some((f) => s.name.startsWith(f))
  ))
    it(scene.name, { retries: 1 }, () => {
      recordedCatalogReads();
      cy.intercept('POST', '**/functions/v1/handle-patreon-redirect', {
        statusCode: 503,
        body: { status: 'error', message: 'Local visual review' },
      });
      cy.intercept('POST', '**/functions/v1/gm-add-to-group', {
        statusCode: 503,
        body: { status: 'error', message: 'Local visual review' },
      });
      for (const endpoint of [
        'generate-encounter',
        'generate-content',
        'generate-image',
        'clean-content',
        'create-content-update',
      ])
        cy.intercept('POST', `**/functions/v1/${endpoint}`, {
          statusCode: 503,
          body: { status: 'error', message: 'Local visual review' },
        });

      if (scene.role)
        cy.intercept('POST', '**/functions/v1/get-user', (req) => {
          if (!req.body.id || req.body.id === accounts[scene.role].userId)
            req.reply({ status: 'success', data: accounts[scene.role].profile });
          else req.continue();
        });
      if (scene.role) {
        cy.intercept('POST', '**/auth/v1/token*').as('reviewSignIn');
        cy.visit('/login?redirect=characters', {
          onBeforeLoad(win) {
            win.localStorage.setItem('wg-color-scheme', JSON.stringify(scheme));
            scene.setup?.(win);
          },
        });
        cy.get('input[name=email]:visible').type(accounts[scene.role].email, { log: false });
        cy.get('input[name=password]:visible').type(accounts[scene.role].password, { log: false });
        cy.contains('button', 'Sign in with Email').click();
        cy.wait('@reviewSignIn', { timeout: 120000 }).its('response.statusCode').should('eq', 200);
        cy.location('pathname', { timeout: 30000 }).should('eq', '/characters');
        cy.contains('header', `Light mode ${scene.role}`, { timeout: 30000 }).should('exist');
        cy.window().then((win) => {
          win.history.pushState({}, '', scene.url);
          win.dispatchEvent(new win.PopStateEvent('popstate'));
        });
      } else
        cy.visit(scene.url, {
          onBeforeLoad(win) {
            win.localStorage.setItem('wg-color-scheme', JSON.stringify(scheme));
            scene.setup?.(win);
          },
        });
      if (scene.ready)
        cy.get('body').then(($body) => {
          cy.contains($body.find('main').length ? 'main' : 'body', scene.ready, { timeout: 120000 }).should(
            'be.visible'
          );
        });
      if (scene.name.startsWith('builder-'))
        cy.get('input[placeholder="Unknown Wanderer"]', { timeout: 120000 }).should('be.visible');
      if (scene.loading) {
        capture('pages/' + scene.name + '/loading');
        return;
      }
      cy.get('.mantine-Loader-root:visible,.mantine-LoadingOverlay-root:visible', { timeout: 120000 }).should(
        'not.exist'
      );
      scene.action?.();
      const name = 'pages/' + scene.name;
      captureScrolls(name, 'body');
      reviewPanels(name, 'body');
      if (Cypress.env('reviewInteractions')) reviewPortals(name, 'body');
    });
});
