import React from 'react';
import { CallbackComponent } from 'redux-oidc';
import { injectIntl } from 'react-intl';
import { useHistory } from 'react-router';
import { useSelector } from 'react-redux';
import Loader from '../components/Loader';

const CallbackPage = ({ intl }) => {
  const userManager = useSelector(state => state.config.userManager);
  const history = useHistory();
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
      <Loader>{intl.messages.redirecting}</Loader>
    </CallbackComponent>
  );
};

export default injectIntl(CallbackPage);
