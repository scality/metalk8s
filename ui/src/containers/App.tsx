import { MetricsTimeSpanProvider } from '@scality/core-ui/dist/next';
import { useLocation } from 'react-router-dom';
import AlertProvider from './AlertProvider';
import FederatedIntlProvider from './IntlProvider';
import Layout from './Layout';
import StartTimeProvider from './StartTimeProvider';

const App = () => {
  const location = useLocation();

  return (
    <FederatedIntlProvider>
      <MetricsTimeSpanProvider location={location}>
        <StartTimeProvider>
          <AlertProvider>
            <Layout />
          </AlertProvider>
        </StartTimeProvider>
      </MetricsTimeSpanProvider>
    </FederatedIntlProvider>
  );
};

export default App;
