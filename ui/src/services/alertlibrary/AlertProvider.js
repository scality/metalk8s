//@flow
import { type Node } from 'react';
import { useQuery } from 'react-query';
import Loader from '@scality/core-ui/dist/components/loader/Loader.component';
import { getAlerts } from '../../services/alertmanager/api';
import { AlertContext } from './alertContext';
import { useTypedSelector } from '../../hooks';

/**
 * A wrapper fetching alerts and ensuring their accuracy via a polling refresh strategy.
 *
 * @param string alert manager url
 * @param Node children react node
 * @returns
 */
export default function AlertProvider({ children }: { children: Node }): Node {
  const alertManagerUrl = useTypedSelector(
    (state) => state.config.api.url_alertmanager,
  );

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
