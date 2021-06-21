import { setupServer } from 'msw/node';
import { rest } from 'msw';
import { renderHook } from '@testing-library/react-hooks';
import { QueryClient, QueryClientProvider } from 'react-query';
import { UIListProvider, useDeployedApps } from './UIListProvider';

const testService = 'http://10.0.0.1/uilist.json';

const testLocalUI = {
  kind: 'test-ui',
  name: 'test.local',
  version: '1.0.0',
  url: 'http://test.local.test'
};

const testEuWestUI = {
  kind: 'test-ui',
  name: 'test.eu-west',
  version: '1.0.0',
  url: 'http://test.eu-west.test'
}

const anotherUI = {
  kind: 'another-ui',
  name: 'another.eu-west',
  version: '1.0.0',
  url: 'http://another.eu-west.test'
}

const uis = [testLocalUI, testEuWestUI, anotherUI];

const server = setupServer(
  rest.get(`${testService}`, (req, res, ctx) => {
    return res(ctx.json(uis));
  }));

describe('useDeployedApps', () => {
  jest.useFakeTimers();
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => server.resetHandlers());

  const wrapper = ({ children }) => (
    <QueryClientProvider client={new QueryClient()}>
      <UIListProvider discoveryURL={testService}>{children}</UIListProvider>
    </QueryClientProvider>
  );

  it('should retrieve all the deployed UIs', async () => {
    const { result, waitForNextUpdate } = renderHook(
      () =>
      useDeployedApps(),
      { wrapper },
    );
    // E
    await waitForNextUpdate();
    // V
    expect(result.current).toStrictEqual([testLocalUI, testEuWestUI, anotherUI]);
  })

  it('should retrieve an UI selected by name', async () => {
    const { result, waitForNextUpdate } = renderHook(
      () =>
      useDeployedApps({name: 'another.eu-west'}),
      { wrapper },
    );
    // E
    await waitForNextUpdate();
    // V
    expect(result.current).toStrictEqual([anotherUI]);
  })

  it('should retrieve UIs selected by kind', async () => {
    const { result, waitForNextUpdate } = renderHook(
      () =>
      useDeployedApps({kind: 'test-ui'}),
      { wrapper },
    );
    // E
    await waitForNextUpdate();
    // V
    expect(result.current).toStrictEqual([testLocalUI, testEuWestUI]);
  })

  it('should retrieve UIs selected by kind and name', async () => {
    const { result, waitForNextUpdate } = renderHook(
      () =>
      useDeployedApps({kind: 'test-ui', name: 'test.local'}),
      { wrapper },
    );
    // E
    await waitForNextUpdate();
    // V
    expect(result.current).toStrictEqual([testLocalUI]);
  })

  it('should return undefined while loading', async () => {
    const { result, waitForNextUpdate } = renderHook(
      () =>
      useDeployedApps(),
      { wrapper },
    );
    // V
    expect(result.current).toStrictEqual(undefined);
  })

  it('should return undefined when failed to load', async () => {
    server.use(rest.get(`${testService}`, (req, res, ctx) => {
      return res(ctx.status(500));
    }));

    const { result, waitForNextUpdate } = renderHook(
      () =>
      useDeployedApps(),
      { wrapper },
    );
    // V
    expect(result.current).toStrictEqual(undefined);
  })

  afterAll(() => {
    server.close();
  });
})
