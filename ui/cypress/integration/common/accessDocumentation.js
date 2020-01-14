<<<<<<< HEAD
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
||||||| merged common ancestors
=======
import { Then } from 'cypress-cucumber-preprocessor/steps';

Then('I access the documentation from the navbar', () => {
  const target_url = Cypress.env('target_url');

  cy.visit(target_url, {
    onBeforeLoad(win) {
      // win is the the remote page's window object
      // `cy.stub()` stubs the window.open method
      cy.stub(win, 'open', url => {
        // cannot make a HTTP request to the documentation url because cypress doesn't support the `SameSite`
        // cy.request(url_doc).then(response => {
        //   expect(response.status).to.eq(200);
        // });
        // what we can do for the moment is to check the url
        expect(url).to.have.string('/index.html');
      });
    },
  });

  cy.get('.sc-dropdown')
    .eq(1)
    .click();

  cy.get('[data-cy = documentation]').click();
});
>>>>>>> 63e07ebad0eb98ee1f153cf05d9949ca46e9fc3b
