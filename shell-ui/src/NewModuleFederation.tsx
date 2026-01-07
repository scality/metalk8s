import type {
  ModuleFederation,
} from '@module-federation/enhanced/runtime';
import React, { LazyExoticComponent, Suspense, useLayoutEffect, useState } from 'react';



export function registerAndLoadModule(
  scope: string,
  module: string,
  url: string,
  mf: ModuleFederation,
): () => Promise<Module> {

  mf.registerRemotes([
    {
      name: scope,
      entry: url,
    },
  ]);

  const moduleAbsolutePath = module.substring(1);

  const remoteUrl = `${scope}${moduleAbsolutePath}`;

  return () => mf.loadRemote(remoteUrl);
}

export const lazyWithModules = <Props extends {}>(
  functionComponent: FunctionComponent<React.PropsWithChildren<Props>>,
  mf: ModuleFederation,
  ...modules: { module: string; url: string; scope: string }[]
) => {
  return React.lazy(async () => {
    const loadedModules = await Promise.all(
      modules.map((mod) => {
        return registerAndLoadModule(mod.scope, mod.module, mod.url, mf)();
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

export const NewComponentWithFederatedImports = <Props extends {}>({
  renderOnError,
  renderOnLoading,
  componentWithInjectedImports,
  componentProps,
  federatedImports,
  mf
}: {
  renderOnError?: ReactNode;
  renderOnLoading?: ReactNode;
  componentWithInjectedImports: FunctionComponent<
    React.PropsWithChildren<Props> & { moduleExports: Record<string, unknown> }
  >;
  componentProps: Props;
  federatedImports: {
    remoteEntryUrl: string;
    scope: string;
    module: string;
  }[];
  mf: ModuleFederation;
}) => {
  const [Component, setComponent] = useState<LazyExoticComponent<any> | null>(
    null,
  );
  useLayoutEffect(() => {
    const Comp = lazyWithModules(
      componentWithInjectedImports,
      mf,
      ...federatedImports.map((federatedImport) => ({
        scope: federatedImport.scope,
        module: federatedImport.module,
        url: federatedImport.remoteEntryUrl,
      })),
    );
    setComponent(() => Comp);
  }, [JSON.stringify(federatedImports)]);

  return (
    <Suspense fallback={renderOnLoading ?? <>Loading...</>}>
      {Component && <Component {...componentProps} />}
    </Suspense>
  );
};
