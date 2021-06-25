import ReactDOM from 'react-dom';
import 'regenerator-runtime/runtime';
import "@fortawesome/fontawesome-free/js/all.js";

import NavbarMdx from './src/navbar/index.mdx';
import { FederatedComponent } from '@scality/module-federation';
import { QueryClient, QueryClientProvider } from 'react-query';

ReactDOM.render(<>
    <QueryClientProvider client={new QueryClient()}>
    <FederatedComponent
      module={'./alerts/AlertProvider'}//TODO find a way to inject those values
      scope={'shell'}
      url={'http://localhost:8084/shell/remoteEntry.js'}
      props={{alertManagerUrl:'http://toto/alertmanager', children: 'hello'}}
    >
    </FederatedComponent>
    </QueryClientProvider>
</>, document.getElementById('app'));
