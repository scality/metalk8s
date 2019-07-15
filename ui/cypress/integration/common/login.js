import { Given } from 'cypress-cucumber-preprocessor/steps';

Given('I log in', () => {
  const target_url = Cypress.env('target_url');
  cy.visit(target_url);
  cy.server();
  cy.route('GET', '/api/v1').as('getAPIResourceList');
  cy.route('GET', '**/alerts').as('getAlerts');

  const userName = Cypress.env('username');
  const userPassword = Cypress.env('password');

  cy.get('input[type=text]').type(userName);
  cy.get('input[type=password]').type(userPassword);
  cy.get('button').click();
  cy.wait(['@getAPIResourceList', '@getAlerts']);
  cy.get('.sc-navbar .sc-dropdown > .trigger > .sc-trigger-text').should(
    'contain',
    userName
  );
});
