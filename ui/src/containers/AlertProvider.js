//@flow
import React, { createContext, useContext } from 'react';
import { useQuery } from 'react-query';
import { Loader } from '@scality/core-ui';
import { getAlerts } from '../services/alertmanager/api';
import { filterAlerts } from '../services/alertUtils';
import type { FilterLabels } from '../services/alertUtils';

const AlertContext = createContext<null>(null);

export function useAlerts(filters: FilterLabels) {
  const query = useContext(AlertContext);
  if (!query) {
    throw new Error(
      'The useAlerts hook can only be used within AlertProvider.',
    );
  } else if (query.status === 'success') {
    const newQuery = { ...query, alerts: filterAlerts(query.data, filters) };
    delete newQuery.data;
    return newQuery;
  }
  return query;
}

const AlertProvider = ({ children }: any) => {
  const query = useQuery('activeAlerts', () => getAlerts(), {
    // refetch the alerts every 10 seconds
    refetchInterval: 10000,
  });
  if (query.status === 'loading') {
    return (
      <AlertContext.Provider value={{ ...query }}>
        <Loader size="massive" centered={true} aria-label="loading" />
      </AlertContext.Provider>
    );
  } else
    return (
      <AlertContext.Provider value={{ ...query }}>
        {children}
      </AlertContext.Provider>
    );
};
export default AlertProvider;
