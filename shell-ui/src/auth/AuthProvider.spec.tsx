import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider } from './AuthProvider';
import { AuthConfigProvider, useAuthConfig } from './AuthConfigProvider';
import { ErrorBoundary } from 'react-error-boundary';

// --- Mocks ---

// Context-aware mock of oidc-react: the mocked AuthProvider exposes a real
// React context, and useAuth() throws when called outside it — mirroring the
// real library. A previous passthrough mock returned a value unconditionally,
// which hid a structural bug where useOauth2Auth() was called from
// OAuth2AuthProvider (the parent of OIDCAuthProvider).
jest.mock('oidc-react', () => {
  const ReactLib = require('react');

  const mockAddSilentRenewError = jest.fn();
  const mockRemoveSilentRenewError = jest.fn();
  const mockStopSilentRenew = jest.fn();
  const mockGetUser = jest.fn();
  const mockRemoveUser = jest.fn();

  const instance = {
    events: {
      addSilentRenewError: mockAddSilentRenewError,
      removeSilentRenewError: mockRemoveSilentRenewError,
    },
    stopSilentRenew: mockStopSilentRenew,
    getUser: mockGetUser,
    removeUser: mockRemoveUser,
    signinCallback: jest.fn(),
    revokeTokens: jest.fn(() => Promise.resolve()),
    signoutRedirect: jest.fn(() => Promise.resolve()),
  };

  const MockUserManager = jest.fn().mockImplementation(() => instance);
  MockUserManager.__mockInstance = instance;

  const AuthContext = ReactLib.createContext(null);
  let currentAuthValue: unknown = { isLoading: false, userData: null, userManager: instance };

  const MockAuthProvider = ({ children }: { children: unknown }) =>
    ReactLib.createElement(AuthContext.Provider, { value: currentAuthValue }, children);

  const mockUseAuth = jest.fn(() => {
    const ctx = ReactLib.useContext(AuthContext);
    if (ctx === null) {
      throw new Error(
        'AuthProvider context is undefined, please verify you are calling useAuth() as child of a <AuthProvider> component.',
      );
    }
    return ctx;
  });

  (mockUseAuth as any).__setValue = (v: Record<string, unknown>) => {
    currentAuthValue = { ...(currentAuthValue as object), ...v, userManager: instance };
  };
  (mockUseAuth as any).__reset = () => {
    currentAuthValue = { isLoading: false, userData: null, userManager: instance };
  };

  return {
    AuthProvider: MockAuthProvider,
    UserManager: MockUserManager,
    useAuth: mockUseAuth,
    hasCodeInUrl: () => false,
    withAuth: (Component: unknown) => Component,
    initUserManager: jest.fn(),
    User: jest.fn(),
    Log: { setLogger: jest.fn() },
    WebStorageStateStore: jest.fn().mockImplementation(() => ({})),
  };
});

jest.mock('react-error-boundary', () => {
  const original = jest.requireActual('react-error-boundary');
  return {
    ...original,
    useErrorBoundary: () => ({ showBoundary: jest.fn() }),
  };
});

jest.mock(
  '../initFederation/ShellConfigProvider',
  () => ({
    useShellConfig: () => ({ config: { userGroupsMapping: {} } }),
  }),
  { virtual: true },
);

jest.mock(
  '../navbar/auth/permissionUtils',
  () => ({
    getUserGroups: jest.fn(() => []),
  }),
  { virtual: true },
);

// --- Helpers ---

const OIDC_AUTH_CONFIG = {
  kind: 'OIDC' as const,
  providerUrl: 'http://localhost/oidc',
  clientId: 'test-client',
  redirectUrl: 'http://localhost/',
  responseType: 'code' as const,
  scopes: 'openid profile email',
};

function SetAuthConfig() {
  const { setAuthConfig } = useAuthConfig();
  React.useEffect(() => {
    setAuthConfig(OIDC_AUTH_CONFIG as any);
  }, []);
  return null;
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary FallbackComponent={() => <div data-testid="error-fallback">error</div>}>
      <AuthConfigProvider>
        <SetAuthConfig />
        <AuthProvider>{children}</AuthProvider>
      </AuthConfigProvider>
    </ErrorBoundary>
  );
}

function getMocks() {
  const oidcReact = jest.requireMock('oidc-react') as any;
  const instance = oidcReact.UserManager.__mockInstance;
  return {
    MockUserManager: oidcReact.UserManager,
    mockUseAuth: oidcReact.useAuth,
    mockAddSilentRenewError: instance.events.addSilentRenewError,
    mockRemoveSilentRenewError: instance.events.removeSilentRenewError,
    mockGetUser: instance.getUser,
    mockRemoveUser: instance.removeUser,
    mockStopSilentRenew: instance.stopSilentRenew,
  };
}

