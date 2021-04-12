//@flow
import { createContext, useContext, type Node } from 'react';
import { useQuery } from 'react-query';
import { Loader } from '@scality/core-ui/dist/components/loader/Loader.component';
import { getAlerts } from './services/alertManager';
import { filterAlerts } from './services/alertUtils';
import type { FilterLabels } from './services/alertUtils';

const contextStore = {};

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

export const createAlertContext = (createContext: typeof createContext) => {
    contextStore.AlertContext = createContext<null>(null);
}

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
