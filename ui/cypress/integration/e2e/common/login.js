import { Given, Then } from 'cypress-cucumber-preprocessor/steps';

Given('I am logged in', () => {
  cy.visit('/');
  cy.server();
  cy.route('GET', '/oidc/.well-known/openid-configuration').as(
    'getOidcConfiguration',
  );
  cy.wait('@getOidcConfiguration');

  //Check if we are redirected to the DEX login page
  cy.location('pathname').should('eq', '/oidc/auth');

  //click "Login with email" button when DEX "alwaysShowLoginScreen" is true
  cy.findByText(/Log in with Email/i).click();

  const email = Cypress.env('email');
  const userName = Cypress.env('username');
  const userPassword = Cypress.env('password');

  //Fill Dex login form and validate it
  cy.get('input[type=text]').type(email);
  cy.get('input[type=password]').type(userPassword);
  cy.get('button').click();

  //Check if the login is successfull and we going back to the UI
  cy.location('pathname').should('eq', '/');
  cy.server();
  cy.route('POST', '/api/salt/login').as('saltAuthentication');
  const timeOut = {
    requestTimeout: 30000,
    responseTimeout: 30000,
  };
  cy.wait('@saltAuthentication', timeOut);

  cy.findByRole('navigation').should(
    'contain',
    userName,
  );
});

Then('I log out', () => {
  const userName = Cypress.env('username');
  cy.findByRole('navigation').within(() => {
    cy.findByText(userName).click();
    cy.findByText(/log out/i).click();
  })
  //Check if we are redirected to the DEX login page
  cy.location('pathname').should('eq', '/oidc/auth');
});
