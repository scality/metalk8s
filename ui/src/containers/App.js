//@flow
import React from 'react';
import Layout from './Layout';

import AlertProvider from './AlertProvider';
import ConfigProvider from './ConfigProvider';
import { MetricsTimeSpanProvider } from '../hooks';
import FederatedIntlProvider from './IntlProvider';

const App = () => {
  return (
    <FederatedIntlProvider>
      <MetricsTimeSpanProvider>
        <ConfigProvider>
          <AlertProvider>
            <Layout />
          </AlertProvider>
        </ConfigProvider>
      </MetricsTimeSpanProvider>
    </FederatedIntlProvider>
  );
};

export default App;
