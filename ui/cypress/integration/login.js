describe('Login test', function () {
  it('should login', function () {
    let target_url = Cypress.env('target_url');
    cy.visit(target_url);

    // FIXME Need to find a workaround for the api certification
  })
})
