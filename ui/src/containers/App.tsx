import React from 'react';
import { MetricsTimeSpanProvider } from '@scality/core-ui/dist/next';
import Layout from './Layout';
import AlertProvider from './AlertProvider';
import ConfigProvider from './ConfigProvider';
import FederatedIntlProvider from './IntlProvider';
import StartTimeProvider from './StartTimeProvider';

const App = () => {
  return (
    <FederatedIntlProvider>
      <MetricsTimeSpanProvider>
        <ConfigProvider>
          <StartTimeProvider>
            <AlertProvider>
              <Layout />
            </AlertProvider>
          </StartTimeProvider>
        </ConfigProvider>
      </MetricsTimeSpanProvider>
    </FederatedIntlProvider>
  );
};

export default App;