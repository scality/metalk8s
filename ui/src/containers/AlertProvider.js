import React, { createContext, useContext } from 'react';
import { useQuery } from 'react-query';
import { getAlerts } from '../services/alertmanager/api';
import { filterAlerts } from '../services/alertUtils';

const AlertContext = createContext(null);

export function useAlerts(filters: FilterLabels) {
  const query = useContext(AlertContext);
  if (query.status === 'success') {
    return {
      ...query,
      data: filterAlerts(query.data, filters),
    };
  }
  return query;
}

const AlertProvider = ({ children }) => {
  const query = useQuery('activeAlerts', () =>
    getAlerts().then((data) => {
      return data;
    }),
  );

  return (
    <AlertContext.Provider value={{ ...query }}>
      {children}
    </AlertContext.Provider>
  );
};
export default AlertProvider;
