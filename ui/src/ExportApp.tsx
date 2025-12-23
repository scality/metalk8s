import { createBridgeComponent } from '@module-federation/bridge-react/v18';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';

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

const ExportApp = (props: any) => {
  const { basename } = props;
  return (
    <BrowserRouter basename={basename}>
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
