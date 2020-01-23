import React from 'react';
import { CallbackComponent } from 'redux-oidc';
import { useHistory } from 'react-router';
import { useSelector } from 'react-redux';
import loadable from 'react-loadable';
import { intl } from '../translations/IntlGlobalProvider';

const CallbackPage = () => {
  const userManager = useSelector(state => state.config.userManager);
  const history = useHistory();
  const LoadingComponent = () => <h3>please wait...</h3>;

  const AsyncLoaderComponent = loadable({
    loader: () =>
      import(/* webpackChunkName: "loader" */ '../components/Loader'),
    loading: LoadingComponent,
  });
  return (
    <CallbackComponent
      userManager={userManager}
      successCallback={user => {
        const path = (user.state && user.state.path) || '/';
        history.push(path);
      }}
      errorCallback={error => {
        history.push('/');
      }}
    >
      <AsyncLoaderComponent>
        {intl.translate('redirecting')}
      </AsyncLoaderComponent>
    </CallbackComponent>
  );
};

export default CallbackPage;
