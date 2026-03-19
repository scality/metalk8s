import React from 'react';
import { useQuery } from 'react-query';
import { Loader } from '@scality/core-ui/dist/components/loader/Loader.component';
import { useAuth } from '../auth/AuthProvider';
import { getAlerts } from './services/alertManager';
import { AlertContext } from './alertContext';
/**
 * A wrapper fetching alerts and ensuring their accuracy via a polling refresh strategy.
 *
 * @param string alert manager url
 * @param React.ReactNode children react node
 * @returns
 */

export default function AlertProvider({
  alertManagerUrl,
  children,
}: {
  alertManagerUrl: string;
  children: React.ReactNode;
}) {
  const { userData } = useAuth();
  const query = useQuery(
    ['activeAlerts', userData?.token],
    () => getAlerts(alertManagerUrl, userData?.token),
    {
      // refetch the alerts every 30 seconds
      refetchInterval: 30000,
      // TODO manage this refresh interval globally
      // avoid stucking at the hard loading state before alertmanager is ready
      initialData: [],
    },
  );
  return (
    <AlertContext.Provider value={{ ...query }}>
      {query.status === 'loading' && (
        <Loader size="massive" centered={true} aria-label="loading" />
      )}
      {query.status !== 'loading' && children}
    </AlertContext.Provider>
  );
}
