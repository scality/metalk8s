import { waitFor } from '@testing-library/dom';
import { renderHook } from '@testing-library/react';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { QueryClient } from 'react-query';
import { QueryClientProvider } from '../QueryClientProvider';
import type { BuildtimeWebFinger, View } from './ConfigurationProviders';
import {
  ConfigurationProvider,
  useFederatedRoutes,
} from './ConfigurationProviders';
import { UIListProvider } from './UIListProvider';

const testService = 'http://10.0.0.1/uilist.json';

const testLocalUI = {
  kind: 'test-ui',
  name: 'test.local',
  version: '1.0.0',
  url: 'http://test.local.test',
  appHistoryBasePath: '',
};

const addonUIV1 = {
  kind: 'addon-ui',
  name: 'addon-v1.local',
  version: '1.0.0',
  url: 'http://addon-v1.local.test',
  appHistoryBasePath: '/addon-v1',
};

const addonUIV2 = {
  kind: 'addon-ui',
  name: 'addon-v2.local',
  version: '2.0.0',
  url: 'http://addon-v2.local.test',
  appHistoryBasePath: '/addon-v2',
};

const externalHookUI = {
  kind: 'external-hook-ui',
  name: 'external-hook.local',
  version: '1.0.0',
  url: 'http://external-hook.local.test',
  appHistoryBasePath: '/external-hook',
};

const singleDeployedUI = [testLocalUI];
const allDeployedUIs = [testLocalUI, addonUIV1, addonUIV2, externalHookUI];

const createMockBuildConfig = (
  kind: string,
  views: Record<string, View>,
): BuildtimeWebFinger => ({
  kind: 'MicroAppConfiguration',
  apiVersion: 'ui.scality.com/v1alpha1',
  metadata: {
    kind,
  },
  spec: {
    remoteEntryPath: '/mf-manifest.json',
    views,
    hooks: {},
    components: {},
  },
});

const createRuntimeAppConfig = (kind: string, name: string, spec = {}) => {
  return {
    kind: 'MicroAppRuntimeConfiguration',
    apiVersion: 'ui.scality.com/v1alpha1',
    metadata: {
      kind,
      name,
    },
    spec: spec,
  };
};

const server = setupServer(
  rest.get(`${testService}`, (req, res, ctx) => {
    return res(ctx.json(singleDeployedUI));
  }),
  rest.get(
    `http://test.local.test/.well-known/micro-app-configuration`,
    (req, res, ctx) => {
      return res(
        ctx.json(
          createMockBuildConfig('test-ui', {
            overview: {
              path: '/',
              exact: true,
              label: {
                en: 'Overview',
                fr: 'Vue générale',
              },
              module: './FederableApp',
              scope: 'artesca',
            },
          }),
        ),
      );
    },
  ),
  rest.get(
    `http://test.local.test/.well-known/runtime-app-configuration`,
    (req, res, ctx) => {
      return res(ctx.json(createRuntimeAppConfig('test-ui', 'test.local')));
    },
  ),
);

