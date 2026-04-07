import { ErrorPage500, Loader, ToastProvider } from '@scality/core-ui';
import { useCurrentApp } from '@scality/module-federation';
import { PropsWithChildren, ReactNode, useEffect, useMemo } from 'react';
import { Provider, useDispatch } from 'react-redux';
import { applyMiddleware, compose, createStore, Store } from 'redux';
import createSagaMiddleware from 'redux-saga';
import 'regenerator-runtime/runtime';
import App from './containers/App';
import { authErrorAction } from './ducks/app/authError';
import { setApiConfigAction } from './ducks/config';
import { setHistory as setReduxHistory } from './ducks/history';
import reducer from './ducks/reducer';
import sagas from './ducks/sagas';
import { useTypedSelector } from './hooks';
import { AuthError } from './services/errorhandler';
import { ShellHooksProvider, useBasenameRelativeNavigate, useShellHooks } from '@scality/module-federation';
import { FederatedAppProps } from '../@mf-types/shell/App';

const composeEnhancers =
  // @ts-expect-error - FIXME when you are working on it
  typeof window === 'object' && window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
    ? // @ts-expect-error - FIXME when you are working on it
      window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__({})
    : compose;
const sagaMiddleware = createSagaMiddleware({
  onError: (error) => {
    if (error instanceof AuthError) {
      store.dispatch(authErrorAction());
    }
  },
});
const enhancer = composeEnhancers(applyMiddleware(sagaMiddleware));
export const store: Store = createStore(reducer, enhancer);
// @ts-expect-error - FIXME when you are working on it
if (window.Cypress) window.__store__ = store;
sagaMiddleware.run(sagas);

const RouterWithBaseName = ({ children }: { children: ReactNode }) => {
  const configStatus = useTypedSelector((state) => state.config.status);
  const navigate = useBasenameRelativeNavigate();
  const dispatch = useDispatch();

  useMemo(() => {
    dispatch(setReduxHistory(navigate));
  }, [dispatch]);

  if (configStatus === 'error') {
    return <ErrorPage500 data-cy="sc-error-page500" />;
  }

  if (configStatus === 'idle' || configStatus === 'loading') {
    return <>{children}</>;
  }

  return <>{children}</>;
};
type Config = {
  url: string;
  url_salt: string;
  url_prometheus: string;
  url_grafana: string;
  url_doc: string;
  url_alertmanager: string;
  url_loki: string;
  flags?: string[];
  ui_base_path?: string;
  url_support?: string;
};
export const useConfig = () => {
  const { name } = useCurrentApp();
  const { useConfig } = useShellHooks();
  const runtimeConfiguration = useConfig({
    configType: 'run',
    name,
  });

  return runtimeConfiguration.spec.selfConfiguration;
};

function InternalAppConfigProvider({ children }) {
  const dispatch = useDispatch();
  const { status, api } = useTypedSelector((state) => state.config);
  const config = useConfig();
  useEffect(() => {
    if (status === 'idle') {
      dispatch(setApiConfigAction(config));
    } // eslint-disable-next-line
  }, [status]);

  if (api && status === 'success') {
    return <>{children}</>;
  } else if (status === 'loading' || status === 'idle') {
    return <Loader size="massive" centered={true} aria-label="loading" />; // TODO display the previous module while lazy loading the new one
  } else if (status === 'error') {
    return <ErrorPage500 data-cy="sc-error-page500" />;
  }
}

export function AppConfigProviderWithoutRedux({ children }) {
  return <>{children}</>;
}

export const AppConfigProvider = ({
  children,
  componentWithInjectedImports,
}: PropsWithChildren<{ componentWithInjectedImports?: ReactNode }>) => {
  if (!componentWithInjectedImports) {
    return <InternalAppConfigProvider>{children}</InternalAppConfigProvider>;
  }
  return (
    //@ts-expect-error
    <componentWithInjectedImports>{children}</componentWithInjectedImports>
  );
};

export default function FederableApp(props: FederatedAppProps) {
  return (
    <ShellHooksProvider shellHooks={props.shellHooks} shellAlerts={props.shellAlerts}>
      <Provider store={store}>
        <AppConfigProvider>
          <ToastProvider>
            <RouterWithBaseName>
              <App />
            </RouterWithBaseName>
          </ToastProvider>
        </AppConfigProvider>
      </Provider>
    </ShellHooksProvider>
  );
}
