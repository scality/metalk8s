//@flow
import React, {
  useEffect,
  useState,
  type Node,
  Suspense,
  lazy,
  type StatelessFunctionalComponent,
} from 'react';
import ErrorPage500 from '@scality/core-ui/dist/components/error-pages/ErrorPage500.component';
import Loader from '@scality/core-ui/dist/components/loader/Loader.component';


/***
 * 
 * TODO EXTRACT THIS FILE TO A LIBRARY
 * 
 */

declare var __webpack_init_sharing__: (scope: string) => Promise<void>;
declare var __webpack_share_scopes__: { default: {} };

type Module = any;// todo retrieve this type from webpack

export function loadModule(scope: string, module: string): () => Promise<Module> {
  // todo replace any type with module
  return async () => {
    // Initializes the share scope. This fills it with known provided modules from this build and all remotes
    await __webpack_init_sharing__('default');
    const container = window[scope]; // or get the container somewhere else
    // Initialize the container, it may provide shared modules
    await container.init(__webpack_share_scopes__.default);
    const factory = await window[scope].get(module);
    const Module = factory();
    return Module;
  };
}

export const useDynamicScripts = ({
  //todo check if script is already loaded
  urls,
}: {
  urls: string[],
}): { status: 'idle' | 'loading' | 'success' | 'error' } => {
  const [status, setStatus] =
    useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (!urls || urls.length === 0) {
      return;
    }

    setStatus('loading');

    //todo rename elements to ,... ???>
    const elements = urls.flatMap((url) => {
      if (typeof url !== 'string') {
        throw new Error(`Invalid url, can't load a dynamic script with url '${url}'`);
      }

      const head = document.head;
      // $flow-disable-line
      const existingElement = [
        ...(head?.querySelectorAll('script') || []),
      ].find(
        // $flow-disable-line
        (scriptElement) => scriptElement.attributes.src?.value === url,
      );
      if (existingElement) {
        return [{ url, promise: Promise.resolve(), element: existingElement }];
      }
      const element = document.createElement('script');
      element.src = url;
      element.type = 'text/javascript';
      element.async = true;

      const promise = new Promise((resolve, reject) => {
        element.onload = () => {
          console.log(`Dynamic Script Loaded: ${url}`);
          resolve(element);
        };

        element.onerror = () => {
          console.error(`Dynamic Script Error: ${url}`);
          reject();
        };

        if (!document.head) {
          console.error(`document.head is undefined`);
          return reject();
        }

        document.head.appendChild(element);
      });

      return [{ url, promise, element }];
    });

    //TODO cancel {promises}/{set state} on unmount
    Promise.all(elements.map((elem) => elem.promise))
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));

    return () => {
      elements.forEach((elem) => {
        console.log(`Dynamic Script Removed: ${elem.url}`);
        //$FlowIssue - document.head must be defined here
        document.head.removeChild(elem.element);
      });
    };
  }, [JSON.stringify(urls)]);

  return {
    status,
  };
};

export type FederatedComponentProps = {
  url: string,
  scope: string,
  module: string,
};

export function FederatedComponent({
  url,
  scope,
  module,
  props
}: FederatedComponentProps & {props: any}): Node {
  const { status } = useDynamicScripts({
    urls: [url],
  });

  if (!url || !scope || !module) {
    throw new Error("Can't federate a component without url, scope and module");
  }

  if (status === 'loading' || status === 'idle') {
    return <Loader size="massive" centered={true} aria-label="loading" />; // TODO display the previous module while lazy loading the new one
  }

  if (status === 'error') {
    return <ErrorPage500 data-cy="sc-error-page500" />;
  }

  const Component = lazy(loadModule(scope, module));

  return (
    <Suspense
      fallback={<Loader size="massive" centered={true} aria-label="loading" />}
    >
      <Component {...props}/>
    </Suspense>
  );
}

export const lazyWithModules = (
  functionComponent: StatelessFunctionalComponent<any>, // Note : StatelessFunctionalComponent is the name of flow FunctionComponents type. This type is incorrectly named "Stateless" but we do accept stateful functional components here thanks to hooks
  ...modules: { module: string, url: string, scope: string }[]
) => {
  return React.lazy(async () => {
    const loadedModules = await Promise.all(
      modules.map((mod) => loadModule(mod.scope, mod.module)()),
    );
    const moduleExports = loadedModules.reduce(
      (current, loadedModule, index) => ({
        ...current,
        [modules[index].module]: loadedModule,
      }),
      {},
    );
    console.log(moduleExports);//todo remove this
    return {
      __esModule: true,
      default: (originalProps) =>
        functionComponent({ moduleExports: moduleExports, ...originalProps }),
    };
  });
};

export const ComponentWithLazyHook = <T>({
  remoteEntryUrl,
  renderOnError,
  componentWithInjectedHook,
  moduleFederationScope,
  federatedModule,
  componentProps,
}: {
  remoteEntryUrl: string,
  renderOnError: Node,
  componentWithInjectedHook: (props: T) => Node,
  moduleFederationScope: string,
  federatedModule: string,
  componentProps: T,
}) => {
  const { status } = useDynamicScripts({
    urls: [remoteEntryUrl],
  });

  if (status === 'loading' || status === 'idle') {
    return <Loader size="massive" centered={true} aria-label="loading" />; // TODO display the previous module while lazy loading the new one
  }

  if (status === 'error' && renderOnError) {
    return renderOnError;
  }

  const Component = lazyWithModules(componentWithInjectedHook, {
    scope: moduleFederationScope,
    module: federatedModule,
    url: remoteEntryUrl,
  });

  return (
    <Suspense
      fallback={<Loader size="massive" centered={true} aria-label="loading" />}
    >
      <Component {...componentProps} />
    </Suspense>
  );
};
