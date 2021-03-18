//@flow
import React, { createContext, useContext } from 'react';
import { useQuery } from 'react-query';
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
    return {
      ...query,
      alerts: filterAlerts(query.data, filters),
    };
  }
  return query;
}

const AlertProvider = ({ children }: any) => {
  const query = useQuery('activeAlerts', () => getAlerts(), {
    // refetch the alerts every 10 seconds
    refetchInterval: 10000,
  });

  return (
    <AlertContext.Provider value={{ ...query }}>
      {children}
    </AlertContext.Provider>
  );
};
export default AlertProvider;
