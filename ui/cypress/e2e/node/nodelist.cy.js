// Navigation tests
describe('Node list', () => {
  beforeEach(() => {
    cy.setupMocks();
    cy.login();
  });

  it('brings me to the overview tab of the first Node', () => {
    cy.visit('/nodes');
    cy.stubHistory();

    cy.fixture('kubernetes/nodes.json').then((nodes) => {
      // With sorting implemented, node "test" is in unknown state hence should be the first on the nodelist.
      cy.location('pathname').should('eq', `/nodes/test/overview`);
    });
  });

  it('brings me to the overview tab of master-0 Node', () => {
    cy.visit('/nodes');
    cy.stubHistory();
    // Wait until retrieve the data from Salt to avoid the DOM detachment
    cy.findByText(/CP: 192.168.1.36/i);

    cy.findByRole('row', { name: /master-0/i }).click({ force: true });
    cy.url().should('include', '/nodes/master-0/overview');
  });

  it('brings me to another node with the same tab selected and queryString kept', () => {
    cy.visit('/nodes/master-0/metrics?from=now-7d');
    cy.stubHistory();

    cy.findByText(/CP: 192.168.1.36/i);

    cy.findByRole('row', { name: /master-1/i }).click({ force: true });
    cy.url().should('include', '/nodes/master-1/metrics?from=now-7d');
  });

  it('brings me to create node page', () => {
    cy.visit('/nodes');
    cy.stubHistory();

    cy.fixture('kubernetes/nodes.json').then((nodes) => {
      // With sorting implemented, node "test" is in unknown state hence should be the first on the nodelist.
      cy.location('pathname').should('eq', `/nodes/test/overview`);
    });

    cy.get('[data-cy="create_node_button"]').click();
    cy.url().should('include', '/nodes/create');
  });

  it('updates url with the search', () => {
    cy.visit('/nodes');
    cy.stubHistory();

    cy.findByRole('searchbox').type('hello');
    cy.url().should('include', '?search=hello');
  });

  it('keeps warning severity for the alert while searching the node', () => {
    cy.visit('/nodes/master-0/alerts?severity=warning');
    cy.stubHistory();

    cy.findByRole('searchbox').type('hello');
    cy.url().should('include', '/nodes/master-0/alerts?severity=warning&search=hello');
  });
});
