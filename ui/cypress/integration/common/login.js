import { Given } from 'cypress-cucumber-preprocessor/steps';

Given('I log in', () => {
  const target_url = Cypress.env('target_url');
  cy.visit(target_url);
  cy.server();
  cy.route('GET', '/oidc/.well-known/openid-configuration').as(
    'getOidcConfiguration',
  );
  cy.wait('@getOidcConfiguration');

  //Check if we are redirected to the DEX login page
  cy.location('pathname').should('eq', '/oidc/auth');

  //click "Login with email" button when DEX "alwaysShowLoginScreen" is true
  cy.get('.theme-form-row button').click();

  const email = Cypress.env('email');
  const userName = Cypress.env('username');
  const userPassword = Cypress.env('password');

  //Fill Dex login form and validate it
  cy.get('input[type=text]').type(email);
  cy.get('input[type=password]').type(userPassword);
  cy.get('button').click();

  //Check if the login is successfull and we going back to the UI
  cy.location('pathname').should('eq', '/oauth2/callback');
  cy.server();
  cy.route('POST', '/api/salt/login').as('saltAuthentication');
  const timeOut = {
    requestTimeout: 30000,
    responseTimeout: 30000,
  };
  cy.wait('@saltAuthentication', timeOut);

  cy.get('.sc-navbar .sc-dropdown > .trigger > .sc-trigger-text').should(
    'contain',
    userName,
  );
});
