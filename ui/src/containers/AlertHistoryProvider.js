//@flow
import React, { createContext, useContext, useRef } from 'react';
import { useQuery } from 'react-query';
import { filterAlerts } from '../services/alertUtils';
import type { FilterLabels } from '../services/alertUtils';
import { useStartingTimeStamp } from './StartTimeProvider';
import { getAlertsHistoryQuery } from '../services/platformlibrary/metrics';
import { useMetricsTimeSpan } from '@scality/core-ui/dist/components/linetemporalchart/MetricTimespanProvider';

const AlertHistoryContext = createContext<null>(null);

export function useHistoryAlerts(filters?: FilterLabels) {
  const previousAlertsRef = useRef([]);
  const query = useContext(AlertHistoryContext);
  if (!query) {
    throw new Error(
      'The useHistoryAlerts hook can only be used within AlertHistoryProvider.',
    );
  } else if (query.status === 'success') {
    const alerts = filterAlerts(query.data, filters);
    previousAlertsRef.current = alerts;
  }
  const newQuery = { ...query, alerts: previousAlertsRef.current };
  delete newQuery.data;
  return newQuery;
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
