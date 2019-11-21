import React from 'react';
import { CallbackComponent } from 'redux-oidc';
import { injectIntl } from 'react-intl';
import { useHistory } from 'react-router';
import { useSelector } from 'react-redux';

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
      <span>{intl.messages.redirecting}</span>
    </CallbackComponent>
  );
};

export default injectIntl(CallbackPage);
