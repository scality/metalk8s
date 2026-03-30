import type { PropsWithChildren } from 'react';
import { InstanceNameProvider, _InternalInstanceName } from './InstanceName';
import { render, screen, waitFor, within } from '@testing-library/react';
import { jest } from '@jest/globals';
import userEvent from '@testing-library/user-event';
import { QueryClient } from 'react-query';
import { CoreUiThemeProvider } from '@scality/core-ui/dist/components/coreuithemeprovider/CoreUiThemeProvider';
import { ToastProvider } from '@scality/core-ui/dist/components/toast/ToastProvider';
import { coreUIAvailableThemes } from '@scality/core-ui/dist/style/theme';
import type { UserData } from '../auth/AuthProvider';
import type { RuntimeWebFinger } from '../initFederation/ConfigurationProviders';
import { QueryClientProvider } from '../QueryClientProvider';

jest.mock('../initFederation/ConfigurationProviders', () => ({
  useConfigRetriever: () => ({
    retrieveConfiguration: (config: { configType: 'build'; name: string }) => {
      if (config.configType === 'build') {
        return {
          spec: {
            instanceNameAdapter: {
              module: './instanceNameAdapter',
            },
          },
        };
      } else if (config.configType === 'run') {
        return {
          spec: {
            apiUrl: 'http://localhost:3000/api/v1',
          },
        };
      }
      return null;
    },
  }),
}));

jest.mock('../initFederation/UIListProvider', () => ({
  useDeployedApps: () => [
    {
      appHistoryBasePath: '',
      name: 'test',
      url: 'http://localhost:3000',
    },
  ],
}));

jest.mock('../auth/AuthProvider', () => ({
  useAuth: () => ({
    userData: {
      token: 'test-token',
    },
  }),
}));

const Wrapper = ({ children }: PropsWithChildren) => (
  <CoreUiThemeProvider theme={coreUIAvailableThemes.darkRebrand}>
    <ToastProvider>
      <InstanceNameProvider>
        <QueryClientProvider
          client={
            new QueryClient({
              defaultOptions: {
                queries: {
                  retry: false,
                },
              },
            })
          }
        >
          {children}
        </QueryClientProvider>
      </InstanceNameProvider>
    </ToastProvider>
  </CoreUiThemeProvider>
);

describe('InstanceName', () => {
  it('shows Loader in Tooltip while deployment name query is loading', async () => {
    const getInstanceName = jest
      .fn<
        (userData: UserData | undefined, configuration: RuntimeWebFinger<Record<string, unknown>>) => Promise<string>
      >()
      .mockImplementation(() => new Promise(() => {}));
    const setInstanceName = jest
      .fn<
        (
          userData: UserData | undefined,
          name: string,
          configuration: RuntimeWebFinger<Record<string, unknown>>,
        ) => Promise<void>
      >()
      .mockResolvedValue(undefined);

    render(
      <_InternalInstanceName
        moduleExports={{
          './instanceNameAdapter': {
            getInstanceName,
            setInstanceName,
          },
        }}
      />,
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      expect(document.querySelector('.sc-loader')).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: 'sweet-cluster' })).not.toBeInTheDocument();
    expect(setInstanceName).not.toHaveBeenCalled();
  });

  it('shows warning Icon in Tooltip when loading deployment name fails', async () => {
    const getInstanceName = jest
      .fn<
        (userData: UserData | undefined, configuration: RuntimeWebFinger<Record<string, unknown>>) => Promise<string>
      >()
      .mockRejectedValue(new Error('boom'));
    const setInstanceName = jest
      .fn<
        (
          userData: UserData | undefined,
          name: string,
          configuration: RuntimeWebFinger<Record<string, unknown>>,
        ) => Promise<void>
      >()
      .mockResolvedValue(undefined);

    render(
      <_InternalInstanceName
        moduleExports={{
          './instanceNameAdapter': {
            getInstanceName,
            setInstanceName,
          },
        }}
      />,
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      expect(document.querySelector('.sc-loader')).not.toBeInTheDocument();
    });

    await waitFor(() => {
      const icon = document.querySelector('[data-icon="circle-exclamation"]');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveAttribute('color', 'statusWarning');
    });

    expect(setInstanceName).not.toHaveBeenCalled();
    expect(getInstanceName).toHaveBeenCalled();
  });

  it('loads deployment name then renames via EditableDeploymentName and calls setInstanceName', async () => {
    const getInstanceName = jest
      .fn<
        (userData: UserData | undefined, configuration: RuntimeWebFinger<Record<string, unknown>>) => Promise<string>
      >()
      .mockResolvedValue('sweet-cluster');
    const setInstanceName = jest
      .fn<
        (
          userData: UserData | undefined,
          name: string,
          configuration: RuntimeWebFinger<Record<string, unknown>>,
        ) => Promise<void>
      >()
      .mockResolvedValue(undefined);

    render(
      <_InternalInstanceName
        moduleExports={{
          './instanceNameAdapter': {
            getInstanceName,
            setInstanceName,
          },
        }}
      />,
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(screen.getByRole('button', { name: 'sweet-cluster' })).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: 'sweet-cluster' }));
    const input = screen.getByRole('textbox', { name: 'Deployment name' });
    await userEvent.type(input, 'test');
    await userEvent.keyboard('{Enter}');

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Rename deployment?' })).toBeInTheDocument();
    });

    await userEvent.click(
      within(screen.getByRole('dialog', { name: 'Rename deployment?' })).getByRole('button', {
        name: 'Rename',
      }),
    );

    await waitFor(() => expect(setInstanceName).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(getInstanceName).toHaveBeenCalledTimes(2));

    expect(getInstanceName).toHaveBeenNthCalledWith(
      1,
      { token: 'test-token' },
      expect.objectContaining({ spec: { apiUrl: 'http://localhost:3000/api/v1' } }),
    );
    expect(getInstanceName).toHaveBeenNthCalledWith(
      2,
      { token: 'test-token' },
      expect.objectContaining({
        spec: { apiUrl: 'http://localhost:3000/api/v1' },
      }),
    );
    expect(setInstanceName).toHaveBeenCalledWith(
      { token: 'test-token' },
      'test',
      expect.objectContaining({
        spec: { apiUrl: 'http://localhost:3000/api/v1' },
      }),
    );

    await waitFor(() => expect(screen.getByRole('button', { name: 'sweet-cluster' })).toBeInTheDocument());
  });
});
