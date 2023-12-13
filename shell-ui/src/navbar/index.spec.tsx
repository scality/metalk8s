import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { setupServer } from 'msw/node';
import { QueryClient, QueryClientProvider } from 'react-query';
import { MemoryRouter } from 'react-router';
import { CoreUiThemeProvider } from '@scality/core-ui/dist/components/coreuithemeprovider/CoreUiThemeProvider';

import { SolutionsNavbar } from '.';
import { WithInitFederationProviders } from '../FederatedApp';
import { configurationHandlers } from '../FederatedApp.spec';
import { ShellConfigProvider } from '../initFederation/ShellConfigProvider';
import { useNavbar } from './navbarHooks';
import { ShellHistoryProvider } from '../initFederation/ShellHistoryProvider';
import { act } from 'react-test-renderer';
import { LanguageProvider } from './lang';
import { ShellThemeSelectorProvider } from '../initFederation/ShellThemeSelectorProvider';
import NotificationCenterProvider from '../NotificationCenterProvider';
import { FirstTimeLoginProvider } from '../auth/FirstTimeLoginProvider';
import { AuthProvider } from '../auth/AuthProvider';
import { AuthConfigProvider } from '../auth/AuthConfigProvider';
import { render, screen } from '@testing-library/react';
import { waitForLoadingToFinish } from './__TESTS__/utils';
import { useAuth } from 'oidc-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});
const server = setupServer(...configurationHandlers);

export const wrapper = ({ children }) => {
  return (
    <AuthConfigProvider>
      <AuthProvider>
        <ShellThemeSelectorProvider>
          {(theme) => (
            <CoreUiThemeProvider theme={theme}>
              <LanguageProvider>
                <QueryClientProvider client={queryClient}>
                  <NotificationCenterProvider>
                    <ShellConfigProvider shellConfigUrl={'/shell/config.json'}>
                      <WithInitFederationProviders>
                        <MemoryRouter>
                          <FirstTimeLoginProvider>
                            <ShellHistoryProvider>
                              <SolutionsNavbar>{children}</SolutionsNavbar>
                            </ShellHistoryProvider>
                          </FirstTimeLoginProvider>
                        </MemoryRouter>
                      </WithInitFederationProviders>
                    </ShellConfigProvider>
                  </NotificationCenterProvider>
                </QueryClientProvider>
              </LanguageProvider>
            </CoreUiThemeProvider>
          )}
        </ShellThemeSelectorProvider>
      </AuthProvider>
    </AuthConfigProvider>
  );
};

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

    await act(() => waitForNextUpdate());
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
  it('should display the Notification Center for Platform Admin', async () => {
    //S
    render(<div></div>, {
      wrapper,
    });
    //E
    await waitForLoadingToFinish();
    //Verify the Notification Center is displayed in the Navbar
    expect(
      screen.getByRole('button', { name: /Notification Center/i }),
    ).toBeInTheDocument();
  });
  it('should hide the Notification Center for non Platform Admin', async () => {
    //S
    // @ts-ignore
    useAuth.mockImplementation(() => ({
      userData: {
        profile: {
          groups: ['group1'],
          email: 'test@test.invalid',
          name: 'user',
          sub: 'userID',
        },
      },
    }));
    render(<div></div>, {
      wrapper,
    });
    //E
    await waitForLoadingToFinish();
    //V
    expect(screen.queryByRole('button', { name: /Notification Center/i })).toBe(
      null,
    );
  });
});