// --- Tests ---

describe('OAuth2AuthProvider', () => {
  beforeEach(() => {
    const m = getMocks();
    m.MockUserManager.mockClear();
    m.mockGetUser.mockReset().mockResolvedValue(null);
    m.mockRemoveUser.mockReset().mockResolvedValue(undefined);
    m.mockAddSilentRenewError.mockClear();
    m.mockRemoveSilentRenewError.mockClear();
    m.mockStopSilentRenew.mockClear();
    (m.mockUseAuth as any).__reset();
    (window.location.reload as jest.Mock).mockClear?.();
  });

  // Regression: ExpiryWatcher's useOauth2Auth() must be called inside
  // OIDCAuthProvider. If anyone moves it up to OAuth2AuthProvider (the parent),
  // the context-aware mock throws and ErrorBoundary's fallback renders.
  it('renders OAuth2AuthProvider tree without triggering the error boundary', async () => {
    const { mockAddSilentRenewError } = getMocks();
    render(<div />, { wrapper: Wrapper });
    await waitFor(() => {
      expect(mockAddSilentRenewError).toHaveBeenCalledTimes(1);
    });
    expect(screen.queryByTestId('error-fallback')).not.toBeInTheDocument();
  });

  it('registers the silentRenewError listener once and removes it on unmount', async () => {
    const { mockAddSilentRenewError, mockRemoveSilentRenewError } = getMocks();

    const { unmount } = render(<div />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(mockAddSilentRenewError).toHaveBeenCalledTimes(1);
    });

    const registeredHandler = mockAddSilentRenewError.mock.calls[0][0];

    unmount();

    expect(mockRemoveSilentRenewError).toHaveBeenCalledTimes(1);
    expect(mockRemoveSilentRenewError).toHaveBeenCalledWith(registeredHandler);
  });

  const PAST = Math.floor(Date.now() / 1000) - 3600;
  const FUTURE = Math.floor(Date.now() / 1000) + 3600;

  it('does not call removeUser or reload when userData is expired but localStorage holds a valid token', async () => {
    const { mockGetUser, mockRemoveUser, mockUseAuth } = getMocks();
    (mockUseAuth as any).__setValue({ userData: { expired: true, expires_at: PAST } });
    mockGetUser.mockResolvedValue({ expired: false, expires_at: FUTURE });

    render(<div />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(mockGetUser).toHaveBeenCalled();
    });

    expect(mockRemoveUser).not.toHaveBeenCalled();
    expect(window.location.reload).not.toHaveBeenCalled();
  });

  it('calls removeUser and reload when both userData and localStorage token are expired', async () => {
    const { mockGetUser, mockRemoveUser, mockUseAuth } = getMocks();
    (mockUseAuth as any).__setValue({ userData: { expired: true, expires_at: PAST } });
    mockGetUser.mockResolvedValue({ expired: true, expires_at: PAST });

    render(<div />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(mockRemoveUser).toHaveBeenCalled();
    });

    expect(window.location.reload).toHaveBeenCalled();
  });

  // Defensive guard inherited from the pre-PR useQuery implementation: when a
  // User record exists but has no expires_at (corrupt / unknown state), we
  // treat it as expired and force a clean-slate logout rather than letting
  // the bad state persist. Same rule applies on both the React-state side
  // (auth.userData) and the localStorage side (userManager.getUser()).
  it('logs out when userData has no expires_at and localStorage is also missing/empty', async () => {
    const { mockGetUser, mockRemoveUser, mockUseAuth } = getMocks();
    (mockUseAuth as any).__setValue({ userData: { /* no expired, no expires_at */ } });
    mockGetUser.mockResolvedValue(null);

    render(<div />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(mockRemoveUser).toHaveBeenCalled();
    });

    expect(window.location.reload).toHaveBeenCalled();
  });

  it('runs the expiry-check once regardless of how many useAuth consumers are mounted', async () => {
    const { mockGetUser, mockRemoveUser, mockUseAuth } = getMocks();
    (mockUseAuth as any).__setValue({ userData: { expired: true, expires_at: PAST } });
    mockGetUser.mockResolvedValue({ expired: false, expires_at: FUTURE });

    const { useAuth: useAuthFromProvider } = require('./AuthProvider');
    function Consumer() {
      useAuthFromProvider();
      return null;
    }

    render(
      <>
        <Consumer />
        <Consumer />
        <Consumer />
      </>,
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      expect(mockGetUser).toHaveBeenCalled();
    });

    expect(mockGetUser).toHaveBeenCalledTimes(1);
    expect(mockRemoveUser).not.toHaveBeenCalled();
    expect(window.location.reload).not.toHaveBeenCalled();
  });
});
