import { createBridgeComponent } from '@module-federation/bridge-react/';

const ExportApp = () => {
  return <div>ExportApp</div>;
};

const provider = createBridgeComponent({
  rootComponent: ExportApp,
});

export default provider;
