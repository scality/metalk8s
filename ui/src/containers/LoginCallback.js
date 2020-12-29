import React from 'react';
import { CallbackComponent } from 'redux-oidc';
import { useHistory } from 'react-router';
import { useSelector } from 'react-redux';
import Loader from '../components/Loader';
import { intl } from '../translations/IntlGlobalProvider';

const CallbackPage = () => {
  const userManager = useSelector((state) => state.config.userManager);
  const history = useHistory();
  return (
    <CallbackComponent
      userManager={userManager}
      successCallback={(user) => {
        const path = (user.state && user.state.path) || '/';
        history.push(path);
      }}
      errorCallback={(error) => {
        history.push('/');
      }}
    >
      <Loader>{intl.translate('redirecting')}</Loader>
    </CallbackComponent>
  );
};

export default CallbackPage;
