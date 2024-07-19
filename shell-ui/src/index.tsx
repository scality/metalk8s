import React from 'react';
import ReactDOM from 'react-dom';
import App, { ShellTypes } from './FederatedApp';
import { NotificationCenterContextType } from './NotificationCenterProvider';
import { History } from 'history';
import {
  BuildtimeWebFinger,
  RuntimeWebFinger,
} from './initFederation/ConfigurationProviders';

ReactDOM.render(<App />, document.getElementById('app'));
