import { createBridgeComponent } from '@module-federation/bridge-react/v18';
import {
  createInstance,
} from '@module-federation/enhanced/runtime';
import { useState } from 'react';
// import { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { useStore } from 'zustand';

const mf = createInstance({
  name: 'metalk8s',
  remotes: [{
    name: 'shell',
    entry: 'http://localhost:8084/shell/mf-manifest.json',
  }],
});




const Dashboard = () => {
  return (
    <div>
      Dashboard
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

const DebugConfigurationStore = ({ propsStore, fedStore }: { configurationStore: any }) => {
  // console.log('DEBUG configurationStore', configurationStore.getState());
  useStore(propsStore, (state) => {
    console.log('DEBUG state propsStore', state);
  });
  useStore(fedStore, (state) => {
    console.log('DEBUG state fedStore', state);
  });
  return <div>ConfigurationStore: </div>;
};



const ExportApp = (props: any) => {
  const { basename, store } = props;
  const [configurationStore, setConfigurationStore] = useState<any>(null);
  mf.loadRemote('shell/ConfigurationService').then((module) => {

    setConfigurationStore(module.configurationStore);
    console.log('DEBUG module hhhhhhhhhh', module.configurationStore);
  });

  console.log('DEBUG =============1', store);
  console.log('DEBUG =============2', configurationStore);
  // useStore(store, (state) => {
  //   console.log('DEBUG state hehehehe', state);
  // });


  return (
    <BrowserRouter basename={basename}>
      {store && configurationStore && <DebugConfigurationStore propsStore={store} fedStore={configurationStore} />}
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/volumes" element={<Volumes />} />
        <Route path="/alerts" element={<Alerts />} />
      </Routes>
    </BrowserRouter>
  );
};

const provider = createBridgeComponent({
  rootComponent: ExportApp,
});

export default provider;
