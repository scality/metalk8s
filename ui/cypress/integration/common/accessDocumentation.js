import { Then } from 'cypress-cucumber-preprocessor/steps';

Then('I can access the documentation from the navbar', () => {
  const target_url = Cypress.env('target_url');

  cy.visit(target_url, {
    onBeforeLoad(win) {
      // win is the the remote page's window object
      // `cy.stub()` stubs the window.open method
      cy.stub(win, 'open', url => {
        expect(url).to.have.string('/docs/index.html');
      });
    },
  });

  cy.get('.sc-dropdown')
    .eq(1)
    .click();

  cy.get('[data-cy = documentation]').click();
});
