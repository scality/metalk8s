beforeEach(() => {
  cy.setupMocks();
  cy.login();
});

const allTabs = ['overview', 'alerts', 'metrics', 'volumes', 'pods', 'details'];
const tabSwitchingTestCases = (sourceTab) => {
  allTabs
    .filter((tab) => tab !== sourceTab)
    .map((tab) => {
      it(`brings me to the ${tab} tab`, () => {
        cy.stubHistory();
        cy.get(`[data-cy="${tab}_tab_node_page"]`).click();
        cy.get('@historyPush').should(
          'be.calledWith',
          `/nodes/master-0/${tab}`,
        );
      });
    });

  it('does not switch to the current tab', () => {
    cy.get(`[data-cy="${sourceTab}_tab_node_page"]`).click();
    // When it come to the volume tab, given we implement the sorting, the history should store `?sort=health`
    // So we need to stub the history after the click()
    cy.stubHistory();
    cy.get('@historyPush').should('not.be.called');
  });
};

// Navigation tests
describe('Node page overview tab', () => {
  beforeEach(() => {
    cy.visit('/nodes/master-0/overview');
  });

  tabSwitchingTestCases('overview');

  const alertSeverities = ['critical', 'warning'];
  alertSeverities.map((severity) => {
    it(`brings me to the alert tab prefiltered by ${severity} severity`, () => {
      cy.stubHistory();
      cy.get(`[data-cy="${severity}_counter_node"]`).click();
      cy.get('@historyPush').should(
        'be.calledWith',
        `/nodes/master-0/alerts?severity=${severity}`,
      );
    });
  });
});

describe('Node page alerts tab', () => {
  beforeEach(() => {
    cy.visit('/nodes/master-0/alerts');
  });

  tabSwitchingTestCases('alerts');

  // Align Node and Volume Page
  const alertSeverities = [
    { name: 'Critical', value: 'critical' },
    { name: 'Warning', value: 'warning' },
  ];
  alertSeverities.map((severity) => {
    it(`adds the filter of ${severity.value}`, () => {
      cy.stubHistory();
      cy.get('[data-cy="alert_filter"]').click();

      cy.get('.sc-healthselector .trigger li').contains(severity.name).click();
      cy.get('@historyPush').should(
        'be.calledWith',
        `/nodes/master-0/alerts?severity=${severity.value}`,
      );
    });
  });
});

describe('Node page metrics tab', () => {
  beforeEach(() => {
    cy.visit('/nodes/master-0/metrics');
  });

  tabSwitchingTestCases('metrics');

  it('brings me to the Grafana Node Detailed dashboard', () => {
    cy.stubHistory();
    cy.get('[data-cy="advanced_metrics_node_detailed"]')
      .should('have.attr', 'href')
      .and(
        'to.have.string',
        'grafana/d/node-exporter-full?var-DS_PROMETHEUS=Prometheus&var-job=node-exporter&var-name=zenkotda-master-0.novalocal',
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
    cy.visit('/nodes/master-0/metrics?from=now-1h');
    cy.stubHistory();
    cy.get('[data-cy="metrics_timespan_selection"]').click();
    cy.get(`[data-cy="${LAST_TWENTY_FOUR_HOURS}"]`).click();
    cy.get('@historyPush').should('be.calledWith', {
      search: `from=now-24h`,
    });
  });
});

describe('Node page volumes tabs', () => {
  beforeEach(() => {
    cy.visit('/nodes/master-0/volumes');
  });

  tabSwitchingTestCases('volumes');

  it('brings me to the loki-vol volume page', () => {
    cy.stubHistory();

    cy.get('[role="gridcell"]')
      .contains('div', 'loki-vol')
      .click({ force: true });
    cy.get('@historyPush').should(
      'be.calledWith',
      '/volumes/loki-vol/overview?node=master-0',
    );
  });

  it('brings me to create a new volume', () => {
    cy.stubHistory();

    cy.get('[data-cy="create_volume_button"]').click();
    cy.get('@historyPush').should(
      'be.calledWith',
      '/volumes/createVolume?node=master-0',
    );
  });
});

describe('Node page details tabs', () => {
  beforeEach(() => {
    cy.visit('/nodes/master-0/details');
  });

  tabSwitchingTestCases('details');
});
