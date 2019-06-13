describe('Login test', function() {
  it('should login', function() {
    let target_url = Cypress.env('target_url');
    cy.visit(target_url);

    cy.server();
    cy.route('GET', '/api/v1').as('getAPIResourceList');
    cy.route('GET', '**/alerts').as('getAlerts');

    let userName = Cypress.env('username');
    let userPassword = Cypress.env('password');

    cy.get('input[type=text]').type(userName);
    cy.get('input[type=password]').type(userPassword);
    cy.get('button').click();
    cy.wait(['@getAPIResourceList', '@getAlerts']);
    cy.get('.sc-navbar .sc-dropdown > .trigger > span')
      .eq(3) // Last dropdown of the navbar
      .should('contain', userName);

    cy.get('.sc-sidebar-item')
      .eq(1)
      .click(); // go to nodes list

    cy.get('.sc-table-row').should('have.length', 2); //Table header is included
    cy.get('.sc-table-row')
      .eq(1)
      .find('.sc-table-column-cell-name')
      .should('contain', 'bootstrap'); //default node
  });
});