describe('useFederatedRoutes', () => {
  beforeAll(() =>
    server.listen({
      onUnhandledRequest: 'error',
    }),
  );
  afterEach(() => server.resetHandlers());

  const wrapper = ({ children }) => {
    return (
      <QueryClientProvider client={new QueryClient()}>
        <UIListProvider discoveryURL={testService}>
          <ConfigurationProvider>{children}</ConfigurationProvider>
        </UIListProvider>
      </QueryClientProvider>
    );
  };

  it('should retrieve a single federated route', async () => {
    const { result } = renderHook(() => useFederatedRoutes(), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current).toStrictEqual([
        {
          app: {
            appHistoryBasePath: '',
            kind: 'test-ui',
            name: 'test.local',
            url: 'http://test.local.test',
            version: '1.0.0',
          },
          kind: 'test-ui',
          view: {
            exact: true,
            label: {
              en: 'Overview',
              fr: 'Vue générale',
            },
            module: './FederableApp',
            path: '/',
            scope: 'artesca',
          },
        },
      ]);
    });
  });

  it('should retrieve federated routes with same kind', async () => {
    const configs = {
      'http://test.local.test/.well-known/micro-app-configuration':
        createMockBuildConfig('test-ui', {
          overview: {
            path: '/',
            exact: true,
            label: {
              en: 'Overview',
              fr: 'Vue générale',
            },
            module: './FederableApp',
            scope: 'artesca',
          },
        }),
      'http://test.local.test/.well-known/runtime-app-configuration':
        createRuntimeAppConfig('test-ui', 'test.local'),
      'http://addon-v1.local.test/.well-known/micro-app-configuration':
        createMockBuildConfig('addon-ui', {
          addon1: {
            path: '/addon-v1',
            exact: true,
            label: {
              en: 'Addon v1',
              fr: 'Addon v1',
            },
            module: './AddonApp',
            scope: 'addon1',
          },
        }),
      'http://addon-v1.local.test/.well-known/runtime-app-configuration':
        createRuntimeAppConfig('addon-ui', 'addon-v1.local'),
      'http://addon-v2.local.test/.well-known/micro-app-configuration':
        createMockBuildConfig('addon-ui', {
          addon2: {
            path: '/addon-v2',
            exact: true,
            label: {
              en: 'Addon v2',
              fr: 'Addon v2',
            },
            module: './AddonApp',
            scope: 'addon2',
          },
        }),
      'http://addon-v2.local.test/.well-known/runtime-app-configuration':
        createRuntimeAppConfig('addon-ui', 'addon-v2.local'),
      'http://external-hook.local.test/.well-known/micro-app-configuration':
        createMockBuildConfig('external-hook-ui', {
          externalHook: {
            path: '/external-hook',
            exact: true,
            label: {
              en: 'External hook',
              fr: 'External hook',
            },
            module: './ExternalHookApp',
            scope: 'external-hook',
          },
        }),
      'http://external-hook.local.test/.well-known/runtime-app-configuration':
        createRuntimeAppConfig('external-hook-ui', 'external-hook.local'),
    };
    server.use(
      rest.get(`${testService}`, (req, res, ctx) => {
        return res(ctx.json(allDeployedUIs));
      }),
      ...Object.entries(configs).map(([url, config]) =>
        rest.get(url, (req, res, ctx) => {
          return res(ctx.json(config));
        }),
      ),
    );

    const { result } = renderHook(() => useFederatedRoutes(), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current).toStrictEqual([
        {
          app: {
            appHistoryBasePath: '',
            kind: 'test-ui',
            name: 'test.local',
            url: 'http://test.local.test',
            version: '1.0.0',
          },
          kind: 'test-ui',
          view: {
            exact: true,
            label: {
              en: 'Overview',
              fr: 'Vue générale',
            },
            module: './FederableApp',
            path: '/',
            scope: 'artesca',
          },
        },
        {
          app: {
            appHistoryBasePath: '/addon-v1',
            kind: 'addon-ui',
            name: 'addon-v1.local',
            url: 'http://addon-v1.local.test',
            version: '1.0.0',
          },
          kind: 'addon-ui',
          view: {
            exact: true,
            label: {
              en: 'Addon v1',
              fr: 'Addon v1',
            },
            module: './AddonApp',
            path: '/addon-v1',
            scope: 'addon1',
          },
        },
        {
          app: {
            appHistoryBasePath: '/addon-v2',
            kind: 'addon-ui',
            name: 'addon-v2.local',
            url: 'http://addon-v2.local.test',
            version: '2.0.0',
          },
          kind: 'addon-ui',
          view: {
            exact: true,
            label: {
              en: 'Addon v2',
              fr: 'Addon v2',
            },
            module: './AddonApp',
            path: '/addon-v2',
            scope: 'addon2',
          },
        },
        {
          app: {
            appHistoryBasePath: '/external-hook',
            kind: 'external-hook-ui',
            name: 'external-hook.local',
            url: 'http://external-hook.local.test',
            version: '1.0.0',
          },
          kind: 'external-hook-ui',
          view: {
            exact: true,
            label: {
              en: 'External hook',
              fr: 'External hook',
            },
            module: './ExternalHookApp',
            path: '/external-hook',
            scope: 'external-hook',
          },
        },
      ]);
    });
  });

  it('should failed when the kind of the app does not match the kind of the webFinger', async () => {
    server.use(
      rest.get(`${testService}`, (req, res, ctx) => {
        return res(ctx.json(singleDeployedUI));
      }),
      rest.get(
        `http://test.local.test/.well-known/micro-app-configuration`,
        (req, res, ctx) => {
          return res(ctx.json(createMockBuildConfig('test-ui', {})));
        },
      ),
      rest.get(
        `http://test.local.test/.well-known/runtime-app-configuration`,
        (req, res, ctx) => {
          return res(
            ctx.json(
              createRuntimeAppConfig('wrong-kind-test-ui', 'test.local'),
            ),
          );
        },
      ),
    );

    const { result } = renderHook(() => useFederatedRoutes(), {
      wrapper,
    });
    await waitFor(() => {
      expect(result.current).toStrictEqual([]);
    });
  });
});
