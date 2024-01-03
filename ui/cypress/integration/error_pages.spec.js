describe('Error Pages Navigation', () => {
  beforeEach(() => {
    cy.setupMocks();
    cy.login();
  });

  it('redirects me to 404 error page if route not found', () => {
    cy.visit('/undefined-route-that-doesnt-exists');
    cy.stubHistory();

    cy.get('[data-cy="sc-error-page404"]').contains(
      'Error: this page does not exist',
    );
  });
});

describe('Error Pages Auth failure', () => {
  beforeEach(() => {
    cy.setupMocks();
    cy.badLogin();
  });

  it('redirects me to auth error page in case of auth failure', () => {
    cy.visit('/alerts');
    cy.stubHistory();

    cy.get('[data-cy="sc-error-pageauth"]').contains('Authenticating...');
  });
});

describe('Error Pages Navbar failure', () => {
  beforeEach(() => {
    cy.fixture('shell-config.json').then((config) => {
      config.navbar = null;
      cy.setupMocks('config.json', config);  
    });
    cy.login();
  });

  it('redirects to 500 error page in case of navbar fail to load', () => {
    

    // internal navbar will throw an error if the shell-ui navbar has failed
    // we must catch it on cypress
    cy.on('uncaught:exception', () => false);

    cy.visit('/');

    cy.get('[data-cy="sc-error-page500"]').contains('Unexpected Error');
  });
});
