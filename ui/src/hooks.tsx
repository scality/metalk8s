import React, { useRef, useCallback } from 'react';
import { useEffect, useState, createContext } from 'react';
import { useSelector } from 'react-redux';
import { useQueries, useQuery } from 'react-query';
import type { RootState } from './ducks/reducer';
import { coreV1 } from './services/k8s/api';
import {
  REFRESH_METRICS_GRAPH,
  SAMPLE_DURATION_LAST_TWENTY_FOUR_HOURS,
  VOLUME_CONDITION_LINK,
  STATUS_NONE,
  NODES_LIMIT_QUANTILE,
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
import type { Serie } from '@scality/core-ui/dist/components/linetemporalchart/LineTemporalChart.component';
import '@scality/core-ui/dist/components/linetemporalchart/LineTemporalChart.component';
import type { UseQueryResult, UseQueryOptions } from 'react-query';
import { getNodesInterfacesString } from './services/graphUtils';
import { useAuth } from './containers/PrivateRoute';

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
): Array<{
  internalIP: string;
  name: string;
}> => {
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
  metricsTimeSpan: MetricsTimeSpan;
  setMetricsTimeSpan: MetricsTimeSpanSetter;
};
export const MetricsTimeSpanContext =
  createContext<MetricsTimeSpanContextValue | null>(null);
