//@flow
import '@fortawesome/fontawesome-free/css/all.css';

import React from 'react';
import Layout from './Layout';

import { MetricsTimeSpanProvider } from '../hooks';
import FederatedIntlProvider from './IntlProvider';

const App = () => {
  return (
    <FederatedIntlProvider>
      <MetricsTimeSpanProvider>
        <Layout />
      </MetricsTimeSpanProvider>
    </FederatedIntlProvider>
  );
};

export default App;
