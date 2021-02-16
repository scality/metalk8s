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
import '@testing-library/cypress/add-commands'


import {
  EMPTY_QUERY_RANGE_RESULT,
  makeQueryRangeResult,
  genValues,
} from './mockUtils';

Cypress.Commands.add('setupMocks', () => {
  // Static files
  cy.route2('GET', '/config.json', { fixture: 'config.json' });
  cy.route2('GET', '/brand/theme.json', { fixture: 'theme.json' });
  cy.route2('GET', '/oidc/.well-known/openid-configuration', {
    fixture: 'openid-config.json',
  });

  // SaltAPI
  cy.route2({ method: 'POST', pathname: /^\/api\/salt\/$/ }, (req) => {
    const saltArgs = JSON.parse(req.body);
    if (
      saltArgs.fun === 'grains.item' &&
      saltArgs.arg.includes('ip_interfaces')
    )
      req.reply({ fixture: 'salt-api/ip-grains.json' });
    else
      req.reply({
        body: 'Not supported in Cypress mock.',
        statusCode: 500,
      });
  });
  cy.route2('POST', '/api/salt/login', { fixture: 'salt-api/login.json' });

  // Kubernetes
  cy.route2(
    {
      method: 'GET',
      pathname: '/api/kubernetes/api/v1/namespaces',
      query: { fieldSelector: 'metadata.name=kube-system' },
    },
    { fixture: 'kubernetes/namespace-kube-system.json' },
  );
  cy.fixture('kubernetes/nodes.json').then((nodes) => {
    cy.route2('GET', '/api/kubernetes/api/v1/nodes', { body: nodes });

    cy.route2(
      'GET',
      /^\/api\/kubernetes\/api\/v1\/nodes\/[a-z0-9_\-]+$/,
      (req) => {
        console.log(req);
        req.reply({ body: nodes.items[0] });
      },
    );
  });

  cy.route2('GET', '/api/kubernetes/api/v1/persistentvolumes', {
    fixture: 'kubernetes/persistentvolumes.json',
  });

  cy.route2(
    'GET',
    '/api/kubernetes/apis/storage.metalk8s.scality.com/v1alpha1/volumes',
    { fixture: 'kubernetes/volumes.json' },
  );

  cy.route2('GET', '/api/kubernetes/api/v1/persistentvolumeclaims', {
    fixture: 'kubernetes/persistentvolumeclaims.json',
  });

  // Prometheus
  cy.route2(
    {
      method: 'GET',
      pathname: /^\/api\/prometheus\/api\/v1\/query$/,
    },
    (req) => {
      const url = new URL(req.url);
      const searchParams = new URLSearchParams(url.search);
      const query = searchParams.get('query');

      if (query === 'node_uname_info')
        req.reply({ fixture: 'prometheus/node-uname-info.json' });
      else if (query === 'kubelet_volume_stats_used_bytes')
        req.reply({ fixture: 'prometheus/query-volumes-used.json' });
      else if (query === 'kubelet_volume_stats_capacity_bytes')
        req.reply({ fixture: 'prometheus/query-volumes-capacity.json' });
      else if (query === 'irate(node_disk_io_time_seconds_total[1h]) * 1000000')
        req.reply({ fixture: 'prometheus/query-volumes-latency.json' });
      else if (/^sum\(up\{job="[a-z0-9_\-]+"\}\)$/.exec(query))
        req.reply({ fixture: 'prometheus/query-up-ok.json' });
      else req.reply({ body: { error: 'Not yet mocked!' } });
    },
  );
  cy.route2(
    {
      method: 'GET',
      pathname: /^\/api\/prometheus\/api\/v1\/query_range$/,
    },
    (req) => {
      const url = new URL(req.url);
      const searchParams = new URLSearchParams(url.search);
      const query = searchParams.get('query');
      const match = query.match(/instance=~"([^"]+:9100)"/);
      if (match !== null) {
        const [_, instance] = match;
        req.reply({
          body: makeQueryRangeResult({
            metric: { instance },
            values: genValues({
              start: new Date(searchParams.get('start')),
              end: new Date(searchParams.get('end')),
              step: parseInt(searchParams.get('step')),
            }),
          }),
        });
      } else req.reply({ body: EMPTY_QUERY_RANGE_RESULT });
    },
  );
  cy.route2('GET', '/api/prometheus/api/v1/alerts', {
    fixture: 'prometheus/empty-alerts.json',
  });

  // Alertmanager
  cy.route2('GET', '/api/alertmanager/api/v2/alerts', {
    fixture: 'alertmanager/alerts.json',
  });
});

