import { renderHook } from '@testing-library/react-hooks';
import { setupServer } from 'msw/node';
import { QueryClient, QueryClientProvider } from 'react-query';
import { MemoryRouter } from 'react-router';
import { SolutionsNavbar } from '.';
import { WithInitFederationProviders } from '../FederatedApp';
import { configurationHandlers } from '../FederatedApp.spec';
import { ShellConfigProvider } from '../initFederation/ShellConfigProvider';
import { useNavbar } from './navbarHooks';
import { ShellHistoryProvider } from '../initFederation/ShellHistoryProvider';
import { act } from 'react-test-renderer';
import { LanguageProvider } from './lang';
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});
const server = setupServer(...configurationHandlers);

function mockOidcReact() {
  const { jest } = require('@jest/globals');

  const original = jest.requireActual('oidc-react');
  return {
    ...original,
    //Pass down all the exported objects
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

const wrapper = ({ children }) => (
  <LanguageProvider>
    <QueryClientProvider client={queryClient}>
      <ShellConfigProvider shellConfigUrl={'/shell/config.json'}>
        <WithInitFederationProviders>
          <MemoryRouter>
            <ShellHistoryProvider>
              <SolutionsNavbar>{children}</SolutionsNavbar>
            </ShellHistoryProvider>
          </MemoryRouter>
        </WithInitFederationProviders>
      </ShellConfigProvider>
    </QueryClientProvider>
  </LanguageProvider>
);

describe('useNavbar', () => {
  beforeAll(() =>
    server.listen({
      onUnhandledRequest: 'error',
    }),
  );
  beforeEach(() => {
    jest.resetModules();
  });
  afterEach(() => {
    server.resetHandlers();
    queryClient.clear();
  });
  afterAll(() => server.close());
  const expectedDefaultNavbarLinks = {
    logoHref: '',
    main: [
      {
        view: {
          app: {
            appHistoryBasePath: '',
            kind: 'metalk8s-ui',
            name: 'metalk8s.eu-west-1',
            url: 'http://localhost:3000',
            version: 'local-dev',
          },
          groups: undefined,
          icon: undefined,
          isFederated: true,
          navbarGroup: 'main',
          view: {
            label: {
              en: 'Platform',
              fr: 'Plateforme',
            },
            module: './FederableApp',
            path: '/',
            scope: 'metalk8s',
          },
        },
      },
      {
        view: {
          app: {
            appHistoryBasePath: '',
            kind: 'metalk8s-ui',
            name: 'metalk8s.eu-west-1',
            url: 'http://localhost:3000',
            version: 'local-dev',
          },
          groups: undefined,
          icon: undefined,
          isFederated: true,
          navbarGroup: 'main',
          view: {
            label: {
              en: 'Alerts',
              fr: 'Alertes',
            },
            module: './FederableApp',
            path: '/alerts',
            scope: 'metalk8s',
          },
        },
      },
    ],
    secondary: [],
    userDropdown: [],
  };
  it('should retrieve navbar configuration', async () => {
    //E
    const { result, waitForNextUpdate } = renderHook(() => useNavbar(), {
      wrapper,
    });
    await waitForNextUpdate();
    //V
    expect(result.current.getLinks()).toStrictEqual(expectedDefaultNavbarLinks);
  });
  it('should set main navbar links', async () => {
    //S
    const { result, waitForNextUpdate } = renderHook(() => useNavbar(), {
      wrapper,
    });
    await waitForNextUpdate();
    //E
    act(() =>
      result.current.setMainLinks([expectedDefaultNavbarLinks.main[0]]),
    );
    //V
    expect(result.current.getLinks()).toStrictEqual({
      ...expectedDefaultNavbarLinks,
      main: [expectedDefaultNavbarLinks.main[0]],
    });
  });
  it('should set secondary navbar links', async () => {
    //S
    const { result, waitForNextUpdate } = renderHook(() => useNavbar(), {
      wrapper,
    });
    await waitForNextUpdate();
    //E
    act(() =>
      result.current.setSecondaryLinks([expectedDefaultNavbarLinks.main[0]]),
    );
    //V
    expect(result.current.getLinks()).toStrictEqual({
      ...expectedDefaultNavbarLinks,
      secondary: [expectedDefaultNavbarLinks.main[0]],
    });
  });
  it('should set user dropdown links', async () => {
    //S
    const { result, waitForNextUpdate } = renderHook(() => useNavbar(), {
      wrapper,
    });
    await waitForNextUpdate();
    //E
    act(() =>
      result.current.setUserDropdownLinks([expectedDefaultNavbarLinks.main[0]]),
    );
    //V
    expect(result.current.getLinks()).toStrictEqual({
      ...expectedDefaultNavbarLinks,
      userDropdown: [expectedDefaultNavbarLinks.main[0]],
    });
  });
  it('should set logo link', async () => {
    //S
    const { result, waitForNextUpdate } = renderHook(() => useNavbar(), {
      wrapper,
    });
    await waitForNextUpdate();
    //E
    act(() => result.current.setLogoLink('http://localhost:3000'));
    //V
    expect(result.current.getLinks()).toStrictEqual({
      ...expectedDefaultNavbarLinks,
      logoHref: 'http://localhost:3000',
    });
  });
});