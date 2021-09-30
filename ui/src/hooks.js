//@flow
import React, { type Node, useRef } from 'react';
import { useEffect, useState, createContext } from 'react';
import { useSelector } from 'react-redux';
import { useQuery } from 'react-query';

import type { RootState } from './ducks/reducer';
import { coreV1 } from './services/k8s/api';
import {
  REFRESH_METRICS_GRAPH,
  SAMPLE_DURATION_LAST_TWENTY_FOUR_HOURS,
  VOLUME_CONDITION_LINK,
  STATUS_NONE,
} from './constants';
import { compareHealth } from './services/utils';
import type { V1NodeList } from '@kubernetes/client-node';
import { useAlerts } from './containers/AlertProvider';
import { getVolumeListData } from './services/NodeVolumesUtils';
import { filterAlerts, getHealthStatus } from './services/alertUtils';
import { useStartingTimeStamp } from './containers/StartTimeProvider';
import type { PrometheusQueryResult } from './services/prometheus/api';
import type { TimeSpanProps } from './services/platformlibrary/metrics';
import { useMetricsTimeSpan } from '@scality/core-ui/dist/next';
import { type Serie } from '@scality/core-ui/dist/components/linetemporalchart/LineTemporalChart.component';
import type { UseQueryResult } from 'react-query';
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
  const nodesQuery = useQuery(
    'nodesNames',
    () =>
      coreV1.listNode().then((res) => {
        if (res.response.statusCode === 200 && res.body?.items) {
          return res.body?.items;
        }
        return [];
      }),
    {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchInterval: REFRESH_METRICS_GRAPH,
    },
  );

  return nodesQuery.data || [];
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
export const MetricsTimeSpanContext =
  createContext<MetricsTimeSpanContextValue>();
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

export const useVolumesWithAlerts = (nodeName?: string) => {
  const { alerts } = useAlerts();
  const volumeListData = useTypedSelector((state) =>
    getVolumeListData(state, null, nodeName),
  );

  //This forces alerts to have been fetched at least once (watchdog alert should be present)
  // before rendering volume list
  // TODO enhance this using useAlerts status
  if (alerts.length === 0) return [];
  const volumeListWithStatus = volumeListData.map((volume) => {
    const volumeAlerts = filterAlerts(alerts, {
      persistentvolumeclaim: volume.persistentvolumeclaim,
    });
    // For the unbound volume, the health status should be none.
    const isVolumeBound = volume.status === VOLUME_CONDITION_LINK;
    const volumeHealth = getHealthStatus(volumeAlerts);
    return {
      ...volume,
      health: isVolumeBound ? volumeHealth : STATUS_NONE,
    };
  });

  volumeListWithStatus.sort((volumeA, volumeB) =>
    compareHealth(volumeB.health, volumeA.health),
  );
  return volumeListWithStatus;
};

export const useSingleChartSerie = ({
  getQuery,
  transformPrometheusDataToSeries, //It should be memoised using useCallback
}: {
  getQuery: (timeSpanProps: TimeSpanProps) => UseQueryResult,
  transformPrometheusDataToSeries: (
    prometheusResult: PrometheusQueryResult,
  ) => Serie[],
}) => {
  const { startingTimeISO, currentTimeISO } = useStartingTimeStamp();
  const { frequency } = useMetricsTimeSpan();

  const startTimeRef = useRef(startingTimeISO);
  const chartStartTimeRef = useRef(startingTimeISO);
  const [series, setSeries] = useState([]);

  startTimeRef.current = startingTimeISO;

  const query = useQuery(
    getQuery({
      startingTimeISO,
      currentTimeISO,
      frequency,
    }),
  );

  const isLoading = query.isLoading;

  useEffect(() => {
    if (!isLoading) {
      chartStartTimeRef.current = startTimeRef.current;
      setSeries(transformPrometheusDataToSeries(query.data));
    }
  }, [isLoading, transformPrometheusDataToSeries]);

  return {
    series: series,
    startingTimeStamp: Date.parse(chartStartTimeRef.current) / 1000,
    isLoading,
  };
};

export const useSymetricalChartSeries = ({
  getQueryAbove,
  getQueryBelow,
  transformPrometheusDataToSeries, //It should be memoised using useCallback
}: {
  getQueryAbove: (timeSpanProps: TimeSpanProps) => UseQueryResult,
  getQueryBelow: (timeSpanProps: TimeSpanProps) => UseQueryResult,
  transformPrometheusDataToSeries: (
    prometheusResultAbove: PrometheusQueryResult,
    prometheusResultBelow: PrometheusQueryResult,
  ) => Serie[],
}) => {
  const { startingTimeISO, currentTimeISO } = useStartingTimeStamp();
  const { frequency } = useMetricsTimeSpan();

  const startTimeRef = useRef(startingTimeISO);
  const chartStartTimeRef = useRef(startingTimeISO);
  const [series, setSeries] = useState([]);

  startTimeRef.current = startingTimeISO;

  const aboveQuery = useQuery(
    getQueryAbove({
      startingTimeISO,
      currentTimeISO,
      frequency,
    }),
  );

  const belowQuery = useQuery(
    getQueryBelow({
      startingTimeISO,
      currentTimeISO,
      frequency,
    }),
  );

  const isLoading = aboveQuery.isLoading || belowQuery.isLoading;

  useEffect(() => {
    if (!isLoading) {
      chartStartTimeRef.current = startTimeRef.current;
      setSeries(
        transformPrometheusDataToSeries(aboveQuery.data, belowQuery.data),
      );
    }
  }, [isLoading, transformPrometheusDataToSeries]);

  return {
    series: series || [],
    startingTimeStamp: Date.parse(chartStartTimeRef.current) / 1000,
    isLoading,
  };
};
