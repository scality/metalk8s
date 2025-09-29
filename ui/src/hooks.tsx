import type { V1Node } from '@kubernetes/client-node';

import type { Serie } from '@scality/core-ui/dist/components/linetimeseriechart/linetimeseriechart.component';
import { useMetricsTimeSpan } from '@scality/core-ui/dist/next';
import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { UseQueryOptions, UseQueryResult } from 'react-query';
import { useQueries, useQuery } from 'react-query';
import { useSelector } from 'react-redux';
import {
  CHART_COLOR_VALUES,
  NODES_LIMIT_QUANTILE,
  REFRESH_METRICS_GRAPH,
  SAMPLE_DURATION_LAST_TWENTY_FOUR_HOURS,
  STATUS_NONE,
  TESTING_MULTIPLY_NODES,
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
export const useNodes = (): V1Node[] => {
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
          const realNodes = res.body?.items;

          // FOR TESTING: Multiply nodes to simulate larger cluster for quantile testing
          if (
            process.env.NODE_ENV === 'development' &&
            TESTING_MULTIPLY_NODES > 1
          ) {
            const expandedNodes = [];

            for (
              let multiplier = 0;
              multiplier < TESTING_MULTIPLY_NODES;
              multiplier++
            ) {
              realNodes.forEach((node, index) => {
                const clonedNode = JSON.parse(JSON.stringify(node)); // Deep clone

                if (multiplier > 0) {
                  // Modify name for clones
                  clonedNode.metadata.name = `${node.metadata.name}-test-${multiplier}`;

                  // Modify internal IP for clones to create unique instances
                  if (clonedNode.status?.addresses) {
                    clonedNode.status.addresses.forEach((addr) => {
                      if (addr.type === 'InternalIP') {
                        const parts = addr.address.split('.');
                        // Increment last octet, wrapping if needed
                        const lastOctet =
                          parseInt(parts[3]) + multiplier * 10 + index;
                        parts[3] = (lastOctet % 255).toString();
                        addr.address = parts.join('.');
                      }
                    });
                  }
                }

                expandedNodes.push(clonedNode);
              });
            }

            console.log(
              `🧪 TESTING: Expanded ${realNodes.length} real nodes to ${expandedNodes.length} nodes for quantile testing`,
            );
            return expandedNodes;
          }

          return realNodes;
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
  return nodesQuery.data || [];
};
export const useNodeAddressesSelector = (
  nodes: V1Node[],
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
  const { interval } = useMetricsTimeSpan();
  const startTimeRef = useRef(startingTimeISO);
  const chartStartTimeRef = useRef(startingTimeISO);
  const [series, setSeries] = useState<Serie[]>([]);

  startTimeRef.current = startingTimeISO;
  const query = useQuery(
    // @ts-expect-error - FIXME when you are working on it
    getQuery({
      startingTimeISO,
      currentTimeISO,
      frequency: interval,
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
  const { interval } = useMetricsTimeSpan();
  const startTimeRef = useRef(startingTimeISO);
  const chartStartTimeRef = useRef(startingTimeISO);
  const [series, setSeries] = useState<Serie[]>([]);

  startTimeRef.current = startingTimeISO;
  const queries = useQueries(
    getQueries({
      startingTimeISO,
      currentTimeISO,
      frequency: interval,
    }),
  );
  const isLoading = queries.some((query) => query.isLoading);
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
  ) => {
    above: Serie[];
    below: Serie[];
  };
}) => {
  const { startingTimeISO, currentTimeISO } = useStartingTimeStamp();
  const { interval } = useMetricsTimeSpan();
  const startTimeRef = useRef(startingTimeISO);
  const chartStartTimeRef = useRef(startingTimeISO);
  const [series, setSeries] = useState<{
    above: Serie[];
    below: Serie[];
  }>({ above: [], below: [] });

  startTimeRef.current = startingTimeISO;
  const aboveQueries = useQueries(
    // @ts-expect-error - FIXME when you are working on it
    getAboveQueries({
      startingTimeISO,
      currentTimeISO,
      frequency: interval,
    }),
  );

  const belowQueries = useQueries(
    // @ts-expect-error - FIXME when you are working on it
    getBelowQueries({
      startingTimeISO,
      currentTimeISO,
      frequency: interval,
    }),
  );

  const isLoading =
    aboveQueries.some((query) => query.isLoading || query.isIdle) ||
    belowQueries.some((query) => query.isLoading || query.isIdle);

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
    series: series || { above: [], below: [] },
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
    operator?: '>' | '<',
    isOnHoverFetchingRequired?: boolean,
    devices?: string,
  ) => UseQueryOptions;
  metricPrefix?: string;
}) => {
  const [hoverTimestamp, setHoverTimestamp] = useState<number>(0);
  const [threshold90, setThreshold90] = useState<number>();
  const [threshold5, setThreshold5] = useState<number>();
  const [median, setMedian] = useState<number>();
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
    isShowQuantileChart: true, // TODO: remove this after fixing the quantile chart
    // (flags && flags.includes('force_quantile_chart')) ||
    // nodes.length > NODES_LIMIT_QUANTILE,
  };
};

// Chart color hooks

/**
 * Hook to create dynamic color mapping for chart series
 * @param items - Array of items that need color mapping
 * @param getKey - Function to extract the key from each item (defaults to item => item)
 * @returns Record mapping each key to a color
 */
export const useChartColors = function <T>(
  items: T[],
  getKey: (item: T) => string = (item) => String(item),
): Record<string, string> {
  return useMemo(() => {
    const colorMapping: Record<string, string> = {};

    items.forEach((item, index) => {
      const key = getKey(item);
      // Cycle through available colors
      const colorIndex = index % CHART_COLOR_VALUES.length;
      colorMapping[key] = CHART_COLOR_VALUES[colorIndex];
    });

    return colorMapping;
  }, [items, getKey]);
};

/**
 * Hook specifically for node color mapping
 * @param nodes - Array of node objects with metadata containing optional name
 * @returns Record mapping each node name to a color
 */
export const useNodeColors = (
  nodes: Array<{ metadata?: { name?: string } }>,
): Record<string, string> => {
  return useChartColors(
    nodes.filter((node) => node.metadata?.name),
    (node) => node.metadata!.name!,
  );
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
