// ***********************************************************
// This example support/index.js is processed and
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

import './commands';

beforeEach(() =>{
  // TODO figure out why CI is raising "clearImmediate is not defined" whereas everything goes well locally
  window.clearImmediate = {};
  cy.window().then((win) => {
    win.clearImmediate = {};
  });
})

afterEach(() => {
  // Redirect to empty page to cancel all requests in progress
  cy.window().then((win) => {
    win.location.href = 'about:blank';
  });
  // Wait a bit for cancelling requests
  cy.wait(500);
});
