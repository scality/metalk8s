beforeEach(() => {
  cy.setupMocks();
  cy.login();
});

// Navigation tests
describe('Node list', () => {
  beforeEach(() => {
    cy.server();
    cy.route('api/kubernetes/api/v1/nodes', 'fixture:kubernetes/nodes.json');
    // Visit is automatically prefixed with baseUrl
    cy.visit('/nodes');
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
    cy.url().should(
      'eq',
      Cypress.config().baseUrl + '/nodes/master-0/overview',
    );
  });
});
