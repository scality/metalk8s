beforeEach(() => {
  cy.setupMocks();
  cy.login();
});

// Navigation tests
describe('Node page overview tab', () => {
  beforeEach(() => {
    cy.visit('/nodes/master-0/overview');
    cy.window()
      .its('__history__')
      .then((history) => {
        cy.stub(history, 'push').as('historyPush');
      });
  });

  const tabs = ['alerts', 'metrics', 'volumes', 'pods', 'details'];
  tabs.map((tab) => {
    it(`brings me to the ${tab} tab`, () => {
      cy.get(`[data-cy="${tab}_tab_node_page"]`).click();
      cy.get('@historyPush').should('be.calledWith', `/nodes/master-0/${tab}`);
    });
  });

  it('does not switch the tab', () => {
    cy.get(`[data-cy="overview_tab_node_page"]`).click();
    cy.get('@historyPush').should('not.be.called');
  });

  const alertSeverities = ['critical', 'warning'];
  alertSeverities.map((severity) => {
    it(`brings me to the alert tab prefiltered by ${severity} severity of master-0 node`, () => {
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
    cy.window()
      .its('__history__')
      .then((history) => {
        cy.stub(history, 'push').as('historyPush');
      });
  });

  const tabs = ['overview', 'metrics', 'volumes', 'pods', 'details'];
  tabs.map((tab) => {
    it(`brings me to the ${tab} tab`, () => {
      cy.get(`[data-cy="${tab}_tab_node_page"]`).click();
      cy.get('@historyPush').should('be.calledWith', `/nodes/master-0/${tab}`);
    });
  });

  it('does not switch the tab', () => {
    cy.get('[data-cy="alerts_tab_node_page"]').click();
    cy.get('@historyPush').should('not.be.called');
  });

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
    cy.window()
      .its('__history__')
      .then((history) => {
        cy.stub(history, 'push').as('historyPush');
      });
  });
  const tabs = ['overview', 'alerts', 'volumes', 'pods', 'details'];
  tabs.map((tab) => {
    it(`brings me to the ${tab} tab`, () => {
      cy.get(`[data-cy="${tab}_tab_node_page"]`).click();
      cy.get('@historyPush').should('be.calledWith', `/nodes/master-0/${tab}`);
    });
  });
  it('does not switch the tab', () => {
    cy.get(`[data-cy="metrics_tab_node_page"]`).click();
    cy.get('@historyPush').should('not.be.called');
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

describe('Node page volumes tabs', () => {
  beforeEach(() => {
    cy.visit('/nodes/master-0/volumes');
    cy.window()
      .its('__history__')
      .then((history) => {
        cy.stub(history, 'push').as('historyPush');
      });
  });

  const tabs = ['overview', 'alerts', 'metrics', 'pods', 'details'];
  tabs.map((tab) => {
    it(`brings me to the ${tab} tab`, () => {
      cy.get(`[data-cy="${tab}_tab_node_page"]`).click();
      cy.get('@historyPush').should('be.calledWith', `/nodes/master-0/${tab}`);
    });
  });

  it('does not switch the tab', () => {
    cy.get(`[data-cy="volumes_tab_node_page"]`).click();
    cy.get('@historyPush').should('not.be.called');
  });

  it('brings me to the loki-vol volume page', () => {
    cy.get('[data-cy=volume_table_name_cell]')
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
    cy.window()
      .its('__history__')
      .then((history) => {
        cy.stub(history, 'push').as('historyPush');
      });
  });

  const tabs = ['overview', 'alerts', 'metrics', 'pods', 'volumes'];
  tabs.map((tab) => {
    it(`brings me to the ${tab} tab`, () => {
      cy.get(`[data-cy="${tab}_tab_node_page"]`).click();
      cy.get('@historyPush').should('be.calledWith', `/nodes/master-0/${tab}`);
    });
  });

  it('does not switch the tab', () => {
    cy.get(`[data-cy="details_tab_node_page"]`).click();
    cy.get('@historyPush').should('not.be.called');
  });
});
