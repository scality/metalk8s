import React from 'react';
import ReactDOM from 'react-dom';
import App from './FederatedApp';
import { NotificationCenterContextType } from './NotificationCenterProvider';
import { History } from 'history';
import {
  BuildtimeWebFinger,
  RuntimeWebFinger,
} from './initFederation/ConfigurationProviders';

declare global {
  interface Window {
    shellContexts: {
      ShellHistoryContext: React.Context<null | History>;
      NotificationContext: React.Context<null | NotificationCenterContextType>;
      WebFingersContext: React.Context<
        null | (BuildtimeWebFinger | RuntimeWebFinger)[]
      >;
    };
  }
}

ReactDOM.render(<App />, document.getElementById('app'));
