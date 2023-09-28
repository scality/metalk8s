import React from 'react';
import ReactDOM from 'react-dom';
import App from './FederatedApp';
import { NotificationCenterContextType } from './NotificationCenterProvider';
import { History } from 'history';
import { ToastContextType } from './ToastProvider';

declare global {
  interface Window {
    shellContexts: {
      ShellHistoryContext: React.Context<null | History>;
      NotificationContext: React.Context<null | NotificationCenterContextType>;
      ToastContext: React.Context<ToastContextType | undefined>;
    };
  }
}

ReactDOM.render(<App />, document.getElementById('app'));
