//@flow
import React from 'react';
import { MetricsTimeSpanProvider } from '@scality/core-ui/dist/next';
import Layout from './Layout';

import AlertProvider from './AlertProvider';
import ConfigProvider from './ConfigProvider';
import FederatedIntlProvider from './IntlProvider';
import StartTimeProvider from './StartTimeProvider';
import AlertHistoryProvider from './AlertHistoryProvider';

const App = () => {
  return (
    <FederatedIntlProvider>
      <MetricsTimeSpanProvider>
        <ConfigProvider>
          <StartTimeProvider>
            <AlertProvider>
              <AlertHistoryProvider>
                <Layout />
              </AlertHistoryProvider>
            </AlertProvider>
          </StartTimeProvider>
        </ConfigProvider>
      </MetricsTimeSpanProvider>
    </FederatedIntlProvider>
  );
};

export default App;
