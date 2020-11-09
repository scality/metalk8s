beforeEach(() => {
  cy.setupMocks();
  cy.login();
});

// Navigation tests
describe('Volume list', () => {
  beforeEach(() => {
    // Visit is automatically prefixed with baseUrl
    cy.visit('/volumes');
    cy.stubHistory();
  });

  it('brings me to the overview tab of the unhealthy volume', () => {
    // Volume `master-0-alertmanager` has alert.
    // According to the default sorting rule, it should appear at the first place.
    cy.wait(['@getPVs', '@getPVCs', '@getAlerts', '@getVolumes']);
    cy.url().should(
      'eq',
      Cypress.config().baseUrl + '/volumes/master-0-alertmanager/overview',
    );
  });

  it('brings me to the overview tab of master-0-alertmanager Volume', () => {
    cy.get('[data-cy="volume_table_name_cell"]')
      .contains('master-1-prometheus')
      .click();
    cy.get('@historyPush').should('be.calledWithExactly', {
      pathname: '/volumes/master-1-prometheus/overview',
      search: '',
    });
  });

  it('brings me to another volume with the same tab selected and queryString kept', () => {
    cy.visit('/volumes/master-1-prometheus/metrics?from=now-7d');
    cy.stubHistory();

    cy.get('[data-cy="volume_table_name_cell"]')
      .contains('prom-m0-reldev')
      .click();
    cy.get('@historyPush').should('be.calledOnce').and('be.calledWithExactly', {
      pathname: '/volumes/prom-m0-reldev/metrics',
      search: 'from=now-7d',
    });
  });

  it('brings me to create volume page', () => {
    cy.get('[data-cy="create_volume_button"]').click();
    cy.get('@historyPush').and('be.calledWithExactly', '/volumes/createVolume');
  });

  it('updates url with the search', () => {
    cy.get('[data-cy="volume_list_search"]').type('hello');
    cy.get('@historyPush').and('be.calledWithExactly', '?search=hello');
  });

  // it(`keeps warning severity for the alert while searching the node`, () => {
  //   cy.visit('/nodes/master-0/alerts?severity=warning');
  //   cy.stubHistory();
  //   cy.get('[data-cy="node_list_search"]').type('hello');

  //   cy.get('@historyPush').should(
  //     'be.calledWithExactly',
  //     '?severity=warning&search=hello',
  //   );
  // });
});
