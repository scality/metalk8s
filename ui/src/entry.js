//@flow
import 'regenerator-runtime/runtime';
import React from 'react';
import ReactDOM from 'react-dom';
import * as serviceWorker from './serviceWorker';
import { FederatedComponent } from '@scality/module-federation';

ReactDOM.render(
  <FederatedComponent
    module={'./App'}
    scope={'shell'}
    url={window.shellUIRemoteEntryUrl}
  />,
  document.getElementById('root'),
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
serviceWorker.unregister();
