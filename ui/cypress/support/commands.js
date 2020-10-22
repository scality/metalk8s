// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add("login", (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add("drag", { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add("dismiss", { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This is will overwrite an existing command --
// Cypress.Commands.overwrite("visit", (originalFn, url, options) => { ... })
import 'cypress-wait-until';

Cypress.Commands.add('setupMocks', () => {
  cy.server();

  cy.route('/config.json', 'fixture:config.json');
  cy.route(
    '/oidc/.well-known/openid-configuration',
    'fixture:openid-config.json',
  );
  cy.route('POST', '/api/salt/login', 'fixture:salt-api/login.json');
  cy.route(
    '/api/prometheus/api/v1/alerts',
    'fixture:prometheus/empty-alerts.json',
  );
  cy.route(
    '/api/prometheus/api/v1/query?query=sum(up{job="*"})',
    'fixture:prometheus/query-up-ok.json',
  );
  cy.route(
    '/api/kubernetes/api/v1/namespaces?includeUninitialized=&pretty=&continue=&fieldSelector=metadata.name=kube-system',
    'fixture:kubernetes/namespace-kube-system.json',
  );
});
