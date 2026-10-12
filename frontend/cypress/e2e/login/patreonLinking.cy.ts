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
    { name: 'connected without a paid tier', query: 'code=fixture-code', connected: true, noTier: true, width: 1280 },
    {
      name: 'phone connected without a paid tier',
      query: 'code=fixture-code',
      connected: true,
      noTier: true,
      width: 390,
    },
    { name: 'provider rejection', query: 'code=fixture-code', connected: false, width: 1280 },
    { name: 'network failure', query: 'code=fixture-code', connected: false, width: 1280, http: 503 },
    { name: 'cancelled authorization', query: 'error=access_denied', connected: false, width: 1280 },
    { name: 'missing authorization', query: '', connected: false, width: 390 },
    { name: 'slow successful provider', query: 'code=fixture-code', connected: true, width: 1280, delay: 500 },
    { name: 'Game Master settings', query: 'code=fixture-code', connected: true, gm: true, width: 1280 },
    { name: 'phone Game Master settings', query: 'code=fixture-code', connected: true, gm: true, width: 390 },
    { name: 'virtual member without a Patreon link', query: '', connected: false, virtual: true, width: 390 },
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
        if (endpoint === 'get-user')
          data = {
            ...profile,
            patreon: linked
              ? {
                  patreon_user_id: 'fixture-patreon-user',
                  tier: scenario.noTier ? undefined : scenario.gm ? 'GAME-MASTER' : 'WANDERER',
                  game_master: scenario.gm ? { access_code: 'fixture-group-code' } : undefined,
                }
              : scenario.virtual
                ? {
                    game_master: {
                      virtual_tier: {
                        game_master_user_id: 'fixture-game-master',
                        game_master_name: 'Fixture Game Master',
                        added_at: '2026-10-09T00:00:00Z',
                      },
                    },
                  }
                : undefined,
          };
        else if (endpoint === 'gm-users-in-group' && scenario.gm)
          data = [{ ...profile, user_id: 'fixture-group-member', display_name: 'AlexandriaTheWandererOfWestbridge' }];
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
      // The status control must expand settings rather than behave as an OAuth link.
      cy.get('[data-testid="patreon-settings"] .mantine-Accordion-control', { timeout: 30000 }).should(($control) => {
        expect($control).to.contain(scenario.connected ? 'Connected' : 'Not connected');
        expect($control).to.have.attr('aria-expanded', 'false');
        expect($control).not.to.have.attr('href');
      });
      if (scenario.noTier)
        cy.screenshot(`patreon-${scenario.name.replaceAll(' ', '-')}-collapsed`, { capture: 'fullPage' });
      cy.get('[data-testid="patreon-settings"] .mantine-Accordion-control')
        .click()
        .should('have.attr', 'aria-expanded', 'true');
      cy.location('pathname').should('eq', '/account');
      cy.get('[data-testid="patreon-settings"]').within(() => {
        cy.contains('Membership').should('be.visible');
        cy.contains('a', scenario.connected ? 'Reconnect' : 'Connect to Patreon')
          .should('be.visible')
          .invoke('attr', 'href')
          .then((href) => {
            const url = new URL(href!);
            expect(url.origin).to.equal('https://www.patreon.com');
            expect(url.pathname).to.equal('/oauth2/authorize');
            expect(url.searchParams.get('scope')).to.equal('identity identity[email]');
            expect(url.searchParams.get('redirect_uri')).to.equal(`${Cypress.config('baseUrl')}/auth/patreon/redirect`);
          });
        if (scenario.connected)
          cy.contains('a', 'View Patreon').should('have.attr', 'href', 'https://www.patreon.com/wanderersguide');
        if (scenario.gm) {
          cy.contains('Game Master').should('be.visible');
          cy.contains('Users in your Group').should('be.visible');
          cy.contains('AlexandriaTheWandererOfWestbridge').should('be.visible');
          cy.contains('button', 'Copy').should('be.visible');
          cy.contains('button', 'Regenerate').should('be.visible');
          cy.contains('fixture-group-code').should('be.visible');
          cy.screenshot(`patreon-${scenario.name.replaceAll(' ', '-')}-summary`, { capture: 'fullPage' });
          // Account scrolls inside the app shell, so a full-page capture alone misses its lower controls.
          cy.contains('fixture-group-code').scrollIntoView().should('be.visible');
          cy.screenshot(`patreon-${scenario.name.replaceAll(' ', '-')}-sharing`, { capture: 'fullPage' });
        } else cy.contains('Users in your Group').should('not.exist');
        if (scenario.virtual) cy.contains('Wanderer (Virtual)').should('be.visible');
      });
      cy.get('.mantine-Notification-root').should('not.exist');
      if (scenario.noTier) {
        cy.contains('Non-Patron').should('be.visible');
        cy.reload();
        cy.get('[data-testid="patreon-settings"] .mantine-Accordion-control')
          .should('contain', 'Connected')
          .and('have.attr', 'aria-expanded', 'false');
        cy.contains('Non-Patron').should('be.visible');
        cy.get('[data-testid="patreon-settings"] .mantine-Accordion-control').click();
      }
      cy.document().then((doc) => expect(doc.documentElement.scrollWidth).to.be.at.most(scenario.width));
      cy.then(() => expect(exchanges).to.equal(scenario.query.includes('code=') ? 1 : 0));
      cy.screenshot(`patreon-${scenario.name.replaceAll(' ', '-')}`, { capture: 'fullPage' });
    });
  }
});
