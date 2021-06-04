//@flow
import { useEffect, useState, type Node, Suspense, lazy } from "react";
import ErrorPage500 from '@scality/core-ui/dist/components/error-pages/ErrorPage500.component';
import Loader from '@scality/core-ui/dist/components/loader/Loader.component';

declare var __webpack_init_sharing__: (scope: string) => Promise<void>;
declare var __webpack_share_scopes__: { default: {} };

function loadComponent(scope, module) {
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

const useDynamicScript = ({
  url,
}: {
  url: string,
}): { status: 'idle' | 'loading' | 'success' | 'error' } => {
  const [status, setStatus] =
    useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (!url) {
      return;
    }

    const element = document.createElement('script');

    element.src = url;
    element.type = 'text/javascript';
    element.async = true;

    setStatus('loading');

    element.onload = () => {
      console.log(`Dynamic Script Loaded: ${url}`);
      setStatus('success');
    };

    element.onerror = () => {
      console.error(`Dynamic Script Error: ${url}`);
      setStatus('error');
    };

    if (!document.head) {
      console.error(`document.head is undefined`);
      setStatus('error');
      return;
    }

    document.head.appendChild(element);

    return () => {
      console.log(`Dynamic Script Removed: ${url}`);
      //$FlowIssue - document.head must be defined here
      document.head.removeChild(element);
    };
  }, [url]);

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
}: FederatedComponentProps): Node {
  const { status } = useDynamicScript({
    url,
  });

  if (status === 'loading' || status === 'idle') {
    return <Loader size="massive" centered={true} aria-label="loading" />;// TODO display the previous module while lazy loading the new one
  }

  if (status === 'error') {
    return <ErrorPage500 data-cy='sc-error-page500'/>;
  }

  const Component = lazy(loadComponent(scope, module));

  return (
    <Suspense
      fallback={<Loader size="massive" centered={true} aria-label="loading" />}
    >
      <Component />
    </Suspense>
  );
}
