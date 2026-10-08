const actor = '00000000-0000-4000-8000-000000000376';
const profile = {
  id: 990376,
  user_id: actor,
  display_name: 'Patreon connection fixture',
  is_admin: false,
  is_mod: false,
  image_url: null,
  background_image_url: null,
};

describe('Quiet Patreon account linking', () => {
  for (const scenario of [
    { name: 'success', query: 'code=fixture-code', connected: true, width: 1280 },
    { name: 'phone success', query: 'code=fixture-code', connected: true, width: 390 },
    { name: 'provider rejection', query: 'code=fixture-code', connected: false, width: 1280 },
    { name: 'network failure', query: 'code=fixture-code', connected: false, width: 1280, http: 503 },
    { name: 'cancelled authorization', query: 'error=access_denied', connected: false, width: 1280 },
    { name: 'missing authorization', query: '', connected: false, width: 390 },
    { name: 'slow successful provider', query: 'code=fixture-code', connected: true, width: 1280, delay: 500 },
  ]) {
    if (Cypress.env('patreonCase') && Cypress.env('patreonCase') !== scenario.name) continue;
    it(`${scenario.name} returns to Account with fresh state and no recovery messages`, () => {
      let linked = false;
      let exchanges = 0;
      const errors: string[][] = [];
      cy.on('window:before:load', (win) => {
        const original = win.console.error.bind(win.console);
        win.console.error = (...args) => {
          errors.push(args.map((value) => value?.message ?? String(value)));
          original(...args);
        };
      });
      cy.on('fail', (error) => {
        error.message += `\nApplication diagnostics: ${JSON.stringify(errors)}`;
        throw error;
      });
      cy.viewport(scenario.width, 900);
      cy.intercept('**/auth/v1/**', () => {
        throw new Error('Isolated callback fixture must not contact authentication');
      });
      cy.intercept('POST', '**/functions/v1/*', (req) => {
        const endpoint = new URL(req.url).pathname.split('/').pop();
        let data: unknown = [];
        if (endpoint === 'handle-patreon-redirect') {
          exchanges++;
          expect(req.body.code).to.equal('fixture-code');
          linked = scenario.connected;
          req.reply({
            statusCode: scenario.http ?? 200,
            delay: scenario.delay ?? 0,
            body: scenario.connected
              ? { status: 'success', data: 'Patreon connected' }
              : { status: 'error', message: 'Patreon connection could not be completed.' },
          });
          return;
        }
        if (endpoint === 'get-user') data = { ...profile, patreon: linked ? { tier: 'WANDERER' } : undefined };
        else if (endpoint === 'report-client-error') data = null;
        else if (
          !endpoint?.startsWith('find-') &&
          !['get-content-versions', 'gm-users-in-group'].includes(endpoint ?? '')
        ) {
          throw new Error(`Unexpected callback fixture request: ${endpoint}`);
        }
        req.reply({ statusCode: 200, body: { status: 'success', data } });
      });
      cy.visit(`/auth/patreon/redirect?${scenario.query}`, {
        onBeforeLoad(win) {
          const host = new URL(Cypress.env('functions_url')).hostname.split('.')[0];
          const token = `${win.btoa('{}')}.${win.btoa(JSON.stringify({ sub: actor, exp: 4102444800 }))}.fixture`;
          win.localStorage.setItem(
            `sb-${host}-auth-token`,
            JSON.stringify({
              access_token: token,
              refresh_token: 'fixture',
              token_type: 'bearer',
              expires_at: 4102444800,
              expires_in: 3600,
              user: {
                id: actor,
                aud: 'authenticated',
                role: 'authenticated',
                email: 'fixture@example.invalid',
                app_metadata: {},
                user_metadata: {},
                created_at: '',
              },
            })
          );
          win.localStorage.setItem('user-data', JSON.stringify(profile));
        },
      });
      cy.location('pathname', { timeout: 30000 }).should('eq', '/account');
      cy.location('search').should('eq', '');
      cy.contains(scenario.connected ? 'Patreon Connected' : 'Connect to Patreon', { timeout: 30000 }).should(
        'be.visible'
      );
      cy.get('.mantine-Notification-root').should('not.exist');
      cy.then(() => expect(exchanges).to.equal(scenario.query.includes('code=') ? 1 : 0));
      cy.screenshot(`patreon-${scenario.name.replaceAll(' ', '-')}`, { capture: 'viewport' });
    });
  }
});
