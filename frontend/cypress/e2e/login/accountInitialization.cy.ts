/** Navigation must not publish signed-out controls while the saved session is restoring. */
describe('Account navigation initialization', () => {
  let releaseRefresh: (() => void) | undefined;

  afterEach(() => releaseRefresh?.());

  for (const restored of [true, false]) {
    it(`waits for auth before showing ${restored ? 'the account' : 'sign in'}`, () => {
      const actor = '00000000-0000-4000-8000-000000000001';
      const savedSession = (expiresAt: number) => ({
        access_token: `${btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).replace(/=+$/, '')}.${btoa(JSON.stringify({ sub: actor, role: 'authenticated', exp: expiresAt })).replace(/=+$/, '')}.fixture`,
        refresh_token: 'fixture',
        token_type: 'bearer',
        expires_at: expiresAt,
        expires_in: 3600,
        user: {
          id: actor,
          aud: 'authenticated',
          role: 'authenticated',
          app_metadata: {},
          user_metadata: {},
          created_at: '',
        },
      });
      const pending = new Promise<void>((resolve) => {
        releaseRefresh = resolve;
      });
      cy.intercept('POST', '**/auth/v1/token*', (request) =>
        pending.then(() =>
          request.reply(
            restored
              ? { statusCode: 200, body: savedSession(4102444800) }
              : { statusCode: 400, body: { code: 'refresh_token_not_found', message: 'Fixture signed out' } }
          )
        )
      );
      cy.intercept('POST', '**/functions/v1/get-user', {
        body: { status: 'success', data: { id: 1, user_id: actor, display_name: 'Fixture account' } },
      });
      cy.viewport(1280, 900);
      cy.visit('/', {
        onBeforeLoad(win) {
          const host = new URL(Cypress.expose('functions_url')).hostname.split('.')[0];
          win.localStorage.setItem(`sb-${host}-auth-token`, JSON.stringify(savedSession(1)));
          win.localStorage.removeItem('user-data');
        },
      });
      cy.get('header [aria-label="Loading account"]').should('be.visible');
      cy.get('header').should('not.contain.text', 'Sign in');
      cy.get('nav').should('not.contain.text', 'Sign in');
      cy.then(() => releaseRefresh?.());
      if (restored) {
        cy.get('header').contains('Fixture account').should('be.visible');
        cy.get('header').should('not.contain.text', 'Sign in');
      } else {
        cy.get('header').contains('Sign in').should('be.visible');
      }
    });
  }
});
