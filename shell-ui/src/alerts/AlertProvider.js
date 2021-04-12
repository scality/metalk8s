//@flow
import { createContext, useContext, type Node } from 'react';
import { useQuery } from 'react-query';
import { Loader } from '@scality/core-ui/dist/components/loader/Loader.component';
import { getAlerts } from './services/alertManager';
import { filterAlerts } from './services/alertUtils';
import type { FilterLabels } from './services/alertUtils';

const contextStore = {};

/**
 * Hooks that enables retrieval of alerts fetched by <AlertProvider />
 * 
 * Host UIs have to inject React.useContext when using it. This design has several advantages :
 *  - It avoids having to bundle react with this alerts provider and hence allow substential bundle size reduction
 *  - It avoids react dependency conflicts with hosting applications
 * 
 * Calling useAlerts(useContext) actually returns a hook allowing alert filtering thanks to selector object.
 * Example: In order to retrieve alerts with name "KubeCPUOvercommit", a host UI will have to call 
 * useAlerts(useContext)({alertname: 'KubeCPUOvercommit'})
 * 
 * @param {typeof React.useContext} useContext, host React.useContext 
 * @returns useAlerts(alertSelectors) hook.
 */
export function useAlerts(useContext: typeof useContext) {
  return (filters: FilterLabels) => {
    const query = useContext(contextStore.AlertContext);
    if (!query) {
      throw new Error(
        'The useAlerts hook can only be used within AlertProvider.',
      );
    } else if (query.status === 'success') {
      const newQuery = {
        ...query,
        alerts: filterAlerts(query.data, filters),
      };
      delete newQuery.data;
      return newQuery;
    }
    return query;
  };
}

/**
 * It initiates internal context and is necessary to be called before the first render of <AlertProvider />
 * We recommend calling this function as soon as alert library is ready on the host application.
 * 
 * A reference implementation can be found here : ${metalk8sRoot}/ui/src/containers/AlertProvider.js
 * 
 * Similarly as useAlerts hook, host applications have to inject React.createContext for the same reasons as above.
 * 
 * @param {typeof createContext} createContext 
 */
export const createAlertContext = (createContext: typeof createContext) => {
    contextStore.AlertContext = createContext<null>(null);
}

/**
 * A wrapper fetching alerts and ensuring their accuracy via a polling refresh strategy.
 * 
 * Similary as above, host applications have to inject reqct-query.useQuery to avoid any
 * dependency conflicts and limit the bundle size.
 * 
 * @param {typeof useQuery} useQuery 
 * @returns 
 */
export const AlertProvider = (
  useQuery: typeof useQuery,
) => {
  if (!contextStore.AlertContext) {
      throw new Error("createAlertContext should be called before rendering AlertProvider")
  }
  return ({
    alertManagerUrl,
    children,
  }: {
    alertManagerUrl: string,
    children: Node,
  }): Node => {
    const query = useQuery('activeAlerts', () => getAlerts(alertManagerUrl), {
      // refetch the alerts every 10 seconds
      refetchInterval: 10000,
      // avoid stucking at the hard loading state before alertmanager is ready
      initialData: [],
    });

    if (query.status === 'loading') {
      return (
        <contextStore.AlertContext.Provider value={{ ...query }}>
          <Loader size="massive" centered={true} aria-label="loading" />
        </contextStore.AlertContext.Provider>
      );
    } else
      return (
        <contextStore.AlertContext.Provider value={{ ...query }}>
          {children}
        </contextStore.AlertContext.Provider>
      );
  };

  return { AlertProvider, useAlerts };
};
