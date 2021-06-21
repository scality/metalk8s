//@flow
import { createContext, useContext, type Node } from 'react';
import { useQuery } from 'react-query';
import Loader from '@scality/core-ui/dist/components/loader/Loader.component';
import { getAlerts } from './services/alertManager';
import { filterAlerts } from './services/alertUtils';
import type { FilterLabels } from './services/alertUtils';
import { AlertContext } from './alertContext';

/**
 * A wrapper fetching alerts and ensuring their accuracy via a polling refresh strategy.
 *
 * @param string alert manager url
 * @param Node children react node
 * @returns
 */
export default function AlertProvider({
  alertManagerUrl,
  children,
}: {
  alertManagerUrl: string,
  children: Node,
}): Node {
  const query = useQuery('activeAlerts', () => getAlerts(alertManagerUrl), {
    // refetch the alerts every 10 seconds
    refetchInterval: 10000, // TODO manage this refresh interval gloabally
    // avoid stucking at the hard loading state before alertmanager is ready
    initialData: [],
  });

  return (
    <AlertContext.Provider value={{ ...query }}>
      {query.status === 'loading' && (
        <Loader size="massive" centered={true} aria-label="loading" />
      )}
      {query.status !== 'loading' && children}
    </AlertContext.Provider>
  );
}
