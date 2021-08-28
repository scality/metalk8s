//@flow
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
        <StartTimeProvider>
          <ConfigProvider>
            <AlertProvider>
              <Layout />
            </AlertProvider>
          </ConfigProvider>
        </StartTimeProvider>
      </MetricsTimeSpanProvider>
    </FederatedIntlProvider>
  );
};

export default App;
