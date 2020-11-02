const SIDEBAR_EXPANDED = 'sidebar_expanded';

beforeEach(() => {
  cy.setupMocks();
  cy.login();
});

describe('Sidebar', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.stubHistory();
  });

  // TODO: Remove the interaction from the E2E test as much as possible
  it('brings me to the monitoring page', () => {
    cy.get('[data-cy="sidebar_item_monitoring"]').click();

    cy.get('@historyPush').should('be.calledWith', '/');
  });

  it('brings me to the node page', () => {
    cy.get('[data-cy="sidebar_item_nodes"]').click();

    cy.get('@historyPush').should('be.calledWith', '/nodes');
  });

  it('brings me to the volume page', () => {
    cy.get('[data-cy="sidebar_item_volumes"]').click();

    cy.get('@historyPush').should('be.calledWith', '/volumes');
  });

  it('brings me to the environment page', () => {
    cy.get('[data-cy="sidebar_item_environments"]').click();

    cy.get('@historyPush').should('be.calledWith', '/environments');
  });

  it('can be expanded', () => {
    cy.window()
      .its('localStorage')
      .invoke('setItem', SIDEBAR_EXPANDED, 'false');

    cy.get('.sc-sidebar > :first').click();

    cy.get('.sc-sidebar').should(
      'have.attr',
      'data-cy-state-isexpanded',
      'true',
    );
    cy.window()
      .its('localStorage')
      .invoke('getItem', SIDEBAR_EXPANDED)
      .should('equal', 'true');
  });

  it('can be collapsed', () => {
    cy.window().its('localStorage').invoke('setItem', SIDEBAR_EXPANDED, 'true');

    cy.get('.sc-sidebar > :first').click();

    cy.get('.sc-sidebar').should(
      'have.attr',
      'data-cy-state-isexpanded',
      'false',
    );
    cy.window()
      .its('localStorage')
      .invoke('getItem', SIDEBAR_EXPANDED)
      .should('equal', 'false');
  });

  it('is expanded by default', () => {
    // There is no sidebar_expanded item appears in localStorage if we don't change the default value.
    cy.window()
      .its('localStorage')
      .invoke('getItem', SIDEBAR_EXPANDED)
      .should('equal', 'true');
  });
});
