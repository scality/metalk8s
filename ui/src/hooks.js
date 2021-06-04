//@flow
import React, { type Node } from 'react';
import { useEffect, useState, createContext, useContext } from 'react';
import { useSelector } from 'react-redux';
import { useQuery } from 'react-query';

import type { RootState } from './ducks/reducer';
import { coreV1 } from './services/k8s/api';
import type { Nodes } from './types';
import {
  queryTimeSpansCodes,
  SAMPLE_DURATION_LAST_TWENTY_FOUR_HOURS,
} from './constants';
import { useURLQuery } from './services/utils';

/**
 * It brings automatic strong typing to native useSelector by anotating state with RootState.
 * It should be used instead of useSelector to benefit from RootState typing
 */
export const useTypedSelector: <TSelected>(
  selector: (state: RootState) => TSelected,
  equalityFn?: (left: TSelected, right: TSelected) => boolean,
) => TSelected = useSelector;

/**
 * It retrieves the nodes data through react-queries
 */
export const useNodes = (): Nodes => {
  const [nodes, setNodes] = useState([]);

  const nodesQuery = useQuery(
    'nodesNames',
    () =>
      coreV1.listNode().then((res) => {
        if (res.response.statusCode === 200 && res.body?.items) {
          // Extracting useful data (IP, name, ...) to top level for ease of use
          return res.body?.items.map((item) =>
            Object.assign({}, item, {
              internalIP: item?.status?.addresses?.find(
                (ip) => ip.type === 'InternalIP',
              ).address,
              name: item?.metadata?.name,
            }),
          );
        }
        return null;
      }),
    {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchInterval: 60000,
      refetchIntervalInBackground: true,
    },
  );

  useEffect(() => {
    if (!nodesQuery.isLoading && nodesQuery.isSuccess) {
      setNodes(nodesQuery.data);
    }
  }, [nodesQuery]);

  return nodes;
};

export type MetricsTimeSpan = number;
export type MetricsTimeSpanSetter = (metricsTimeSpan: MetricsTimeSpan) => void;
export type MetricsTimeSpanContextValue = {
  metricsTimeSpan: MetricsTimeSpan,
  setMetricsTimeSpan: MetricsTimeSpanSetter,
};
export const MetricsTimeSpanContext = createContext<MetricsTimeSpanContextValue>();
export const MetricsTimeSpanProvider = ({ children }: { children: Node }) => {
  const [metricsTimeSpan, setMetricsTimeSpan] = useState(
    SAMPLE_DURATION_LAST_TWENTY_FOUR_HOURS,
  );

  return (
    <MetricsTimeSpanContext.Provider
      value={{ metricsTimeSpan, setMetricsTimeSpan }}
    >
      {children}
    </MetricsTimeSpanContext.Provider>
  );
};

export const useMetricsTimeSpan = (): [
  MetricsTimeSpan,
  MetricsTimeSpanSetter,
] => {
  const query = useURLQuery();
  const queryTimeSpan = query.get('from');
  const metricsTimeSpanContext = useContext(MetricsTimeSpanContext);

  if (!metricsTimeSpanContext) {
    throw new Error(
      "useMetricsTimeSpan hook can't be use outside <MetricsTimeSpanProvider/>",
    );
  }

  const { metricsTimeSpan, setMetricsTimeSpan } = metricsTimeSpanContext;

  // Sync url timespan to local timespan
  useEffect(() => {
    if (queryTimeSpan) {
      const formatted = queryTimeSpansCodes.find(
        (item) => item.label === queryTimeSpan,
      );
      if (formatted && formatted.duration) {
        setMetricsTimeSpan(formatted.duration);
      }
    }
  }, [setMetricsTimeSpan, queryTimeSpan]);

  return [metricsTimeSpan, setMetricsTimeSpan];
};
