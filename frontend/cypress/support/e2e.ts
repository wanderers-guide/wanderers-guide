// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands'

// Cypress 13 cannot instrument HTML returned from a service-worker cache, causing
// cy.visit() to hang even though the page rendered. Keep functional request/recovery
// tests on the network; browser-recovery.test.mjs exercises the actual update lifecycle.
// https://github.com/cypress-io/cypress/issues/30405
const isolateServiceWorker = () => cy.intercept('GET', '**/sw.js', {
  body: '/* Functional test worker: no cache or fetch interception. */',
  headers: { 'content-type': 'application/javascript', 'cache-control': 'no-store' },
});
before(isolateServiceWorker);
beforeEach(isolateServiceWorker);

// Alternatively you can use CommonJS syntax:
// require('./commands')
