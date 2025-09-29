import { useCallback } from 'react';
import type { UseQueryOptions } from 'react-query';
import 'react-query';
import {
  LineTimeSerieChart,
  useMetricsTimeSpan,
} from '@scality/core-ui/dist/next';
import { getSeriesForSymmetricalChart } from '../services/graphUtils';
import { HEIGHT_SYMMETRICAL_CHART, NODE_SYNC_ID } from '../constants';
import { NodesState } from '../ducks/app/nodes';
import { useSymetricalChartSeries } from '../hooks';

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
  getMetricAboveQuery: UseQueryOptions;
  getMetricBelowQuery: UseQueryOptions;
  getMetricAboveAvgQuery: UseQueryOptions;
  getMetricBelowAvgQuery: UseQueryOptions;
  metricPrefixAbove: string;
  metricPrefixBelow: string;
  unitRange?: {
    threshold: number;
    label: string;
  }[];
  planeInterface?: string;
  isPlaneInterfaceRequired?: boolean;
}) => {
  const { interval, duration } = useMetricsTimeSpan();
  const { isLoading, series, startingTimeStamp } = useSymetricalChartSeries({
    getAboveQueries: useCallback(
      (timeSpanProps) => {
        if (showAvg) {
          return [
            // @ts-expect-error - FIXME when you are working on it
            getMetricAboveQuery(instanceIP, timeSpanProps, planeInterface),
            // @ts-expect-error - FIXME when you are working on it
            getMetricAboveAvgQuery(
              timeSpanProps,
              showAvg,
              instanceIP,
              nodesIPsInfo,
            ),
          ];
        } else {
          return [
            // @ts-expect-error - FIXME when you are working on it
            getMetricAboveQuery(instanceIP, timeSpanProps, planeInterface),
          ];
        }
      },
      [instanceIP, showAvg, planeInterface, JSON.stringify(nodesIPsInfo)],
    ),
    getBelowQueries: useCallback(
      (timeSpanProps) => {
        if (showAvg) {
          return [
            // @ts-expect-error - FIXME when you are working on it
            getMetricBelowQuery(instanceIP, timeSpanProps, planeInterface),
            // @ts-expect-error - FIXME when you are working on it
            getMetricBelowAvgQuery(
              timeSpanProps,
              showAvg,
              instanceIP,
              nodesIPsInfo,
            ),
          ];
        } else {
          return [
            // @ts-expect-error - FIXME when you are working on it
            getMetricBelowQuery(instanceIP, timeSpanProps, planeInterface),
          ];
        }
      },
      [instanceIP, showAvg, planeInterface, JSON.stringify(nodesIPsInfo)],
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

export default MetricSymmetricalChart;
