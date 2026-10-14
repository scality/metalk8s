import { useShellHooks } from '@scality/module-federation';

const VM_MANAGEMENT_KIND = 'vm-management-ui';
const VM_MANAGEMENT_VIEW = 'vmManagement';

export function useVirtualMachinesView() {
  const { useDeployedApps, useConfigRetriever } = useShellHooks();
  const [app] = useDeployedApps({ kind: VM_MANAGEMENT_KIND });
  const { retrieveConfiguration } = useConfigRetriever();

  if (!app) {
    return undefined;
  }

  const config = retrieveConfiguration({ configType: 'build', name: app.name, url: app.url });
  const view = config?.spec?.views?.[VM_MANAGEMENT_VIEW];
  return view ? { app, view } : undefined;
}
