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
        cy.url().should('include', `/nodes/master-0/${tab}`);
      });
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
      cy.url().should('include', `/nodes/master-0/alerts?severity=${severity}`);
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

  // The Dropdown menu items are selected by their visible label: core-ui no
  // longer spreads arbitrary Item fields onto the <li>, so the `data-cy` key
  // passed alongside `label`/`onClick` never reaches the DOM.
  const selectTimeSpan = (value) => {
    cy.get('[data-cy="metrics_timespan_selection"]').click();
    cy.contains('.menu-item-label', value).click();
  };

  queryTimeSpansCodes.map((timeSpan) => {
    it(`brings me to the metrics of ${timeSpan.value}`, () => {
      cy.stubHistory();
      selectTimeSpan(timeSpan.value);
      cy.url().should('include', `from=${timeSpan.label}`);
    });
  });
  it(`brings me to the metrics of ${LAST_TWENTY_FOUR_HOURS}`, () => {
    cy.visit('/nodes/master-0/metrics?from=now-1h');
    cy.stubHistory();
    selectTimeSpan(LAST_TWENTY_FOUR_HOURS);
    cy.url().should('include', `from=now-24h`);
  });
});

describe('Node page volumes tabs', () => {
  beforeEach(() => {
    cy.visit('/nodes/master-0/volumes');
  });

  tabSwitchingTestCases('volumes');

  it('brings me to the loki-vol volume page', () => {
    cy.stubHistory();

    cy.findByRole('gridcell', { name: /loki-vol/i });

    cy.findByText(/loki-vol/i).click({ force: true });
    cy.url().should('include', '/volumes/loki-vol/overview');
  });

  it('brings me to create a new volume', () => {
    cy.stubHistory();

    cy.get('[data-cy="create_volume_button"]').click();
    cy.url().should('include', '/volumes/createVolume?node=master-0');
  });
});

describe('Node page details tabs', () => {
  beforeEach(() => {
    cy.visit('/nodes/master-0/details');
  });

  tabSwitchingTestCases('details');
});
