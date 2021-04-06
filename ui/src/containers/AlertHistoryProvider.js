//@flow
import React, { createContext, useContext } from 'react';
import { useQuery } from 'react-query';
import { getLast7DaysAlerts } from '../services/loki/api';
import { filterAlerts } from '../services/alertUtils';
import type { FilterLabels } from '../services/alertUtils';

const AlertHistoryContext = createContext<null>(null);

export function useHistoryAlerts(filters?: FilterLabels) {
  const query = useContext(AlertHistoryContext);
  if (!query) {
    throw new Error(
      'The useHistoryAlerts hook can only be used within AlertHistoryProvider.',
    );
  } else if (query.status === 'success') {
    const newQuery = { ...query, alerts: filterAlerts(query.data, filters) };
    delete newQuery.data;
    return newQuery;
  }
  return query;
}

const AlertHistoryProvider = ({ children }: any) => {
  const query = useQuery('alertsHistory', () => getLast7DaysAlerts(), {
    initialData: [],
  });

  return (
    <AlertHistoryContext.Provider value={{ ...query }}>
      {children}
    </AlertHistoryContext.Provider>
  );
};
export default AlertHistoryProvider;
