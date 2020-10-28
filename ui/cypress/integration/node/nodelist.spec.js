beforeEach(() => {
  cy.setupMocks();
  cy.login();
});

// Navigation tests
describe('Node list', () => {
  beforeEach(() => {
    // Visit is automatically prefixed with baseUrl
    cy.visit('/nodes');
    cy.window()
      .its('__history__')
      .then((history) => {
        cy.stub(history, 'push').as('historyPush');
      });
  });

  // Test the navigation
  it('brings me to the overview tab of the first Node', () => {
    cy.fixture('kubernetes/nodes.json').then((nodes) => {
      // It may break when we implement sorting for the nodes
      cy.url().should(
        'eq',
        Cypress.config().baseUrl +
          `/nodes/${nodes.items[0].metadata.name}/overview`,
      );
    });
  });

  it('brings me to the overview tab of master-0 Node', () => {
    cy.get('[data-cy="node_table_name_cell"]').contains('master-0').click();
    cy.get('@historyPush').should('be.calledWith', {
      pathname: '/nodes/master-0/overview',
      search: '',
    });
  });

  it('brings me to another node with the same tab selected and queryString kept', () => {
    cy.visit('/nodes/master-0/metrics');
    cy.window()
      .its('__history__')
      .then((history) => {
        cy.stub(history, 'push').as('historyPush');
      });
    cy.get('.sc-tabs-item-content .sc-dropdown').click();
    cy.get('[data-cy="Last 7 days"]').click();
    cy.get('@historyPush').should('be.calledWith', {
      search: 'from=now-7d',
    });
    cy.get('[data-cy="node_table_name_cell"]').contains('master-1').click();
    // history.push({
    //   pathname: newPath,
    //   search: query.toString(),
    // });
    // For some reason, it has been seperated into 2 call.
    cy.get('@historyPush').should('be.calledWith', {
      search: 'from=now-7d',
    });
    cy.get('@historyPush').should('be.calledWith', {
      pathname: '/nodes/master-1/metrics',
      search: '',
    });
  });
});
