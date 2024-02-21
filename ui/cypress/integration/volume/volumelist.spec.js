beforeEach(() => {
  cy.setupMocks();
  cy.login();
});

// Navigation tests
describe('Volume list', () => {
  const UNHEALTHY_VOLUME_NAME = 'master-0-alertmanager';
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
      `/volumes/${UNHEALTHY_VOLUME_NAME}/overview`,
    );
  });

  it(
    'brings me to the overview tab of master-0-alertmanager Volume',
    { scrollBehavior: false },
    () => {
      // After implementing the virtualized table, not all the volumes are visible at the first render.
      // So we should test the first several volumes which are visiable.
      cy.visit('/volumes');
      // The application re-renders, it's possible the element we're interacting with has become "dead"
      // cy... failed because the element has been detached from the DOM
      cy.findAllByLabelText('Check-circle status healthy');
      cy.findByRole('gridcell', {
        name: UNHEALTHY_VOLUME_NAME,
      }).click({ force: true });
      cy.get('[data-cy="volume_detail_card_name"]').should(
        'contain',
        UNHEALTHY_VOLUME_NAME,
      );
      cy.url().should('include', `/volumes/${UNHEALTHY_VOLUME_NAME}/overview`);
    },
  );

  it('brings me to another volume with the same tab selected and queryString kept', () => {
    cy.visit('/volumes/master-1-prometheus/metrics?from=now-7d');

    cy.findByText(UNHEALTHY_VOLUME_NAME).click({ force: true });
    cy.findByText(/advanced metrics/i);
    cy.url().should(
      'include',
      `/volumes/${UNHEALTHY_VOLUME_NAME}/metrics?from=now-7d`,
    );
  });

  it('brings me to create volume page', () => {
    cy.visit('/volumes');
    cy.stubHistory();

    cy.get('[data-cy="create_volume_button"]').click();
    cy.get('@historyPush').and('be.calledWithExactly', '/volumes/createVolume');
  });

  it('updates url query param with the search input', () => {
    cy.visit('/volumes/master-1-prometheus/overview');
    //E
    cy.findAllByLabelText('Check-circle status healthy');
    cy.findByText(/delete volume/i);
    cy.findByRole('searchbox').type('hello');
    //V
    cy.url().should(
      'include',
      `/volumes/master-1-prometheus/overview?search=hello`,
    );
  });

  it('keeps warning severity for the alert while searching the node', () => {
    cy.visit('/volumes/master-1-prometheus/alerts?severity=warning');

    cy.findByRole('searchbox').type('hello');
    cy.url().should(
      'include',
      '/volumes/master-1-prometheus/alerts?severity=warning&search=hello',
    );
  });
});
