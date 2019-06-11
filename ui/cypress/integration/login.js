describe('Login test', function() {
  it('should login', function() {
    let target_url = Cypress.env('target_url');
    cy.visit(target_url);

    cy.server();
    cy.route('GET', '/api/v1').as('getAPIResourceList');

    let userName = Cypress.env('username');
    let userPassword = Cypress.env('password');

    cy.get('input[type=text]').type(userName);
    cy.get('input[type=password]').type(userPassword);
    cy.get('button').click();
    cy.wait('@getAPIResourceList');
    cy.get('.sc-navbar .sc-dropdown > .trigger > span')
      .eq(3) // Last dropdown of the navbar
      .should('contain', userName);
  });
});
