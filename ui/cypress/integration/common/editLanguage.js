import { Then } from 'cypress-cucumber-preprocessor/steps';

Then('I change the language by click the dropdown in the narbar', () => {
  window.localStorage.setItem('language', 'EN');
  cy.get('.sc-dropdown')
    .eq(0)
    .click();
  cy.get('[data-cy=FR]').click();

  cy.get('.sc-dropdown')
    .eq(0)
    .get('.sc-trigger-text')
    .should('contain', 'FR');
});
