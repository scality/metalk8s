import { renderHook } from '@testing-library/react-hooks';
import { useFirstTimeLogin } from './FirstTimeLoginProvider';
import { wrapper } from '../navbar/index.spec';
import { configurationHandlers } from '../FederatedApp.spec';
import { setupServer } from 'msw/node';

const server = setupServer(...configurationHandlers);

describe('useFirstTimeLogin hook', () => {
  beforeAll(() =>
    server.listen({
      onUnhandledRequest: 'error',
    }),
  );
  afterEach(() => {
    localStorage.clear();
  });
  afterAll(() => server.close());

  it('should throw an error if used outside FirstTimeLoginProvider', () => {
    //S+E
    const { result } = renderHook(() => useFirstTimeLogin());
    //V
    expect(result.error).toEqual(
      Error("Can't use useFirstTimeLogin outside FirstTimeLoginProvider"),
    );
  });

  it('should return firstTimeLogin as true if the user is logging in for the first time', async () => {
    //S
    const { result, waitForNextUpdate } = renderHook(
      () => useFirstTimeLogin(),
      { wrapper },
    );
    //E
    await waitForNextUpdate();
    //V
    expect(result.current.firstTimeLogin).toEqual(true);
  });

  it('should return firstTimeLogin as false if the user is NOT logging in for the first time', async () => {
    //E
    const { waitForNextUpdate: waitForNextUpdateFirstRender } = renderHook(
      () => useFirstTimeLogin(),
      { wrapper },
    );
    await waitForNextUpdateFirstRender();
    const { result, waitForNextUpdate } = renderHook(
      () => useFirstTimeLogin(),
      { wrapper },
    );
    await waitForNextUpdate();
    //V
    expect(result.current.firstTimeLogin).toEqual(false);
  });
});
