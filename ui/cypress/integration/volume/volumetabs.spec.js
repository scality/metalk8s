beforeEach(() => {
  cy.setupMocks();
  cy.login();
});

const allTabs = ['overview', 'alerts', 'metrics', 'details'];
const tabSwitchingTestCases = (sourceTab) => {
  allTabs
    .filter((tab) => tab !== sourceTab)
    .map((tab) => {
      it(`brings me to the ${tab} tab`, () => {
        cy.stubHistory();
        cy.get(`[data-cy="${tab}_tab_volume_page"]`).click();
        cy.get('@historyPush').should(
          'be.calledWith',
          `/volumes/master-0-alertmanager/${tab}`,
        );
      });
    });

  it('does not switch to the current tab', () => {
    cy.get(`[data-cy="${sourceTab}_tab_volume_page"]`).click();
    cy.stubHistory();
    cy.get('@historyPush').should('not.be.called');
  });
};

// Navigation tests
describe('Volume page overview tab', () => {
  beforeEach(() => {
    cy.visit('/volumes/master-0-alertmanager/overview');
  });

  tabSwitchingTestCases('overview');

  const alertSeverities = ['critical', 'warning'];
  alertSeverities.map((severity) => {
    it(`brings me to the alert tab prefiltered by ${severity} severity`, () => {
      cy.stubHistory();
      cy.get(`[data-cy="${severity}_counter_node"]`).click();
      cy.get('@historyPush').should(
        'be.calledWith',
        `/volumes/master-0-alertmanager/alerts?severity=${severity}`,
      );
    });
  });

  it('displays the LVMLogicalVolume type and VG name for LVM volume', () => {
    cy.visit('/volumes/mongodb-volume/overview');
    cy.get('[data-cy="vg_name_label"]').should('have.length', 1);
    cy.get('[data-cy="vg_name_value"]').should('contain', 'my-vg');
    cy.get('[data-cy="backend_disk_label"]').should('not.exist');
  });

  it('displays backend disk for sparse device', () => {
    cy.visit('/volumes/master-1-prometheus/overview');
    cy.get('[data-cy="backend_disk_label"]').should('have.length', 1);
    cy.get('[data-cy="vg_name_label"]').should('not.exist');
  });
});

describe('Volume page metrics tab', () => {
  beforeEach(() => {
    cy.visit('/volumes/master-0-alertmanager/metrics');
  });

  tabSwitchingTestCases('metrics');

  it('brings me to the Grafana Persistent Volumes dashboard', () => {
    cy.stubHistory();

    cy.get('[data-cy="advanced_metrics_volume_detailed"]')
      .should('have.attr', 'href')
      .and(
        'to.have.string',
        'grafana/d/919b92a8e8041bd567af9edab12c840c?var-namespace=metalk8s-monitoring&var-volume=alertmanager-prometheus-operator-alertmanager-db-alertmanager-prometheus-operator-alertmanager-0',
      );
  });

  const LAST_SEVEN_DAYS = 'Last 7 days';
  const LAST_ONE_HOUR = 'Last 1 hour';
  const LAST_TWENTY_FOUR_HOURS = 'Last 24 hours';
  const queryTimeSpansCodes = [
    {
      label: 'now-7d',
      value: LAST_SEVEN_DAYS,
    },
    {
      label: 'now-1h',
      value: LAST_ONE_HOUR,
    },
  ];

  queryTimeSpansCodes.map((timeSpan) => {
    it(`brings me to the metrics of ${timeSpan.value}`, () => {
      cy.stubHistory();
      cy.get('[data-cy="metrics_timespan_selection"]').click();
      cy.get(`[data-cy="${timeSpan.value}"]`).click();
      cy.get('@historyPush').should('be.calledWith', {
        search: `from=${timeSpan.label}`,
      });
    });
  });
  it(`brings me to the metrics of ${LAST_TWENTY_FOUR_HOURS}`, () => {
    cy.visit('/volumes/master-0-alertmanager/metrics?from=now-1h');
    cy.stubHistory();
    cy.get('[data-cy="metrics_timespan_selection"]').click();
    cy.get(`[data-cy="${LAST_TWENTY_FOUR_HOURS}"]`).click();
    cy.get('@historyPush').should('be.calledWith', {
      search: `from=now-24h`,
    });
  });
});

describe('Volume page details tabs', () => {
  beforeEach(() => {
    cy.visit('/volumes/master-0-alertmanager/details');
  });

  tabSwitchingTestCases('details');
});
