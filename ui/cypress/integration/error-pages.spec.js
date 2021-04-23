describe('Error Pages Navigation', () => {
  beforeEach(() => {
    cy.setupMocks();
    cy.login();
  });

  it('redirects me to 404 error page if route not found', () => {
    cy.visit('/undefined-route-that-doesnt-exists');
    cy.stubHistory();

    cy.get('[data-cy="sc-error-page404"]').should('have.length', 1);
    cy.get('[aria-labelledby="page-not-found"]').should('have.length', 1);
    cy.get('[aria-labelledby="page-not-found-guidance"]').should(
      'have.length',
      1,
    );
  });
});

describe('Error Pages Custom config', () => {
  beforeEach(() => {
    cy.setupMocks(null);
    cy.login();
  });

  it('redirects me to 500 - fetch config results in internal error', () => {
    cy.route2('GET', '/config.json', {
      fixture: 'config.json',
      statusCode: 500,
    });
    cy.visit('/');
    cy.stubHistory();
    cy.get('[data-cy="sc-error-page500"]').contains('Unexpected Error');
  });

  it('redirects me to 500 in case of wrong url_alerts config', () => {
    let url_support = 'https://mysupportlink.com';
    cy.fixture('config.json').then((config) => {
      config.url_support = url_support;
      // must be a fake url
      // otherwise in CI nginx which is served with a try files rule, will return a html with successful response code
      config.url_alerts = 'http://invalid/url';
      cy.route2('GET', '/config.json', config);
    });

    // alerts page will throw an error if it has failed
    // we must catch it on cypress
    cy.on('uncaught:exception', () => false);

    cy.visit('/');
    cy.stubHistory();

    cy.get('[data-cy="sc-error-page500"]').contains('Unexpected Error');

    if (url_support) {
      cy.get('.sc-error-page500 * a')
        .should('have.attr', 'href')
        .and('include', url_support);
    }
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
    cy.setupMocks('config.json', null);
    cy.login();
  });

  it('redirects to 500 error page in case of navbar fail to load', () => {
    cy.fixture('shell-config.json').then((config) => {
      config.options = null;
      cy.route2('GET', '/shell/config.json', config);
    });

    // internal navbar will throw an error if the shell-ui navbar has failed
    // we must catch it on cypress
    cy.on('uncaught:exception', () => false);

    cy.visit('/');
    cy.stubHistory();

    cy.get('[data-cy="sc-error-page500"]').contains('Unexpected Error');
  });
});
