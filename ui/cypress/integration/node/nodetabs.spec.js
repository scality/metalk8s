beforeEach(() => {
  cy.setupMocks();
  cy.login();
});

// Navigation tests
describe('Overview tab in master-0 node page', () => {
  beforeEach(() => {
    cy.server();
    cy.visit('/nodes/master-0/overview');
    cy.route('api/kubernetes/api/v1/nodes', 'fixture:kubernetes/nodes.json');
    cy.window()
      .its('__history__')
      .then((history) => {
        cy.stub(history, 'push').as('historyPush');
      });
  });

  const tabs = ['alerts', 'metrics', 'volumes', 'pods', 'details'];
  tabs.map((tab) => {
    it(`brings me to the [${tab}] tab`, () => {
      cy.get('.sc-tabs-item')
        .eq(tabs.indexOf(tab) + 1)
        .click();
      cy.get('@historyPush').should('be.calledWith', `/nodes/master-0/${tab}`);
    });
  });

  const alertSeverities = ['critical', 'warning'];
  alertSeverities.map((severity) => {
    it(`brings me to the alert tab prefiltered by [${severity}] severity of master-0 node`, () => {
      cy.get(`[data-cy="${severity}_counter_node"]`).click();
      cy.get('@historyPush').should(
        'be.calledWith',
        `/nodes/master-0/alerts?severity=${severity}`,
      );
    });
  });
});

describe('Alerts tab in master-0 node page', () => {
  beforeEach(() => {
    cy.server();
    cy.route('api/kubernetes/api/v1/nodes', 'fixture:kubernetes/nodes.json');
    cy.visit('/nodes/master-0/alerts');
    cy.window()
      .its('__history__')
      .then((history) => {
        cy.stub(history, 'push').as('historyPush');
      });
  });
  // Align Node and Volume Page
  const alertSeverities = [
    { name: 'CRITICAL', value: 'critical' },
    { name: 'WARNING', value: 'warning' },
  ];
  alertSeverities.map((severity) => {
    it(`adds the filter of [${severity.value}]`, () => {
      cy.get('[data-cy="alert_filter_node"]').click();

      cy.get('.sc-dropdown .trigger .menu-item')
        .contains('li', severity.name)
        .click();

      cy.get('@historyPush').should(
        'be.calledWith',
        `?severity=${severity.value}`,
      );
    });
  });
});

describe('Metrics tab in master-0 node page', () => {
  beforeEach(() => {
    cy.server();
    cy.route('api/kubernetes/api/v1/nodes', 'fixture:kubernetes/nodes.json');
    cy.route(
      'api/prometheus/api/v1/query?query=node_uname_info',
      'fixture:prometheus/node-uname-info.json',
    );

    cy.visit('/nodes/master-0/metrics');
  });

  it('brings me to the Grafana Node Detailed dashboard', () => {
    cy.get('[data-cy="advanced_metrics_node_detailed"]')
      .should('have.attr', 'href')
      .and(
        'to.have.string',
        'grafana/dashboard/db/nodes-detailed?var-DS_PROMETHEUS=Prometheus&var-job=node-exporter&var-name=zenkotda-master-0.novalocal',
      );
  });
});

describe('Volumes tab in master-0 node page', () => {
  beforeEach(() => {
    cy.server();
    cy.route('api/kubernetes/api/v1/nodes', 'fixture:kubernetes/nodes.json');
    cy.route(
      '/api/kubernetes/apis/storage.metalk8s.scality.com/v1alpha1/volumes',
      'fixture:kubernetes/volumes.json',
    );

    cy.visit('/nodes/master-0/volumes');
    cy.window()
      .its('__history__')
      .then((history) => {
        cy.stub(history, 'push').as('historyPush');
      });
  });

  it('brings me to the [loki-vol] volume page', () => {
    cy.get('[data-cy=volume_table_name_cell]')
      .contains('td', 'loki-vol')
      .click();
    cy.get('@historyPush').should(
      'be.calledWith',
      '/volumes/loki-vol/overview?node=master-0',
    );
  });
});
