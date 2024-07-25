import type { V1NodeList } from '@kubernetes/client-node';
import type { Serie } from '@scality/core-ui/dist/components/linetemporalchart/LineTemporalChart.component';
import { useMetricsTimeSpan } from '@scality/core-ui/dist/next';
import React, {
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { UseQueryOptions, UseQueryResult } from 'react-query';
import { useQueries, useQuery } from 'react-query';
import { useSelector } from 'react-redux';
import {
  NODES_LIMIT_QUANTILE,
  REFRESH_METRICS_GRAPH,
  SAMPLE_DURATION_LAST_TWENTY_FOUR_HOURS,
  STATUS_NONE,
  VOLUME_CONDITION_LINK,
} from './constants';
import { useAlerts } from './containers/AlertProvider';
import { useAuth } from './containers/PrivateRoute';
import { useStartingTimeStamp } from './containers/StartTimeProvider';
import type { RootState } from './ducks/reducer';
import { getVolumeListData } from './services/NodeVolumesUtils';
import { filterAlerts, getHealthStatus } from './services/alertUtils';
import { getNodesInterfacesString } from './services/graphUtils';
import { useK8sApiConfig } from './services/k8s/api';
import type { TimeSpanProps } from './services/platformlibrary/metrics';
import type { PrometheusQueryResult } from './services/prometheus/api';
import { compareHealth } from './services/utils';

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
  const { coreV1 } = useK8sApiConfig();
  const { getToken } = useAuth();
  const nodesQuery = useQuery(
    'nodesNames',
    async () => {
      coreV1.setDefaultAuthentication({
        applyToRequest: async (req) => {
          req.headers.authorization = `Bearer ${await getToken()}`;
        },
      });

      return coreV1.listNode().then((res) => {
        if (res.response.statusCode === 200 && res.body?.items) {
          return res.body?.items;
        }

        return [];
      });
    },
    {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchInterval: REFRESH_METRICS_GRAPH,
    },
  );
  // @ts-expect-error - FIXME when you are working on it
  return nodesQuery.data || [];
};
export const useNodeAddressesSelector = (
  nodes: V1NodeList,
): Array<{
  internalIP: string;
  name: string;
}> => {
  // @ts-expect-error - FIXME when you are working on it
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
  // @ts-expect-error - FIXME when you are working on it
  const { alerts } = useAlerts();
  const volumeListData = useTypedSelector((state) =>
    // @ts-expect-error - FIXME when you are working on it
    getVolumeListData(state, null, nodeName),
  );
  //This forces alerts to have been fetched at least once (watchdog alert should be present)
  // before rendering volume list
  // TODO enhance this using useAlerts status
  if (!alerts || alerts.length === 0) return [];
  // @ts-expect-error - FIXME when you are working on it
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
    // @ts-expect-error - FIXME when you are working on it
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
      // @ts-expect-error - FIXME when you are working on it
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
    // @ts-expect-error - FIXME when you are working on it
    .sort((query1, query2) => (query1.key > query2.key ? 1 : -1));
  useEffect(() => {
    if (!isLoading && !queries.find((query) => !query.data)) {
      chartStartTimeRef.current = startTimeRef.current;
      // @ts-expect-error - FIXME when you are working on it
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
    // @ts-expect-error - FIXME when you are working on it
    getAboveQueries({
      startingTimeISO,
      currentTimeISO,
      frequency,
    }),
  );
  const belowQueries = useQueries(
    // @ts-expect-error - FIXME when you are working on it
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
    // @ts-expect-error - FIXME when you are working on it
    .sort((query1, query2) => (query1.key > query2.key ? 1 : -1));
  const queriesBelowData = belowQueries
    .map((query) => query.data)
    // @ts-expect-error - FIXME when you are working on it
    .sort((query1, query2) => (query1.key > query2.key ? 1 : -1));
  useEffect(() => {
    if (
      !isLoading &&
      !queriesAboveData.find((data) => !data) &&
      !queriesBelowData.find((data) => !data)
    ) {
      chartStartTimeRef.current = startTimeRef.current;
      setSeries(
        // @ts-expect-error - FIXME when you are working on it
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
    // @ts-expect-error - FIXME when you are working on it
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
  // @ts-expect-error - FIXME when you are working on it
  const nodeIPsInfo = useSelector((state) => state.app.nodes.IPsInfo);
  const devices = getNodesInterfacesString(nodeIPsInfo);
  // If the median value is the same as Q90 and Q5, then onHover fetching is not needed.
  const isOnHoverFetchingNeeded =
    median !== threshold90 && median !== threshold5;
  const quantile90Result = useQuery(
    getQuantileHoverQuery(
      // @ts-expect-error - FIXME when you are working on it
      hoverTimestamp / 1000,
      threshold90,
      '>',
      isOnHoverFetchingNeeded,
      devices,
    ),
  );
  const quantile5Result = useQuery(
    getQuantileHoverQuery(
      // @ts-expect-error - FIXME when you are working on it
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
          // @ts-expect-error - FIXME when you are working on it
          metricPrefix
            ? Math.abs(datum.originalData[`Q90-${metricPrefix}`])
            : Math.abs(datum.originalData['Q90']),
        );
        setThreshold5(
          // @ts-expect-error - FIXME when you are working on it
          metricPrefix
            ? Math.abs(datum.originalData[`Q5-${metricPrefix}`])
            : Math.abs(datum.originalData['Q5']),
        );
        setMedian(
          // @ts-expect-error - FIXME when you are working on it
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
      // @ts-expect-error - FIXME when you are working on it
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
  const { isPlatformAdmin } = useUserRoles();

  return {
    canConfigureEmailNotification: isPlatformAdmin,
  };
};
