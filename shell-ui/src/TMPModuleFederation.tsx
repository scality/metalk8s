import React, {
  useEffect,
  useState,
  Suspense,
  lazy,
  useMemo,
  useRef,
  ReactNode,
  createContext,
  useContext,
  FunctionComponent,
} from 'react';
import { ErrorPage500 } from '@scality/core-ui/dist/components/error-pages/ErrorPage500.component';
import { Loader } from '@scality/core-ui/dist/components/loader/Loader.component';
import {
  loadRemote,
  registerRemotes,
} from '@module-federation/enhanced/runtime';

type Module = any;

declare global {
  interface Window {
    [scope: string]: {
      init: (sharedModules: any) => Promise<void>;
      get: (module: string) => () => Module;
    };
  }
}

export function loadModule(
  scope: string,
  module: string,
): () => Promise<Module> {
  return async () => {
    // console.log('React.version', React.version);
    // console.log('ReactDOM.version', toto.version);
    // // Initializes the share scope. This fills it with known provided modules from this build and all remotesk
    // await __webpack_init_sharing__('default');
    // const container = window[scope]; // or get the container somewhere else
    // // Initialize the container, it may provide shared modules
    // await container.init(__webpack_share_scopes__.default);
    // const factory = await window[scope].get(module);
    // const Module = factory();
    // return Module;

    console.log('scope', scope, module);

    const m2 = module.substring(2);

    console.log('m2', m2);

    const remoteUrl = `metalk8s/${m2}`;
    console.log('==> try to load', remoteUrl);

    return loadRemote(remoteUrl);
  };
}

const CurrentAppContext = createContext<SolutionUI | null>(null);

export const useCurrentApp = () => {
  const contextValue = useContext(CurrentAppContext);

  if (contextValue === null) {
    throw new Error(
      "useCurrentApp can't be used outside of CurrentAppContext.Provider",
    );
  }

  return contextValue;
};

export const useDynamicScripts = ({
  urls,
}: {
  urls: string[];
}): { status: 'idle' | 'loading' | 'success' | 'error' } => {
  const [status, setStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');

  const isMountedRef = useRef(false);
  useEffect(() => {
    isMountedRef.current = true;
    if (!urls || urls.length === 0) {
      return;
    }

    setStatus('loading');

    const elementsPromises = urls.flatMap((url) => {
      if (typeof url !== 'string') {
        throw new Error(
          `Invalid url, can't load a dynamic script with url '${url}'`,
        );
      }

      const head = document.head;
      // $flow-disable-line
      const existingElement = [
        ...(head?.querySelectorAll('script') || []),
      ].find(
        //@ts-expect-error
        (scriptElement) => scriptElement.attributes.src?.value === url,
      );
      let element: HTMLScriptElement;
      if (existingElement) {
        if (existingElement.attributes.getNamedItem('data-loaded')) {
          return [Promise.resolve()];
        }

        element = existingElement;
      } else {
        element = document.createElement('script');
        element.src = url;
        element.type = 'text/javascript';
        element.async = true;
      }

      const promise = new Promise((resolve, reject) => {
        const previousOnload = element.onload;
        element.onload = (evt) => {
          if (previousOnload) {
            // @ts-expect-error on this context type conflict
            previousOnload(evt);
          }
          console.log(`Dynamic Script Loaded: ${url}`);
          resolve(element);
        };

        const previousOnerror = element.onerror;
        element.onerror = (evt) => {
          if (previousOnerror) {
            previousOnerror(evt);
          }
          console.error(`Dynamic Script Error: ${url}`);
          reject();
        };

        if (!document.head) {
          console.error(`document.head is undefined`);
          return reject();
        }

        document.head.appendChild(element);
      });

      return [promise];
    });

    Promise.all(elementsPromises)
      .then((scriptElements) => {
        if (isMountedRef.current) {
          scriptElements.forEach((scriptElement) => {
            if (scriptElement instanceof HTMLScriptElement) {
              scriptElement.setAttribute('data-loaded', 'true');
            }
          });
          setStatus('success');
        }
      })
      .catch(() => {
        if (isMountedRef.current) {
          setStatus('error');
        }
      });

    return () => {
      isMountedRef.current = false;
    };
  }, [JSON.stringify(urls), isMountedRef]);

  return {
    status,
  };
};

export type FederatedComponentProps = {
  url: string;
  scope: string;
  module: string;
};

export type SolutionUI = {
  kind: string;
  url: string;
  name: string;
  version: string;
  appHistoryBasePath: string;
};

export function FederatedComponent({
  url,
  scope,
  module,
  app,
  props,
}: FederatedComponentProps & { props: any; app: SolutionUI }): ReactNode {
  const Component = useMemo(() => {
    registerRemotes([
      {
        name: scope,
        entry: url,
      },
    ]);
    return lazy(loadModule(scope, module));
  }, [scope, module]);

  if (!url || !scope || !module) {
    throw new Error("Can't federate a component without url, scope and module");
  }

  return (
    <Suspense
      fallback={<Loader size="massive" centered={true} aria-label="loading" />}
    >
      <CurrentAppContext.Provider value={app}>
        <Component {...props} />
      </CurrentAppContext.Provider>
    </Suspense>
  );
}

export const lazyWithModules = <Props extends {}>(
  functionComponent: FunctionComponent<Props>,
  ...modules: { module: string; url: string; scope: string }[]
) => {
  return React.lazy(async () => {
    const loadedModules = await Promise.all(
      modules.map((mod) => {
        registerRemotes([
          {
            name: mod.scope,
            entry: mod.url,
          },
        ]);
        return loadModule(mod.scope, mod.module)();
      }),
    );
    const moduleExports = loadedModules.reduce(
      (current, loadedModule, index) => ({
        ...current,
        [modules[index].module]: loadedModule,
      }),
      {},
    );
    return {
      __esModule: true,
      default: (originalProps: Props) =>
        functionComponent({ moduleExports: moduleExports, ...originalProps }),
    };
  });
};

export const ComponentWithFederatedImports = <Props extends {}>({
  renderOnError,
  componentWithInjectedImports,
  componentProps,
  federatedImports,
}: {
  renderOnError: ReactNode;
  componentWithInjectedImports: FunctionComponent<Props>;
  componentProps: Props;
  federatedImports: {
    remoteEntryUrl: string;
    scope: string;
    module: string;
  }[];
}): ReactNode => {
  const Component = useMemo(
    () =>
      lazyWithModules(
        componentWithInjectedImports,
        ...federatedImports.map((federatedImport) => ({
          scope: federatedImport.scope,
          module: federatedImport.module,
          url: federatedImport.remoteEntryUrl,
        })),
      ),
    [JSON.stringify(federatedImports)],
  );

  return (
    <Suspense
      fallback={<Loader size="massive" centered={true} aria-label="loading" />}
    >
      {/*@ts-expect-error*/}
      <Component {...componentProps} />
    </Suspense>
  );
};
