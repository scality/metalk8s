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
        cy.get(`[data-cy="${tab}_tab_node_page"]`).click();
        cy.get('@historyPush').should(
          'be.calledWith',
          `/nodes/master-0/${tab}`,
        );
      });
    });

  it('does not switch to the current tab', () => {
    cy.get(`[data-cy="${sourceTab}_tab_node_page"]`).click();
    cy.get('@historyPush').should('not.be.called');
  });
};

// Navigation tests
describe('Node page overview tab', () => {
  beforeEach(() => {
    cy.visit('/nodes/master-0/overview');
    cy.stubHistory();
  });

  tabSwitchingTestCases('overview');

  const alertSeverities = ['critical', 'warning'];
  alertSeverities.map((severity) => {
    it(`brings me to the alert tab prefiltered by ${severity} severity`, () => {
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
    cy.stubHistory();
  });

  tabSwitchingTestCases('alerts');

  // Align Node and Volume Page
  const alertSeverities = [
    { name: 'CRITICAL', value: 'critical' },
    { name: 'WARNING', value: 'warning' },
  ];
  alertSeverities.map((severity) => {
    it(`adds the filter of ${severity.value}`, () => {
      cy.get('[data-cy="alert_filter"]').click();

      cy.get('.sc-dropdown .trigger .menu-item')
        .contains('li', severity.name)
        .click();
      cy.get('[data-cy="metrics_tab_node_page"]').click();
      cy.get('@historyPush').should(
        'be.calledWith',
        `?severity=${severity.value}`,
      );
    });
  });
});

describe('Node page metrics tab', () => {
  beforeEach(() => {
    cy.visit('/nodes/master-0/metrics');
    cy.stubHistory();
  });

  tabSwitchingTestCases('metrics');

  it('brings me to the Grafana Node Detailed dashboard', () => {
    cy.wait('@getNodeUNameInfo');
    cy.get('[data-cy="advanced_metrics_node_detailed"]')
      .should('have.attr', 'href')
      .and(
        'to.have.string',
        'grafana/dashboard/db/nodes-detailed?var-DS_PROMETHEUS=Prometheus&var-job=node-exporter&var-name=zenkotda-master-0.novalocal',
      );
  });
});

describe('Node page volumes tabs', () => {
  beforeEach(() => {
    cy.visit('/nodes/master-0/volumes');
    cy.stubHistory();
  });

  tabSwitchingTestCases('volumes');

  it('brings me to the loki-vol volume page', () => {
    cy.wait('@getVolumes');
    cy.get('[data-cy="volume_table_name_cell"]')
      .contains('td', 'loki-vol')
      .click();
    cy.get('@historyPush').should(
      'be.calledWith',
      '/volumes/loki-vol/overview?node=master-0',
    );
  });
});

describe('Node page details tabs', () => {
  beforeEach(() => {
    cy.visit('/nodes/master-0/details');
    cy.stubHistory();
  });

  tabSwitchingTestCases('details');
});
