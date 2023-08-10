import React from 'react';
import ReactDOM from 'react-dom';
import App from './FederatedApp';
import { NotificationCenterContextType } from './NotificationCenterProvider';
import { History } from 'history';

declare global {
  interface Window {
    shellContexts: {
      ShellHistoryContext: React.Context<null | History>;
      NotificationContext: React.Context<null | NotificationCenterContextType>;
    };
  }
}

ReactDOM.render(<App />, document.getElementById('app'));
