//@flow
import React, { createContext, useContext } from 'react';
import { useQuery } from 'react-query';
import { filterAlerts } from '../services/alertUtils';
import type { FilterLabels } from '../services/alertUtils';
import { useMetricsTimeSpan } from '../hooks';
import { useStartingTimeStamp } from './StartTimeProvider';
import { getAlertsHistoryQuery } from '../services/platformlibrary/metrics';

const AlertHistoryContext = createContext<null>(null);

export function useHistoryAlerts(filters?: FilterLabels) {
  const query = useContext(AlertHistoryContext);
  if (!query) {
    throw new Error(
      'The useHistoryAlerts hook can only be used within AlertHistoryProvider.',
    );
  } else if (query.status === 'success') {
    const alerts = filterAlerts(query.data, filters);

    const newQuery = { ...query, alerts };
    delete newQuery.data;
    return newQuery;
  }
  return query;
}

const AlertHistoryProvider = ({ children }: any) => {
  const { startingTimeISO, currentTimeISO } = useStartingTimeStamp();
  const { frequency } = useMetricsTimeSpan();

  const query = useQuery(
    getAlertsHistoryQuery({ currentTimeISO, frequency, startingTimeISO }),
  );

  return (
    <AlertHistoryContext.Provider value={{ ...query }}>
      {children}
    </AlertHistoryContext.Provider>
  );
};
export default AlertHistoryProvider;
