import { createBridgeComponent } from '@module-federation/bridge-react/v18';
import { useState } from 'react';
import { QueryClientProvider, useQuery } from 'react-query';
import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom';
import { useStore } from 'zustand';




const Dashboard = () => {
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
};
const Volumes = () => {
  return <div>Volumes</div>;
};
const Alerts = () => {
  return <div>Alerts</div>;
};

const DebugConfigurationStore = ({ propsStore }: { configurationStore: any }) => {

  console.log("METALK8S DEBUG propsStore", propsStore.getState());
  return <div>ConfigurationStore:
    {/* <button type="button" onClick={() => {
      propsStore.getState().incrementCounter();
    }}>Click me {propsStore.getState().counter}</button> */}
    <button type="button" onClick={() => {
      propsStore.getState().decrementCounter();
    }}>Metalk8s Click me {propsStore.getState().counter}</button>
  </div>;
};



const ExportApp = (props: any) => {
  const { basename, store, queryClient } = props;
  const [configurationStore, setConfigurationStore] = useState<any>(null);
  // mf.loadRemote('shell/ConfigurationService').then((module) => {

  //   setConfigurationStore(module.configurationStore);
  //   console.log('DEBUG module hhhhhhhhhh', module.configurationStore);
  // });

  console.log('DEBUG =============1', store);
  console.log('DEBUG =============2', configurationStore);
  useStore(store, (state) => {
    console.log('DEBUG state hehehehe', state.getDeployedApps());
  });

  // QueryClientProvider contextSharing will be removed in the future
  return (
    <QueryClientProvider client={queryClient} contextSharing={true}>
      <BrowserRouter basename={basename}>
        <DebugConfigurationStore propsStore={store} />
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/volumes" element={<Volumes />} />
          <Route path="/alerts" element={<Alerts />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

const provider = createBridgeComponent({
  rootComponent: ExportApp,
});

export default provider;
