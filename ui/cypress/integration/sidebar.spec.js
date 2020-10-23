beforeEach(() => {
  cy.setupMocks();
  cy.login();
});

describe('Sidebar', () => {
  beforeEach(() => {
    cy.window()
      .its('localStorage')
      .then((store) => store.setItem('sidebar_expanded', true));
    cy.visit(Cypress.env('target_url'));
  });

  // TODO: Remove the interaction from the E2E test as much as possible
  it('brings me to the monitoring page', () => {
    cy.window()
      .its('__history__')
      .then((history) => {
        cy.stub(history, 'push').as('historyPush');
      });

    cy.get('[data-cy="sidebar_item_monitoring"]').click();

    cy.get('@historyPush').should('be.calledWith', '/');
  });

  it('brings me to the node page', () => {
    cy.window()
      .its('__history__')
      .then((history) => {
        cy.stub(history, 'push').as('historyPush');
      });

    cy.get('[data-cy="sidebar_item_nodes"]').click();

    cy.get('@historyPush').should('be.calledWith', '/nodes');
  });

  it('brings me to the volume page', () => {
    cy.window()
      .its('__history__')
      .then((history) => {
        cy.stub(history, 'push').as('historyPush');
      });

    cy.get('[data-cy="sidebar_item_volumes"]').click();

    cy.get('@historyPush').should('be.calledWith', '/volumes');
  });

  it('brings me to the environment page', () => {
    cy.window()
      .its('__history__')
      .then((history) => {
        cy.stub(history, 'push').as('historyPush');
      });

    cy.get('[data-cy="sidebar_item_environments"]').click();

    cy.get('@historyPush').should('be.calledWith', '/environments');
  });

  it('can expand', () => {
    let isSidebarExpanded;

    cy.get('.sc-sidebar div:first .sc-button').click();
    cy.window()
      .its('localStorage')
      .then((store) => {
        isSidebarExpanded = store.getItem('sidebar_expanded');
      })
      .then(() => {
        // Cypress commands are asynchronous, so you cannot check a property value before the Cypress commands ran.
        // use cy.then() callback to check the value.
        expect(isSidebarExpanded).to.equal('false');
      });
  });
});
