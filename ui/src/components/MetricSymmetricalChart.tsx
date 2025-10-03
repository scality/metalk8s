import React, { useCallback, useMemo } from 'react';
import type { UseQueryOptions } from 'react-query';
import 'react-query';
import {
  LineTimeSerieChart,
  useChartId,
  useMetricsTimeSpan,
} from '@scality/core-ui/dist/next';
import { getSeriesForSymmetricalChart } from '../services/graphUtils';
import {
  CLUSTER_AVERAGE,
  HEIGHT_SYMMETRICAL_CHART,
  NODE_SYNC_ID,
} from '../constants';
import { NodesState } from '../ducks/app/nodes';
import { useSymetricalChartSeries } from '../hooks';
import { TimeSpanProps } from '../services/platformlibrary/metrics';
import { useChartLegendRegistration } from '../hooks/useChartLegendRegistration';

const MetricSymmetricalChart = ({
  title,
  yAxisTitle,
  nodeName,
  instanceIP,
  showAvg,
  nodesIPsInfo,
  getMetricAboveQuery,
  getMetricBelowQuery,
  getMetricAboveAvgQuery,
  getMetricBelowAvgQuery,
  metricPrefixAbove,
  metricPrefixBelow,
  unitRange,
  planeInterface,
  isPlaneInterfaceRequired,
}: {
  title: string;
  yAxisTitle: string;
  nodeName: string;
  instanceIP: string;
  showAvg: boolean;
  nodesIPsInfo: NodesState['IPsInfo'];
  getMetricAboveQuery: (
    instanceIP: string,
    timeSpanProps: TimeSpanProps,
    planeInterface: string,
  ) => UseQueryOptions;
  getMetricBelowQuery: (
    instanceIP: string,
    timeSpanProps: TimeSpanProps,
    planeInterface: string,
  ) => UseQueryOptions;
  getMetricAboveAvgQuery: (
    timeSpanProps: TimeSpanProps,
    showAvg: boolean,
    instanceIP: string,
    nodesIPsInfo: NodesState['IPsInfo'],
  ) => UseQueryOptions;
  getMetricBelowAvgQuery: (
    timeSpanProps: TimeSpanProps,
    showAvg: boolean,
    instanceIP: string,
    nodesIPsInfo: NodesState['IPsInfo'],
  ) => UseQueryOptions;
  metricPrefixAbove: string;
  metricPrefixBelow: string;
  unitRange?: {
    threshold: number;
    label: string;
  }[];
  planeInterface?: string;
  isPlaneInterfaceRequired?: boolean;
}) => {
  const chartId = useChartId();
  const { interval, duration } = useMetricsTimeSpan();
  const { isLoading, series, startingTimeStamp } = useSymetricalChartSeries({
    getAboveQueries: useCallback(
      (timeSpanProps) => {
        if (showAvg) {
          return [
            getMetricAboveQuery(instanceIP, timeSpanProps, planeInterface),

            getMetricAboveAvgQuery(
              timeSpanProps,
              showAvg,
              instanceIP,
              nodesIPsInfo,
            ),
          ];
        } else {
          return [
            getMetricAboveQuery(instanceIP, timeSpanProps, planeInterface),
          ];
        }
      },
      [
        instanceIP,
        showAvg,
        planeInterface,
        nodesIPsInfo,
        getMetricAboveQuery,
        getMetricAboveAvgQuery,
      ],
    ),
    getBelowQueries: useCallback(
      (timeSpanProps) => {
        if (showAvg) {
          return [
            getMetricBelowQuery(instanceIP, timeSpanProps, planeInterface),

            getMetricBelowAvgQuery(
              timeSpanProps,
              showAvg,
              instanceIP,
              nodesIPsInfo,
            ),
          ];
        } else {
          return [
            getMetricBelowQuery(instanceIP, timeSpanProps, planeInterface),
          ];
        }
      },
      [
        instanceIP,
        showAvg,
        planeInterface,
        nodesIPsInfo,
        getMetricBelowQuery,
        getMetricBelowAvgQuery,
      ],
    ),
    transformPrometheusDataToSeries: useCallback(
      (resultsAbove, resultsBelow) => {
        let allSeries;
        if (showAvg) {
          const [resultAbove, resultAboveAvg] = resultsAbove;
          const [resultBelow, resultBelowAvg] = resultsBelow;
          allSeries = getSeriesForSymmetricalChart(
            resultAbove,
            resultBelow,
            nodeName,
            metricPrefixAbove,
            metricPrefixBelow,
            resultAboveAvg,
            resultBelowAvg,
          );
        } else {
          const [resultAbove] = resultsAbove;
          const [resultBelow] = resultsBelow;
          allSeries = getSeriesForSymmetricalChart(
            resultAbove,
            resultBelow,
            nodeName,
            metricPrefixAbove,
            metricPrefixBelow,
          );
        }
        return allSeries;
      },
      [showAvg, nodeName, metricPrefixAbove, metricPrefixBelow],
    ),
  });
  const additionalNames = useMemo(
    () => (showAvg ? [CLUSTER_AVERAGE] : []),
    [showAvg],
  );
  useChartLegendRegistration({
    chartId,
    series,
    isSymmetrical: true,
    additionalNames,
  });
  return (
    <LineTimeSerieChart
      series={{
        above: series.above,
        below: series.below,
      }}
      height={HEIGHT_SYMMETRICAL_CHART}
      interval={interval}
      duration={duration}
      title={title}
      startingTimeStamp={startingTimeStamp}
      yAxisType={'symmetrical'}
      yAxisTitle={yAxisTitle}
      isLoading={isLoading}
      unitRange={unitRange}
      syncId={NODE_SYNC_ID}
    />
  );
};

export default React.memo(MetricSymmetricalChart);
