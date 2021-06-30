//@flow
import '@fortawesome/fontawesome-free/css/all.css';

import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import Layout from './Layout';
import { setApiConfigAction } from '../ducks/config';
import { initToggleSideBarAction } from '../ducks/app/layout';
import { MetricsTimeSpanProvider } from '../hooks';
import FederatedIntlProvider from './IntlProvider';
import { useTypedSelector } from '../hooks';
import ErrorPage500 from '@scality/core-ui/dist/components/error-pages/ErrorPage500.component';
import Loader from '@scality/core-ui/dist/components/loader/Loader.component';
import { ComponentWithFederatedImports, useCurrentApp } from '@scality/module-federation';

const InternalApp = ({moduleExports}) => {
  const dispatch = useDispatch();
  const { name } = useCurrentApp();
  const runtimeConfiguration = moduleExports['./moduleFederation/ConfigurationProvider'].useConfig({configType: 'run', name});

  const { status, api } = useTypedSelector((state) => state.config);
  useEffect(() => {
    if (status === 'idle') {
      dispatch(setApiConfigAction(runtimeConfiguration.spec.selfConfiguration));
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

const App = () => {
  return <ComponentWithFederatedImports 
    componentWithInjectedImports={InternalApp}
    renderOnError={<ErrorPage500 />}
    componentProps={{}}
    federatedImports={[
      {
        scope: 'shell',
        module: './moduleFederation/ConfigurationProvider',
        remoteEntryUrl: window.shellUIRemoteEntryUrl,
      },
    ]}
  />
}

export default App;
