import { createBridgeComponent } from '@module-federation/bridge-react/v18';
import { useState } from 'react';
import {
  QueryClientProvider as BaseQueryClientProvider,
  QueryClient,
  useQuery
} from 'react-query';
import { Provider } from 'react-redux';
import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom';
import { createStore } from 'redux';
import { useStore } from 'zustand';
import reducer from './ducks/reducer';
import { useNodesV2 } from './hooks';

const reduxStore = createStore(reducer);

export const QueryClientProvider =
  BaseQueryClientProvider as React.ComponentType<{
    client: QueryClient;
    contextSharing?: boolean;
    children?: React.ReactNode;
  }>;


const Dashboard = ({ store, authStore }: { store: any, authStore: any }) => {
  const [enabled, setEnabled] = useState(false);
  const { data } = useQuery({
    queryKey: ['shell-test-app'],
    queryFn: () => {
      return Promise.resolve("metalk8s");
    },
    enabled: enabled,
    cacheTime: Infinity,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  const mystate = useStore(store, (state) => {
    return state
  });

  const authState = useStore(authStore, (state) => {
    return state
  });

  console.log('METALK8S DEBUG mystate', mystate)
  console.log('METALK8S DEBUG authState', authState)

  const config = mystate?.getConfiguration
    ({
      configType: 'run',
      name: 'metalk8s.eu-west-1',
    })
  console.log('METALK8S DEBUG config', config)

  const mock = () => { return Promise.resolve('') };
  const token = authState?.userData?.token ?? '';
  const getToken = authState?.getToken ?? mock;

  const nodes = useNodesV2(config.spec.selfConfiguration.url, token, getToken);
  console.log('METALK8S DEBUG nodes', nodes)
  return (
    <div>
      Metalk8s Dashboard
      <button type="button" onClick={() => {
        setEnabled(true);
      }}>Enable Query</button>
      <div>Query Data: {data ?? "No data"}</div>
      <Link to="/volumes">Volumes</Link>
    </div>
  );
}


const Volumes = () => {
  return <div>Volumes</div>;
};
const Alerts = () => {
  return <div>Alerts</div>;
};

const DebugConfigurationStore = ({ propsStore }: { configurationStore: any }) => {

  return <div>ConfigurationStore:
    <button type="button" onClick={() => {
      propsStore.getState().decrementCounter();
    }}>Metalk8s Click me {propsStore.getState().counter}</button>
  </div>;
};

const ExportApp = (props: any) => {
  const { basename, store, authStore, queryClient } = props;

  // QueryClientProvider contextSharing will be removed in the future
  return (
    <QueryClientProvider client={queryClient} contextSharing={true}>
      <Provider store={reduxStore}>
        <BrowserRouter basename={basename}>
          <DebugConfigurationStore propsStore={store} />
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard store={store} authStore={authStore} />} />
            <Route path="/volumes" element={<Volumes />} />
            <Route path="/alerts" element={<Alerts />} />
          </Routes>
        </BrowserRouter>
      </Provider>
    </QueryClientProvider>
  );
};

const provider = createBridgeComponent({
  rootComponent: ExportApp,
});

export default provider;
