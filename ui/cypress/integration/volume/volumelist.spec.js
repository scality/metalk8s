beforeEach(() => {
  cy.setupMocks();
  cy.login();
});

// Navigation tests
describe('Volume list', () => {
  it('brings me to the overview tab of the unhealthy volume', () => {
    // Specify a fake now timestamp to make sure the alert is active.
    const now = new Date('2020-11-09T08:33:26.330Z').getTime();
    cy.clock(now);
    // Note that:
    // If we visit() in beforeEach, make sure we don't visit() again within each test case, or it may create issues with the test
    // (some network requests would be interrupted) - see 07a34b5 (#2891)
    cy.visit('/volumes');
    cy.stubHistory();

    // Volume `master-0-alertmanager` has alert.
    // According to the default sorting rule, it should appear at the first place.
    cy.location('pathname').should(
      'eq',
      '/volumes/master-0-alertmanager/overview',
    );
  });

  it('brings me to the overview tab of worker-0-burry-1 Volume', () => {
    // After implementing the virtualized table, not all the volumes are visible at the first render.
    // So we should test the first several volumes which are visiable.

    cy.visit('/volumes');
    cy.stubHistory();
    // The application re-renders, it's possible the element we're interacting with has become "dead"
    // cy... failed because the element has been detached from the DOM

    cy.get('[data-cy="volume_table_name_cell"]')
      .contains('worker-0-burry-1')
      .click({ force: true });

    cy.get('@historyPush').should('be.calledWithExactly', {
      pathname: '/volumes/worker-0-burry-1/overview',
      search: '',
    });
  });

  it('brings me to another volume with the same tab selected and queryString kept', () => {
    cy.visit('/volumes/master-1-prometheus/metrics?from=now-7d');
    cy.stubHistory();

    cy.get('[data-cy="volume_table_name_cell"]')
      .contains('master-0-alertmanager')
      .click({ force: true });
    cy.get('@historyPush').should('be.calledOnce').and('be.calledWithExactly', {
      pathname: '/volumes/master-0-alertmanager/metrics',
      search: 'from=now-7d',
    });
  });

  it('brings me to create volume page', () => {
    cy.visit('/volumes');
    cy.stubHistory();

    cy.get('[data-cy="create_volume_button"]').click();
    cy.get('@historyPush').and('be.calledWithExactly', '/volumes/createVolume');
  });

  it('updates url with the search', () => {
    cy.visit('/volumes');
    cy.stubHistory();

    cy.get('[data-cy="volume_list_search"]').type('hello');
    cy.get('@historyPush').and('be.calledWithExactly', '?search=hello');
  });

  it(`keeps warning severity for the alert while searching the node`, () => {
    cy.visit('/volumes/master-1-prometheus/alerts?severity=warning');
    cy.stubHistory();

    cy.get('[data-cy="volume_list_search"]').type('hello');
    cy.get('@historyPush').should(
      'be.calledWithExactly',
      '?severity=warning&search=hello',
    );
  });
});
