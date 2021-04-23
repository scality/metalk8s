import { setupServer } from 'msw/node';
import { rest } from 'msw';
import { screen, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import './index';
import { waitForLoadingToFinish } from './__TESTS__/utils';
import { jest } from '@jest/globals';

const server = setupServer(
  rest.get(
    'https://mocked.ingress/oidc/.well-known/openid-configuration',
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

describe('navbar', () => {
  // use fake timers to let react query retry immediately after promise failure
  jest.useFakeTimers();

  beforeAll(() => server.listen());
  beforeEach(() => {
    jest.resetModules();
  });
  afterEach(() => server.resetHandlers());

  it('should display a loading state when resolving its configuration', () => {
    //E
    render(
      <solutions-navbar
        oidc-provider-url="https://mocked.ingress/oidc"
        client-id="metalk8s-ui"
        response-type="id_token"
        redirect-url="http://localhost:8082"
        config-url="/shell/config.json"
        scopes="openid profile email groups offline_access audience:server:client_id:oidc-auth-client"
      />,
    );
    //V
    expect(screen.queryByText('loading')).toBeInTheDocument();
  });

  it('should display an error state when it failed to resolves its configuration', async () => {
    //S
    server.use(
      rest.get('/shell/config.json', (req, res, ctx) => {
        return res(ctx.status(500));
      }),
    );

    render(
      <solutions-navbar
        oidc-provider-url="https://mocked.ingress/oidc"
        client-id="metalk8s-ui"
        response-type="id_token"
        redirect-url="http://localhost:8082"
        config-url="/shell/config.json"
        scopes="openid profile email groups offline_access audience:server:client_id:oidc-auth-client"
      />,
    );
    //E
    await waitForLoadingToFinish();
    //V
    expect(screen.getByLabelText('unexpected error')).toBeInTheDocument();
  });

  it('should display expected selected menu when it matches by exact loaction (default behavior)', async () => {
    //S
    mockOIDCProvider();

    //E
    render(
      <solutions-navbar
        oidc-provider-url="https://mocked.ingress/oidc"
        client-id="metalk8s-ui"
        response-type="id_token"
        redirect-url="http://localhost:8082"
        scopes="openid profile email groups offline_access audience:server:client_id:oidc-auth-client"
        options={JSON.stringify({
          main: {
            'http://localhost/': { en: 'Platform', fr: 'Plateforme' },
            'http://localhost:8082/test': { en: 'Test', fr: 'Test' },
          },
          subLogin: {},
        })}
      />,
    );
    await waitForLoadingToFinish();
    //V
    const platformEntry = screen.getByRole('tab', {
      name: /Platform/i,
      selected: true,
    });
    expect(platformEntry).toBeInTheDocument();
  });

  it('should display expected selected menu when it matches by regex', async () => {
    //S
    mockOIDCProvider();

    //E
    render(
      <solutions-navbar
        oidc-provider-url="https://mocked.ingress/oidc"
        client-id="metalk8s-ui"
        response-type="id_token"
        redirect-url="http://localhost:8082"
        scopes="openid profile email groups offline_access audience:server:client_id:oidc-auth-client"
        options={JSON.stringify({
          main: {
            'http://localhost:8082/': {
              en: 'Platform',
              fr: 'Plateforme',
              activeIfMatches: 'http://localhost.*',
            },
            'http://localhost:8082/test': { en: 'Test', fr: 'Test' },
          },
          subLogin: {},
        })}
      />,
    );
    await waitForLoadingToFinish();
    //V
    const platformEntry = screen.getByRole('tab', {
      name: /Platform/i,
      selected: true,
    });
    expect(platformEntry).toBeInTheDocument();
  });

  it('should set the language of the navbar', async () => {
    //S
    mockOIDCProvider();

    //E
    render(
      <solutions-navbar
        oidc-provider-url="https://mocked.ingress/oidc"
        client-id="metalk8s-ui"
        response-type="id_token"
        redirect-url="http://localhost:8082"
        scopes="openid profile email groups offline_access audience:server:client_id:oidc-auth-client"
        can-change-language="true"
        options={JSON.stringify({
          main: {
            'http://localhost:8082/': {
              en: 'Platform',
              fr: 'Plateforme',
              activeIfMatches: 'http://localhost.*',
            },
            'http://localhost:8082/test': { en: 'Test', fr: 'Test' },
          },
          subLogin: {},
        })}
      />,
    );
    await waitForLoadingToFinish();

    //Open dropdown menu
    userEvent.click(screen.getByText('en'));

    //Select french language
    userEvent.click(screen.getByText('fr'));

    //V
    const platformEntry = screen.getByRole('tab', {
      name: /Plateforme/i,
      selected: true,
    });
    expect(platformEntry).toBeInTheDocument();
    expect(localStorage.setItem).toBeCalledWith('lang', 'fr');

    //C
    userEvent.click(screen.getByText('en'));
  });

  it('should display expected menu when it resolved its configuration', async () => {
    //S
    server.use(
      rest.get('/shell/config.json', (req, res, ctx) => {
        const result = {};
        return res(ctx.json(result));
      }),
    );

    mockOIDCProvider();

    render(
      <solutions-navbar
        oidc-provider-url="https://mocked.ingress/oidc"
        client-id="metalk8s-ui"
        response-type="id_token"
        redirect-url="http://localhost:8082"
        config-url="/shell/config.json"
        scopes="openid profile email groups offline_access audience:server:client_id:oidc-auth-client"
        options={JSON.stringify({
          main: {
            'http://localhost:8082/': { en: 'Platform', fr: 'Plateforme' },
            'http://localhost:8082/test': { en: 'Test', fr: 'Test' },
          },
          subLogin: {},
        })}
      />,
    );
    //E
    await waitForLoadingToFinish();
    //V
    expect(screen.getByText(/Platform/i)).toBeInTheDocument();
  });

  it('should not display a restrained menu when an user is not authorized', async () => {
    //S

    mockOIDCProvider();

    render(
      <solutions-navbar
        oidc-provider-url="https://mocked.ingress/oidc"
        client-id="metalk8s-ui"
        response-type="id_token"
        redirect-url="http://localhost:8082"
        scopes="openid profile email groups offline_access audience:server:client_id:oidc-auth-client"
        options={JSON.stringify({
          main: {
            'http://localhost:8082/': { en: 'Platform', fr: 'Plateforme' },
            'http://localhost:8082/test': {
              en: 'Test',
              fr: 'Test',
              groups: ['group'],
            },
          },
          subLogin: {},
        })}
      />,
    );
    //E
    await waitForLoadingToFinish();
    //V
    expect(screen.queryByText(/Platform/i)).toBeInTheDocument();
    expect(screen.queryByText(/Test/i)).not.toBeInTheDocument();
  });

  it('should display a restrained menu when an user is authorized', async () => {
    //S

    mockOIDCProvider();

    render(
      <solutions-navbar
        oidc-provider-url="https://mocked.ingress/oidc"
        client-id="metalk8s-ui"
        response-type="id_token"
        redirect-url="http://localhost:8082"
        scopes="openid profile email groups offline_access audience:server:client_id:oidc-auth-client"
        options={JSON.stringify({
          main: {
            'http://localhost:8082/': { en: 'Platform', fr: 'Plateforme' },
            'http://localhost:8082/test': {
              en: 'Test',
              fr: 'Test',
              groups: ['group1', 'group2'],
            },
          },
          subLogin: {},
        })}
      />,
    );
    //E
    await waitForLoadingToFinish();
    //V
    expect(screen.queryByText(/Platform/i)).toBeInTheDocument();
    expect(screen.queryByText(/Test/i)).toBeInTheDocument();
  });

  afterAll(() => server.close());
});
