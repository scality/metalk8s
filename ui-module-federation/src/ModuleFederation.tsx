import React, {
  useEffect,
  useState,
  Suspense,
  lazy,
  useMemo,
  useRef,
  ReactNode,
} from "react";
//@ts-expect-error
import ErrorPage500 from "@scality/core-ui/dist/components/error-pages/ErrorPage500.component";
//@ts-expect-error
import Loader from "@scality/core-ui/dist/components/loader/Loader.component";
import { createContext } from "react";
import { useContext } from "react";
import { FunctionComponent } from "react";

type Module = any;

declare var __webpack_init_sharing__: (scope: string) => Promise<void>;
declare var __webpack_share_scopes__: { default: any };
declare global {
	interface Window {
		[scope: string]: {
      init: (sharedModules: any) => Promise<void>;
      get: (module: string) => () => Module;
    }
	}
}

export function loadModule(
  scope: string,
  module: string
): () => Promise<Module> {
  return async () => {
    // Initializes the share scope. This fills it with known provided modules from this build and all remotesk
    await __webpack_init_sharing__("default");
    const container = window[scope]; // or get the container somewhere else
    // Initialize the container, it may provide shared modules
    await container.init(__webpack_share_scopes__.default);
    const factory = await window[scope].get(module);
    const Module = factory();
    return Module;
  };
}

const CurrentAppContext = createContext<SolutionUI | null>(null);

export const useCurrentApp = () => {
  const contextValue = useContext(CurrentAppContext);

  if (contextValue === null) {
    throw new Error(
      "useCurrentApp can't be used outside of CurrentAppContext.Provider"
    );
  }

  return contextValue;
};

export const useDynamicScripts = ({
  urls,
}: {
  urls: string[];
}): { status: "idle" | "loading" | "success" | "error" } => {
  const [status, setStatus] =
    useState<"idle" | "loading" | "success" | "error">("idle");

  const isMountedRef = useRef(false);
  useEffect(() => {
    isMountedRef.current = true;
    if (!urls || urls.length === 0) {
      return;
    }

    setStatus("loading");

    const elementsPromises = urls.flatMap((url) => {
      if (typeof url !== "string") {
        throw new Error(
          `Invalid url, can't load a dynamic script with url '${url}'`
        );
      }

      const head = document.head;
      // $flow-disable-line
      const existingElement = [
        ...(head?.querySelectorAll("script") || []),
      ].find(
        //@ts-expect-error
        (scriptElement) => scriptElement.attributes.src?.value === url
      );
      if (existingElement) {
        return [Promise.resolve()];
      }
      const element = document.createElement("script");
      element.src = url;
      element.type = "text/javascript";
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

      return [promise];
    });

    Promise.all(elementsPromises)
      .then(() => {
        if (isMountedRef.current) {
          setStatus("success");
        }
      })
      .catch(() => {
        if (isMountedRef.current) {
          setStatus("error");
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
  const { status } = useDynamicScripts({
    urls: [url],
  });

  const Component = useMemo(() => {
    if (status === "success") {
      return lazy(loadModule(scope, module));
    }
    return () => <div></div>;
  }, [scope, module, status]);

  if (!url || !scope || !module) {
    throw new Error("Can't federate a component without url, scope and module");
  }

  if (status === "loading" || status === "idle") {
    return <Loader size="massive" centered={true} aria-label="loading" />; // TODO display the previous module while lazy loading the new one
  }

  if (status === "error") {
    return <ErrorPage500 data-cy="sc-error-page500" />;
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
      modules.map((mod) => loadModule(mod.scope, mod.module)())
    );
    const moduleExports = loadedModules.reduce(
      (current, loadedModule, index) => ({
        ...current,
        [modules[index].module]: loadedModule,
      }),
      {}
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
  federatedImports
}: {
  renderOnError: ReactNode;
  componentWithInjectedImports: FunctionComponent<Props>;
  componentProps: Props;
  federatedImports: {
    remoteEntryUrl: string;
    scope: string;
    module: string;
  }[]
}): ReactNode => {
  const { status } = useDynamicScripts({
    urls: federatedImports.map(federatedImport => federatedImport.remoteEntryUrl),
  });

  const Component = useMemo(
    () =>
      lazyWithModules(componentWithInjectedImports,
        ...federatedImports.map(federatedImport => ({
          scope: federatedImport.scope,
          module: federatedImport.module,
          url: federatedImport.remoteEntryUrl,
        }))),
    [JSON.stringify(federatedImports)]
  );

  if (status === "loading" || status === "idle") {
    return <Loader size="massive" centered={true} aria-label="loading" />; // TODO display the previous module while lazy loading the new one
  }

  if (status === "error" && renderOnError) {
    return renderOnError;
  }

  return (
    <Suspense
      fallback={<Loader size="massive" centered={true} aria-label="loading" />}
    >
      {/*@ts-expect-error*/}
      <Component {...componentProps} />
    </Suspense>
  );
};
