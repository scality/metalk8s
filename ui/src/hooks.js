//@flow
import React, { type Node } from 'react';
import { useEffect, useState, createContext, useContext } from 'react';
import { useSelector } from 'react-redux';
import { useQuery } from 'react-query';

import type { RootState } from './ducks/reducer';
import { coreV1 } from './services/k8s/api';
import {
  queryTimeSpansCodes,
  REFRESH_METRICS_GRAPH,
  SAMPLE_DURATION_LAST_TWENTY_FOUR_HOURS,
} from './constants';
import { useURLQuery } from './services/utils';
import type { V1NodeList } from '@kubernetes/client-node';
import { useAlerts } from './containers/AlertProvider';
import { getVolumeListData } from './services/NodeVolumesUtils';
import { filterAlerts, getHealthStatus } from './services/alertUtils';

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
export const useNodes = (): V1NodeList => {
  const [nodes, setNodes] = useState([]);

  const nodesQuery = useQuery(
    'nodesNames',
    () =>
      coreV1.listNode().then((res) => {
        if (res.response.statusCode === 200 && res.body?.items)
          return res.body?.items;
        return null;
      }),
    {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchInterval: REFRESH_METRICS_GRAPH,
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

export const useNodeAddressesSelector = (
  nodes: V1NodeList,
): Array<{ internalIP: string, name: string }> => {
  return nodes.map((item) => {
    return {
      internalIP: item?.status?.addresses?.find(
        (ip) => ip.type === 'InternalIP',
      ).address,
      name: item?.metadata?.name,
    };
  });
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

export const useVolumesWithAlerts = (nodeName?: string) => {
  const {alerts} = useAlerts();
  const volumeListData = useTypedSelector((state) =>
    getVolumeListData(state, null, nodeName).map(volume => {
      const volumeAlerts = filterAlerts(alerts, {
        persistentvolumeclaim: volume.name,
      });
      const volumeHealth = getHealthStatus(volumeAlerts);
      return ({
      ...volume,
      health: volumeHealth
    })}) 
  );
  return volumeListData;
}
