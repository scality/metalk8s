import React, { PropsWithChildren } from 'react';
import { InstanceNameProvider, _InternalInstanceName } from './InstanceName';
import {
  render,
  screen,
  waitFor,
  waitForElementToBeRemoved,
  within,
} from '@testing-library/react';
import { jest } from '@jest/globals';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ToastProvider } from '@scality/core-ui/dist/components/toast/ToastProvider';

jest.mock('../initFederation/ConfigurationProviders', () => ({
  useConfigRetriever: () => ({
    retrieveConfiguration: () => ({
      spec: {
        instanceNameAdapter: {
          module: './instanceNameAdapter',
        },
      },
    }),
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

const Wrapper = ({ children }: PropsWithChildren<{}>) => (
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
);

describe('InstanceName', () => {
  it('should display the instance name input when it resolved its configuration', async () => {
    //S
    const getInstanceName = jest
      .fn<Promise<string>, unknown[]>()
      .mockResolvedValue('default');
    const setInstanceName = jest.fn<Promise<void>, unknown[]>();
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
    //E
    await waitForElementToBeRemoved(() => screen.getByText(/loading/i));
    await userEvent.tab();
    await waitFor(() => expect(screen.getByRole('button')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button'));
    await userEvent.type(screen.getByRole('textbox'), 'test');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Confirm',
      }),
    );
    await waitFor(() => expect(setInstanceName).toHaveBeenCalledTimes(1));
    //V
    expect(getInstanceName).toHaveBeenCalledTimes(1);
    expect(setInstanceName).toHaveBeenCalledWith('defaulttest');
  });
});
