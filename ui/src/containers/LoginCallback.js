import React from 'react';
import { CallbackComponent } from 'redux-oidc';
import { useHistory } from 'react-router';
import { useSelector } from 'react-redux';
import { useIntl } from 'react-intl';
import { Loader } from '@scality/core-ui';

const CallbackPage = () => {
  const userManager = useSelector((state) => state.config.userManager);
  const history = useHistory();
  const intl = useIntl();

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
      <Loader size="massive" centered={true}>
        {intl.formatMessage({ id: 'redirecting' })}
      </Loader>
    </CallbackComponent>
  );
};

export default CallbackPage;
