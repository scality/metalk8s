//@flow
import '@fortawesome/fontawesome-free/css/all.css';

import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import Layout from './Layout';
import { fetchConfigAction } from '../ducks/config';
import { initToggleSideBarAction } from '../ducks/app/layout';
import { MetricsTimeSpanProvider } from '../hooks';
import FederatedIntlProvider from './IntlProvider';
import { useTypedSelector } from '../hooks';
import ErrorPage500 from '@scality/core-ui/dist/components/error-pages/ErrorPage500.component';
import Loader from '@scality/core-ui/dist/components/loader/Loader.component';

const App = () => {
  const dispatch = useDispatch();
  const { status, api } = useTypedSelector((state) => state.config);
  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchConfigAction());
      dispatch(initToggleSideBarAction());
    }
    // eslint-disable-next-line
  }, [status]);

  if (api && status === 'success') {
    return (
      <FederatedIntlProvider>
        <MetricsTimeSpanProvider>
          <Layout />
        </MetricsTimeSpanProvider>
      </FederatedIntlProvider>
    );
  } else if (status === 'loading' || status === 'idle') {
    return <Loader size="massive" centered={true} aria-label="loading" />; // TODO display the previous module while lazy loading the new one
  } else if (status === 'error') {
    return <ErrorPage500 data-cy="sc-error-page500" />;
  }
};

export default App;