const ADMIN_JWT = {
  id_token:
    'eyJhbGciOiJSUzI1NiIsImtpZCI6IjY4MGZmMWVhZTBlZGYyMDI0MDQyOGVjMzRlMjBlODNjNzBlODAwODIifQ.eyJpc3MiOiJodHRwczovLzEwLjIwMC4yLjE1MDo4NDQzL29pZGMiLCJzdWIiOiJDaVF3T0dFNE5qZzBZaTFrWWpnNExUUmlOek10T1RCaE9TMHpZMlF4TmpZeFpqVTBOallTQld4dlkyRnMiLCJhdWQiOlsib2lkYy1hdXRoLWNsaWVudCIsIm1ldGFsazhzLXVpIl0sImV4cCI6MTYwMzQwMDg1MCwiaWF0IjoxNjAzMzE0NDUwLCJhenAiOiJtZXRhbGs4cy11aSIsIm5vbmNlIjoiZTM2MzRkMGQyYmRkNGMwMzgyNzllNmIzOWMxYjI0YzYiLCJhdF9oYXNoIjoiV3ZBSlFLQ3BKVVAwMHFjdUpCQWpCUSIsImVtYWlsIjoiYWRtaW5AbWV0YWxrOHMuaW52YWxpZCIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJuYW1lIjoiYWRtaW4ifQ.wWHO5EbHhAm0Zc8SWaCiyIIBo5NlD6unxnnjafcYAIIx15Rudr79rjTfKjWsYQQIG_VrqdnFsxjaiL3r96aYkwint8kYOqtsF__rg0jybq3zPXTC28axWh3zkAhA3jJIh8FcMvo5YwjMCKm7i0GMPS3_nmIXTQnr3E_7zjH-prRG7U6-KJsM_Ccmo24dnbBEmpESXclK3JNJEK2jXDuxh_zWRrsESJwe89kwSjknRUj2qxVeUXWKi4nJVSq0x4oMut7O8enArMr2TQOzwOBnMH5xK-hAEHfL3DY7oWhbt_POTE463YV04vTeMxytf2gWCgmnkvF2w2qooIQ9hlrqDQ',
  access_token:
    'eyJhbGciOiJSUzI1NiIsImtpZCI6IjY4MGZmMWVhZTBlZGYyMDI0MDQyOGVjMzRlMjBlODNjNzBlODAwODIifQ.eyJpc3MiOiJodHRwczovLzEwLjIwMC4yLjE1MDo4NDQzL29pZGMiLCJzdWIiOiJDaVF3T0dFNE5qZzBZaTFrWWpnNExUUmlOek10T1RCaE9TMHpZMlF4TmpZeFpqVTBOallTQld4dlkyRnMiLCJhdWQiOlsib2lkYy1hdXRoLWNsaWVudCIsIm1ldGFsazhzLXVpIl0sImV4cCI6MTYwMzQwMDg1MCwiaWF0IjoxNjAzMzE0NDUwLCJhenAiOiJtZXRhbGs4cy11aSIsIm5vbmNlIjoiZTM2MzRkMGQyYmRkNGMwMzgyNzllNmIzOWMxYjI0YzYiLCJhdF9oYXNoIjoicnJXSVpJa2xkakNNa1VtM2NZZUdaZyIsImVtYWlsIjoiYWRtaW5AbWV0YWxrOHMuaW52YWxpZCIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJuYW1lIjoiYWRtaW4ifQ.kMz8jY0ergVv0cgWWIvFluxm_1Kn-2SG8zvzkaucO_GYV7upLoJi12LAh9bql1cGQgNiD0O8xwIsDEzCJA82hoJpa14ribkEHAHNkWN5w2sVTJ7eDCUut0dXHjX8KMpXVSu47nD8BOrRwxAfmBC5JFDM-fpvv5Zqg1gwJKJOY8M_XMDrDJk7hBWOUBKDJJhaNScxYO5wzTKQzOc-nEqGKUF51csixxFFJ19Sc7DszBj8RFTuKkuDkHYFotuwIBBSbgtTMX4o479sq-chj8j_B2s74q2yW6I8eLRT4TdYsYQP9eAIcxGObqPMc0TTr6vsaANs_jxMRoTLR1EBWrOy9A',
  token_type: 'bearer',
  scope:
    'openid profile email groups offline_access audience:server:client_id:oidc-auth-client',
  profile: {
    sub: 'CiQwOGE4Njg0Yi1kYjg4LTRiNzMtOTBhOS0zY2QxNjYxZjU0NjYSBWxvY2Fs',
    azp: 'metalk8s-ui',
    email: 'admin@metalk8s.invalid',
    email_verified: true,
    name: 'admin',
  },
};

Cypress.Commands.add('login', () => {
  cy.window()
    .its('localStorage')
    .then((localStorage) => {
      localStorage.setItem(
        'oidc.user:/oidc:metalk8s-ui',
        JSON.stringify({
          ...ADMIN_JWT,
          expires_at: Date.now() + 30000,
        }),
      );
    });
});

Cypress.Commands.add('stubHistory', () => {
  cy.window()
    .its('__history__')
    .then((history) => {
      cy.stub(history, 'push').as('historyPush');
    });
});
