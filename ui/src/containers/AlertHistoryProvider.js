import React, { createContext, useContext } from 'react';
import { useQuery } from 'react-query';
import { getLast7DaysAlerts } from '../services/loki/api';
import { filterAlerts } from '../services/alertUtils';

const AlertHistoryContext = createContext(null);

export function useHistoryAlerts(filters?: FilterLabels) {
  const query = useContext(AlertHistoryContext);
  if (query.status === 'success') {
    return {
      ...query,
      data: filterAlerts(query.data, filters),
    };
  }
  return query;
}

const AlertHistoryProvider = ({ children }) => {
  const query = useQuery('alertsHistory', () =>
    getLast7DaysAlerts().then((data) => {
      return data;
    }),
  );

  return (
    <AlertHistoryContext.Provider value={{ ...query }}>
      {children}
    </AlertHistoryContext.Provider>
  );
};
export default AlertHistoryProvider;
