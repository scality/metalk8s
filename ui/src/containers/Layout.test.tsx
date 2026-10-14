import { screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { buildStore, metalK8sConfig, render } from '../components/__TEST__/util';
import { setApiConfigAction } from '../ducks/config';
import { setUser } from '../ducks/oidc';
import { mockShellHooks } from '../setupTests';
import Layout from './Layout';

jest.mock('./DashboardPage', () => () => null);

const vmManagementApp = {
  kind: 'vm-management-ui',
  name: 'vm-management-ui',
  url: '/vm-management-ui',
  version: '',
  appHistoryBasePath: '/vm-management',
};

const platformWith = (deployedApps: (typeof vmManagementApp)[]) => {
  (mockShellHooks.useDeployedApps as jest.Mock).mockImplementation(({ kind }: { kind: string }) =>
    deployedApps.filter((app) => app.kind === kind),
  );
  (mockShellHooks.useConfigRetriever as jest.Mock).mockImplementation(() => ({
    retrieveConfiguration: () => ({
      spec: {
        views: {
          vmManagement: { path: '/', module: './FederableApp', scope: 'vmManagement', label: { en: 'VM Management' } },
        },
      },
    }),
  }));
};

const renderPlatform = () => {
  const store = buildStore();
  store.dispatch(setApiConfigAction(metalK8sConfig as never));
  store.dispatch(setUser({ profile: {} } as never));
  render(
    <Provider store={store}>
      <Layout />
    </Provider>,
  );
};

describe('Platform navigation', () => {
  it('offers Virtual Machines when the VM Management app is deployed', async () => {
    platformWith([vmManagementApp]);

    renderPlatform();

    expect(await screen.findByText('Volumes')).toBeInTheDocument();
    expect(screen.getByText('Virtual Machines')).toBeInTheDocument();
  });

  it('does not offer Virtual Machines when the VM Management app is not deployed', async () => {
    platformWith([]);

    renderPlatform();

    expect(await screen.findByText('Volumes')).toBeInTheDocument();
    expect(screen.queryByText('Virtual Machines')).not.toBeInTheDocument();
  });
});
