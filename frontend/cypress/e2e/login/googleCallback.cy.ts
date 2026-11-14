/** Real browser/SDK callback coverage; all Auth and account HTTP stays inside fixtures. */
describe('Google callback session persistence', () => {
  for (const width of [390, 1280]) {
    for (const transient of [false, true]) {
      it(`keeps the account after ${transient ? 'a transient callback outage and ' : ''}reload at ${width}px`, () => {
        const actor = '00000000-0000-4000-8000-000000000447';
        const expiresAt = Math.floor(Date.now() / 1000) + 3600;
        const jwt = `${btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).replace(/=+$/, '')}.${btoa(JSON.stringify({ sub: actor, aud: 'authenticated', role: 'authenticated', exp: expiresAt })).replace(/=+$/, '')}.fixture`;
        const user = {
          id: actor,
          aud: 'authenticated',
          role: 'authenticated',
          app_metadata: { provider: 'google' },
          user_metadata: {},
          created_at: '',
        };
        let reads = 0;
        cy.viewport(width, 900);
        cy.intercept('GET', '**/auth/v1/user', (request) => {
          reads++;
          request.reply(
            transient && reads === 1
              ? { statusCode: 503, body: { message: 'Fixture temporary validation outage' } }
              : { statusCode: 200, body: user }
          );
        });
        cy.intercept('POST', '**/auth/v1/token*', () => {
          throw new Error('Fresh callback must not refresh its token');
        });
        cy.intercept('POST', '**/functions/v1/*', (request) => {
          const endpoint = new URL(request.url).pathname.split('/').pop();
          if (endpoint === 'get-user') {
            request.reply({
              body: {
                status: 'success',
                data: {
                  id: 990447,
                  user_id: actor,
                  created_at: '',
                  display_name: 'Google callback fixture',
                  image_url: null,
                  background_image_url: null,
                  site_theme: null,
                  is_admin: false,
                  is_mod: false,
                  is_developer: false,
                  is_community_paragon: false,
                  patreon: null,
                },
              },
            });
          } else if (endpoint?.startsWith('find-') || endpoint === 'get-content-versions') {
            request.reply({ body: { status: 'success', data: [] } });
          } else if (endpoint === 'report-client-error') {
            request.reply({ body: { status: 'success', data: null } });
          } else throw new Error(`Unexpected callback fixture request: ${endpoint}`);
        });
        cy.visit(
          '/#' +
            new URLSearchParams({
              access_token: jwt,
              refresh_token: 'fixture-google-refresh',
              expires_in: '3600',
              expires_at: String(expiresAt),
              token_type: 'bearer',
            })
        );
        cy.contains('Google callback fixture', { timeout: 15000 }).should('exist');
        cy.location('hash').should('not.contain', 'access_token');
        cy.then(() => expect(reads).to.equal(transient ? 2 : 1));
        cy.reload();
        cy.contains('Google callback fixture', { timeout: 15000 }).should('exist');
        cy.visit('/characters');
        cy.location('pathname').should('eq', '/characters');
        cy.contains('No characters found, want to create one?', { timeout: 15000 }).should('be.visible');
        cy.contains('Google callback fixture', { timeout: 15000 }).should('exist');
      });
    }
  }
});
