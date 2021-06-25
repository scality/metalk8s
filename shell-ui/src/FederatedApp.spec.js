import { setupServer } from 'msw/node';
import { rest } from 'msw';
import { screen, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import './navbar/index';
import { waitForLoadingToFinish } from './navbar/__TESTS__/utils';
import { jest } from '@jest/globals';
import App, {queryClient} from './FederatedApp';

const server = setupServer(
  rest.get(
    'http://localhost:3000/.well-known/micro-app-configuration',
    (req, res, ctx) => {
      return res(
        ctx.json({
          kind: 'MicroAppConfiguration',
          apiVersion: 'ui.scality.com/v1alpha1',
          metadata: {
            kind: 'metalk8s-ui',
          },
          spec: {
            remoteEntryPath: '/static/js/remoteEntry.js',
            views: {
              platform: {
                path: '/',
                label: {
                  en: 'Platform',
                  fr: 'Plateforme',
                },
                module: './FederableApp',
                scope: 'metalk8s',
              },
              alerts: {
                path: '/alerts',
                label: {
                  en: 'Alerts',
                  fr: 'Alertes',
                },
                module: './FederableApp',
                scope: 'metalk8s',
              },
            },
            hooks: {
              TODO_useAlert_and_platform_lib_hooks: {
                module: '',
                scope: '',
              },
            },
            components: {
              TODO_AlertProvider: {
                module: '',
                scope: '',
              },
            },
          },
        }),
      );
    },
  ),
  rest.get(
    'http://localhost:3000/.well-known/runtime-app-configuration',
    (req, res, ctx) => {
      return res(
        ctx.json({
          kind: 'MicroAppRuntimeConfiguration',
          apiVersion: 'ui.scality.com/v1alpha1',
          metadata: {
            kind: 'metalk8s-ui',
            name: 'metalk8s.eu-west-1',
          },
          spec: {
            title: 'MetalK8s Platform',
            selfConfiguration: {
              url: '/api/kubernetes',
              url_salt: '/api/salt',
              url_prometheus: '/api/prometheus',
              url_grafana: '/grafana',
              url_doc: '/docs',
              url_alertmanager: '/api/alertmanager',
              flags: [],
              ui_base_path: '/',
              url_support:
                'https://github.com/scality/metalk8s/discussions/new',
            },
            auth: {
              kind: 'OIDC',
              providerUrl: '/oidc',
              redirectUrl: 'http://localhost:3000/',
              clientId: 'metalk8s-ui',
              responseType: 'id_token',
              scopes:
                'openid profile email groups offline_access audience:server:client_id:oidc-auth-client',
            },
          },
        }),
      );
    },
  ),
  rest.get('http://localhost/shell/deployed-ui-apps.json', (req, res, ctx) => {
    return res(
      ctx.json([
        {
          kind: 'metalk8s-ui',
          name: 'metalk8s.eu-west-1',
          version: 'local-dev',
          url: 'http://localhost:3000',
          appHistoryBasePath: '',
        },
      ]),
    );
  }),
  rest.get('http://localhost/shell/config.json', (req, res, ctx) => {
    return res(
      ctx.json({
        navbar: {
          main: [
            {
              kind: 'metalk8s-ui',
              view: 'platform',
            },
            {
              kind: 'metalk8s-ui',
              view: 'alerts',
            },
          ],
          subLogin: [],
        },
        discoveryUrl: '/shell/deployed-ui-apps.json',
      }),
    );
  }),
  rest.get(
    'http://localhost/oidc/.well-known/openid-configuration',
    (req, res, ctx) => {
      const result = {
        issuer: 'https://mocked.ingress/oidc',
        authorization_endpoint: 'https://mocked.ingress/oidc/auth',
        token_endpoint: 'https://mocked.ingress/oidc/token',
        jwks_uri: 'https://mocked.ingress/oidc/keys',
        userinfo_endpoint: 'https://mocked.ingress/oidc/userinfo',
        response_types_supported: ['code', 'id_token', 'token'],
        subject_types_supported: ['public'],
        id_token_signing_alg_values_supported: ['RS256'],
        scopes_supported: [
          'openid',
          'email',
          'groups',
          'profile',
          'offline_access',
        ],
        token_endpoint_auth_methods_supported: ['client_secret_basic'],
        claims_supported: [
          'aud',
          'email',
          'email_verified',
          'exp',
          'iat',
          'iss',
          'locale',
          'name',
          'sub',
        ],
      };
      return res(ctx.json(result));
    },
  ),
);

function mockOidcReact() {
  const { jest } = require('@jest/globals');

  const original = jest.requireActual('oidc-react');
  return {
    ...original, //Pass down all the exported objects
    useAuth: () => ({
      userData: {
        profile: {
          groups: ['group1'],
          email: 'test@test.invalid',
          name: 'user',
        },
      },
    }),
  };
}
jest.mock('oidc-react', () => mockOidcReact());

const mockOIDCProvider = () => {
  // This is a hack to workarround the following issue : MSW return lower cased content-type header,
  // oidc-client is internally using XMLHttpRequest to perform queries and retrieve response header Content-Type using 'XMLHttpRequest.prototype.getResponseHeader'.
  // XMLHttpRequest.prototype.getResponseHeader is case sensitive and hence when receiving a response with header content-type it is not mapping it to Content-Type
  const caseSensitiveGetResponseHeader =
    XMLHttpRequest.prototype.getResponseHeader;
  XMLHttpRequest.prototype.getResponseHeader = function (header) {
    if (header === 'Content-Type') {
      return caseSensitiveGetResponseHeader.call(this, 'content-type');
    }
    return caseSensitiveGetResponseHeader.call(this, header);
  };
};

describe('FederatedApp', () => {
  // use fake timers to let react query retry immediately after promise failure
  jest.useFakeTimers();

  beforeAll(() => server.listen({onUnhandledRequest: 'error'}));
  beforeEach(() => {
    jest.resetModules();
  });
  afterEach(() => {
    server.resetHandlers()
    queryClient.clear()
  });

  it('should display a loading state when resolving its configuration', () => {
    //E
    render(<App />);
    //V
    expect(screen.queryByLabelText('loading')).toBeInTheDocument();
  });

  it('should display an error state when it failed to resolves its configuration', async () => {
    //S
    server.use(
      rest.get('http://localhost/shell/config.json', (req, res, ctx) => {
        return res(ctx.status(500));
      }),
    );

    render(<App />);
    //E
    await waitForLoadingToFinish();
    //V
    expect(screen.queryByText('Unexpected Error')).toBeInTheDocument();
  });

  afterAll(() => server.close());
});
