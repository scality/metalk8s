import { When, Then } from 'cypress-cucumber-preprocessor/steps';

When('I am on the node page', () => {
  cy.server();
  cy.route('GET', '/api/kubernetes/api/v1/nodes').as('getNodes');
  cy.visit('/nodes');
});

Then('the bootstrap node appears the node list', () => {
  const timeOut = {
    requestTimeout: 30000,
    responseTimeout: 30000,
  };
  cy.wait('@getNodes', timeOut);
  cy.get('[data-cy=node_table_name_cell]').should('have.length', 1);
});
