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

    cy.get('[data-cy="node_table_name_cell"]')
      .contains('master-0')
      .click({ waitForAnimations: false });
    cy.get('@historyPush').should('be.calledWithExactly', {
      pathname: '/nodes/master-0/overview',
      search: '',
    });
  });

  it('brings me to another node with the same tab selected and queryString kept', () => {
    cy.visit('/nodes/master-0/metrics?from=now-7d');
    cy.stubHistory();

    cy.get('[data-cy="node_table_name_cell"]')
      .contains('master-1')
      .click({ waitForAnimations: false });
    cy.get('@historyPush').should('be.calledOnce').and('be.calledWithExactly', {
      pathname: '/nodes/master-1/metrics',
      search: 'from=now-7d',
    });
  });

  it('brings me to create node page', () => {
    cy.visit('/nodes');
    cy.stubHistory();

    cy.get('[data-cy="create_node_button"]').click();
    cy.get('@historyPush').and('be.calledWithExactly', '/nodes/create');
  });

  it('updates url with the search ', () => {
    cy.visit('/nodes');
    cy.stubHistory();

    cy.get('[data-cy="node_list_search"]').type('hello');
    cy.get('@historyReplace').and('be.calledWithExactly', '?search=hello');
  });

  it(`keeps warning severity for the alert while searching the node`, () => {
    cy.visit('/nodes/master-0/alerts?severity=warning');
    cy.stubHistory();

    cy.get('[data-cy="node_list_search"]').type('hello');
    cy.get('@historyReplace').should(
      'be.calledWithExactly',
      '?severity=warning&search=hello',
    );
  });
});