export const MetricsTimeSpanProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [metricsTimeSpan, setMetricsTimeSpan] = useState(
    SAMPLE_DURATION_LAST_TWENTY_FOUR_HOURS,
  );
  return (
    <MetricsTimeSpanContext.Provider
      value={{
        metricsTimeSpan,
        setMetricsTimeSpan,
      }}
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
  if (!alerts || alerts.length === 0) return [];
  const volumeListWithStatus = volumeListData.map((volume) => {
    const volumeAlerts = filterAlerts(alerts, {
      persistentvolumeclaim: volume.persistentvolumeclaim,
    });
    // For the unbound volume, the health status should be none.
    const isVolumeBound = volume.status === VOLUME_CONDITION_LINK;
    const volumeHealth = getHealthStatus(volumeAlerts);
    return { ...volume, health: isVolumeBound ? volumeHealth : STATUS_NONE };
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
  getQuery: (timeSpanProps: TimeSpanProps) => UseQueryResult;
  transformPrometheusDataToSeries: (
    prometheusResult: PrometheusQueryResult,
  ) => Serie[];
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
    if (!isLoading && query.data) {
      chartStartTimeRef.current = startTimeRef.current;
      setSeries(transformPrometheusDataToSeries(query.data));
    }
  }, [isLoading, transformPrometheusDataToSeries, JSON.stringify(query.data)]);
  return {
    series: series,
    startingTimeStamp: Date.parse(chartStartTimeRef.current) / 1000,
    isLoading,
  };
};
export const useChartSeries = ({
  getQueries,
  transformPrometheusDataToSeries, //It should be memoised using useCallback
}: {
  getQueries: (timeSpanProps: TimeSpanProps) => UseQueryOptions[];
  transformPrometheusDataToSeries: (
    prometheusResults: PrometheusQueryResult[],
  ) => Serie[];
}) => {
  const { startingTimeISO, currentTimeISO } = useStartingTimeStamp();
  const { frequency } = useMetricsTimeSpan();
  const startTimeRef = useRef(startingTimeISO);
  const chartStartTimeRef = useRef(startingTimeISO);
  const [series, setSeries] = useState([]);
  startTimeRef.current = startingTimeISO;
  const queries = useQueries(
    getQueries({
      startingTimeISO,
      currentTimeISO,
      frequency,
    }),
  );
  const isLoading = queries.find((query) => query.isLoading);
  const queriesData = queries
    .map((query) => {
      return query.data;
    })
    /* useQueries is running the requests in paralel and given that
     * in transformPrometheusDataToSeries (which is a generic function used by multiple charts)
     * we make an assumption on the order of responses
     * then we need to make sure that the average query is the second one in the array
     * That is achieved by giving a key param to the response object (e.g. 'cpuUsage' and 'cpuUsageAvg')
     * and sorting the array alphanumerically on its 'key' property
     */
    .sort((query1, query2) => (query1.key > query2.key ? 1 : -1));
  useEffect(() => {
    if (!isLoading && !queries.find((query) => !query.data)) {
      chartStartTimeRef.current = startTimeRef.current;
      setSeries(transformPrometheusDataToSeries(queriesData));
    }
  }, [isLoading, transformPrometheusDataToSeries, JSON.stringify(queriesData)]);
  return {
    series: series,
    startingTimeStamp: Date.parse(chartStartTimeRef.current) / 1000,
    isLoading,
  };
};
export const useSymetricalChartSeries = ({
  getAboveQueries,
  getBelowQueries,
  transformPrometheusDataToSeries, //It should be memoised using useCallback
}: {
  getAboveQueries: (timeSpanProps: TimeSpanProps) => UseQueryResult[];
  getBelowQueries: (timeSpanProps: TimeSpanProps) => UseQueryResult[];
  transformPrometheusDataToSeries: (
    prometheusResultAbove: PrometheusQueryResult[],
    prometheusResultBelow: PrometheusQueryResult[],
  ) => Serie[];
}) => {
  const { startingTimeISO, currentTimeISO } = useStartingTimeStamp();
  const { frequency } = useMetricsTimeSpan();
  const startTimeRef = useRef(startingTimeISO);
  const chartStartTimeRef = useRef(startingTimeISO);
  const [series, setSeries] = useState([]);
  startTimeRef.current = startingTimeISO;
  const aboveQueries = useQueries(
    getAboveQueries({
      startingTimeISO,
      currentTimeISO,
      frequency,
    }),
  );
  const belowQueries = useQueries(
    getBelowQueries({
      startingTimeISO,
      currentTimeISO,
      frequency,
    }),
  );
  const isLoading =
    aboveQueries.find((query) => query.isLoading) ||
    belowQueries.find((query) => query.isLoading);
  const queriesAboveData = aboveQueries
    .map((query) => query.data)
    /* useQueries is running the requests in paralel and given that
     * in transformPrometheusDataToSeries (which is a generic function used by multiple charts)
     * we make an assumption on the order of responses
     * then we need to make sure that the average query is the second one in the array
     * That is achieved by giving a key param to the response object (e.g. 'IOPSRead' and 'IOPSReadAvg')
     * and sorting the array alphanumerically on its 'key' property
     */
    .sort((query1, query2) => (query1.key > query2.key ? 1 : -1));
  const queriesBelowData = belowQueries
    .map((query) => query.data)
    .sort((query1, query2) => (query1.key > query2.key ? 1 : -1));
  useEffect(() => {
    if (
      !isLoading &&
      !queriesAboveData.find((data) => !data) &&
      !queriesBelowData.find((data) => !data)
    ) {
      chartStartTimeRef.current = startTimeRef.current;
      setSeries(
        transformPrometheusDataToSeries(queriesAboveData, queriesBelowData),
      );
    }
  }, [
    isLoading,
    transformPrometheusDataToSeries,
    JSON.stringify(queriesAboveData),
    JSON.stringify(queriesBelowData),
  ]);
  return {
    series: series || [],
    startingTimeStamp: Date.parse(chartStartTimeRef.current) / 1000,
    isLoading,
  };
};
export const useQuantileOnHover = ({
  getQuantileHoverQuery,
  metricPrefix,
}: {
  getQuantileHoverQuery: (
    timestamp?: string, // to be check the type
    threshold?: number,
    operator: '>' | '<',
    isOnHoverFetchingRequired: boolean,
    devices?: string,
  ) => UseQueryOptions;
  metricPrefix?: string;
}) => {
  const [hoverTimestamp, setHoverTimestamp] = useState<number>(0);
  const [threshold90, setThreshold90] = useState();
  const [threshold5, setThreshold5] = useState();
  const [median, setMedian] = useState();
  const [valueBase, setValueBase] = useState(1);
  const nodeIPsInfo = useSelector((state) => state.app.nodes.IPsInfo);
  const devices = getNodesInterfacesString(nodeIPsInfo);
  // If the median value is the same as Q90 and Q5, then onHover fetching is not needed.
  const isOnHoverFetchingNeeded =
    median !== threshold90 && median !== threshold5;
  const quantile90Result = useQuery(
    getQuantileHoverQuery(
      hoverTimestamp / 1000,
      threshold90,
      '>',
      isOnHoverFetchingNeeded,
      devices,
    ),
  );
  const quantile5Result = useQuery(
    getQuantileHoverQuery(
      hoverTimestamp / 1000,
      threshold5,
      '<',
      isOnHoverFetchingNeeded,
      devices,
    ),
  );
  const onHover = useCallback(
    (datum) => {
      if (!hoverTimestamp || datum.timestamp !== hoverTimestamp) {
        setHoverTimestamp(datum.timestamp);
        setThreshold90(
          metricPrefix
            ? Math.abs(datum.originalData[`Q90-${metricPrefix}`])
            : Math.abs(datum.originalData['Q90']),
        );
        setThreshold5(
          metricPrefix
            ? Math.abs(datum.originalData[`Q5-${metricPrefix}`])
            : Math.abs(datum.originalData['Q5']),
        );
        setMedian(
          metricPrefix
            ? Math.abs(datum.originalData[`Median-${metricPrefix}`])
            : Math.abs(datum.originalData['Median']),
        );
        setValueBase(datum.metadata.valueBase);
      }
    },
    [hoverTimestamp, metricPrefix],
  );
  return {
    quantile90Result,
    quantile5Result,
    valueBase,
    isOnHoverFetchingNeeded,
    onHover,
  };
};
export const useShowQuantileChart = (): {
  isShowQuantileChart: boolean;
} => {
  const nodes = useNodes();
  const { flags } = useTypedSelector((state) => state.config.api);
  return {
    isShowQuantileChart:
      (flags && flags.includes('force_quantile_chart')) ||
      nodes?.length > NODES_LIMIT_QUANTILE,
  };
};

export type UserRoles = {
  isUser: boolean;
  isPlatformAdmin: boolean;
  isStorageManager: boolean;
};
export const useUserRoles = (): UserRoles => {
  const auth = useAuth();
  const userRoles = auth.userData?.groups ?? [];

  return {
    isUser: userRoles.includes('user'),
    isPlatformAdmin: userRoles.includes('PlatformAdmin'),
    isStorageManager: userRoles.includes('StorageManager'),
  };
};

export type UserAccessRight = {
  canConfigureEmailNotification: boolean;
};
export const useUserAccessRight = (): UserAccessRight => {
  const { isUser, isPlatformAdmin, isStorageManager } = useUserRoles();

  return {
    canConfigureEmailNotification: isPlatformAdmin,
  };
};
