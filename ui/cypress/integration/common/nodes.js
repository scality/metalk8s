import { Then } from 'cypress-cucumber-preprocessor/steps';

Then('I go to the nodes list by click the node icon in the sidebar', () => {
  cy.get('.sc-sidebar-item')
    .eq(1)
    .click(); // go to nodes list

  cy.get('.sc-table-row').should('have.length', 2); //Table header is included
  cy.get('.sc-table-row')
    .eq(1)
    .find('.sc-table-column-cell-name')
    .should('contain', 'bootstrap'); //default node
});
