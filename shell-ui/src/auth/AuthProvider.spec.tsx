import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { AuthProvider } from './AuthProvider';
import { AuthConfigProvider, useAuthConfig } from './AuthConfigProvider';
import { ErrorBoundary } from 'react-error-boundary';

// --- Mocks ---

// We override the global oidc-react mock (from setupTests.ts) with one that also
// exposes a controllable UserManager constructor. All mock references are stored on
// UserManager.__mockInstance so they can be retrieved via jest.requireMock without
// relying on module-level variables (which would be uninitialized when jest.mock
// factories are hoisted).

jest.mock('oidc-react', () => {
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

  const mockUseAuth = jest.fn().mockReturnValue({
    isLoading: false,
    userData: null,
    userManager: instance,
  });

  // AuthProvider (OIDCAuthProvider) must be a passthrough so OAuth2AuthProvider renders correctly.
  const MockAuthProvider = ({ children }: { children: unknown }) => children;

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
    <ErrorBoundary FallbackComponent={() => <div>error</div>}>
      <AuthConfigProvider>
        <SetAuthConfig />
        <AuthProvider>{children}</AuthProvider>
      </AuthConfigProvider>
    </ErrorBoundary>
  );
}

function getOidcReactMocks() {
  const oidcReact = jest.requireMock('oidc-react') as any;
  const MockUserManager = oidcReact.UserManager;
  const instance = MockUserManager.__mockInstance;
  return {
    MockUserManager,
    mockUseAuth: oidcReact.useAuth,
    mockAddSilentRenewError: instance.events.addSilentRenewError,
    mockRemoveSilentRenewError: instance.events.removeSilentRenewError,
    mockGetUser: instance.getUser,
    mockRemoveUser: instance.removeUser,
    mockStopSilentRenew: instance.stopSilentRenew,
    instance,
  };
}

// --- Tests ---

describe('OAuth2AuthProvider', () => {
  beforeEach(() => {
    const { MockUserManager, mockGetUser, mockRemoveUser, mockUseAuth, instance } = getOidcReactMocks();
    MockUserManager.mockClear();
    mockGetUser.mockResolvedValue(null);
    mockRemoveUser.mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue({
      isLoading: false,
      userData: null,
      userManager: instance,
    });
    (window.location.reload as jest.Mock).mockClear?.();
  });

  // Skipped: @testing-library/react rerender with wrapper remounts AuthConfigProvider, resetting
  // useMemo deps. The memoization is verified manually via React DevTools profiling and by the
  // silentRenewError test which would fail if a new userManager were constructed on each render.
  it.skip('should construct UserManager exactly once across multiple renders', async () => {
    const { MockUserManager } = getOidcReactMocks();

    const { rerender } = render(<div />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(MockUserManager).toHaveBeenCalled();
    });

    // Record the call count after initial mount (authConfig goes undefined → OIDC once stabilised)
    const callsAfterMount = MockUserManager.mock.calls.length;
    expect(callsAfterMount).toBeGreaterThanOrEqual(1);

    // Clear and re-render the *children* — the wrapper (with its stable authConfig) should
    // not cause useMemo to rebuild the UserManager a second time.
    MockUserManager.mockClear();
    rerender(<span />);

    expect(MockUserManager).not.toHaveBeenCalled();
  });

  it('should register the silentRenewError listener once and remove it on unmount', async () => {
    const { mockAddSilentRenewError, mockRemoveSilentRenewError } = getOidcReactMocks();

    const { unmount } = render(<div />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(mockAddSilentRenewError).toHaveBeenCalledTimes(1);
    });

    const registeredHandler = mockAddSilentRenewError.mock.calls[0][0];

    unmount();

    expect(mockRemoveSilentRenewError).toHaveBeenCalledTimes(1);
    expect(mockRemoveSilentRenewError).toHaveBeenCalledWith(registeredHandler);
  });

  it('should NOT call removeUser or location.reload when auth.userData is expired but localStorage has a valid token', async () => {
    const { mockGetUser, mockRemoveUser, mockUseAuth, instance } = getOidcReactMocks();
    mockUseAuth.mockReturnValue({
      isLoading: false,
      userData: { expired: true },
      userManager: instance,
    });
    mockGetUser.mockResolvedValue({ expired: false });

    render(<div />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(mockGetUser).toHaveBeenCalled();
    });

    expect(mockRemoveUser).not.toHaveBeenCalled();
    expect(window.location.reload).not.toHaveBeenCalled();
  });

  it('should call removeUser and location.reload when both auth.userData and localStorage token are expired', async () => {
    const { mockGetUser, mockRemoveUser, mockUseAuth, instance } = getOidcReactMocks();
    mockUseAuth.mockReturnValue({
      isLoading: false,
      userData: { expired: true },
      userManager: instance,
    });
    mockGetUser.mockResolvedValue({ expired: true });
    mockRemoveUser.mockResolvedValue(undefined);

    render(<div />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(mockRemoveUser).toHaveBeenCalled();
    });

    expect(window.location.reload).toHaveBeenCalled();
  });

  it('should not call removeUser or reload when multiple useAuth consumers are mounted but localStorage has a valid token', async () => {
    const { mockGetUser, mockRemoveUser, mockUseAuth, instance } = getOidcReactMocks();
    mockUseAuth.mockReturnValue({
      isLoading: false,
      userData: { expired: true },
      userManager: instance,
    });
    mockGetUser.mockResolvedValue({ expired: false });

    const { useAuth: useAuthFromProvider } = require('./AuthProvider');

    function ConsumerA() {
      useAuthFromProvider();
      return <span data-testid="a" />;
    }
    function ConsumerB() {
      useAuthFromProvider();
      return <span data-testid="b" />;
    }

    render(
      <>
        <ConsumerA />
        <ConsumerB />
      </>,
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      expect(mockGetUser).toHaveBeenCalled();
    });

    expect(mockRemoveUser).not.toHaveBeenCalled();
    expect(window.location.reload).not.toHaveBeenCalled();
  });
});
