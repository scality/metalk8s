beforeEach(() => {
  cy.setupMocks();
  cy.login();
});

// Navigation tests
describe('Node list', () => {
  beforeEach(() => {
    // Visit is automatically prefixed with baseUrl
    cy.visit('/nodes');
    cy.stubHistory();
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
    cy.visit('/nodes/master-0/metrics?from=now-7d');

    cy.stubHistory();
    cy.get('[data-cy="node_table_name_cell"]').contains('master-1').click();
    cy.get('@historyPush').should('be.calledOnce').and('be.calledWithExactly', {
      pathname: '/nodes/master-1/metrics',
      search: 'from=now-7d',
    });
  });
});
