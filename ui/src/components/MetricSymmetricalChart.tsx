import { useCallback } from 'react';
import type { UseQueryOptions } from 'react-query';
import 'react-query';
import { LineTemporalChart } from '@scality/core-ui/dist/next';
import { getSeriesForSymmetricalChart } from '../services/graphUtils';
import { HEIGHT_SYMMETRICAL_CHART } from '../constants';
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
        if (showAvg) {
          const [resultAbove, resultAboveAvg] = resultsAbove;
          const [resultBelow, resultBelowAvg] = resultsBelow;
          return getSeriesForSymmetricalChart(
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
          return getSeriesForSymmetricalChart(
            resultAbove,
            resultBelow,
            nodeName,
            metricPrefixAbove,
            metricPrefixBelow,
          );
        }
      },
      [showAvg, nodeName, metricPrefixAbove, metricPrefixBelow],
    ),
  });
  return (
    <LineTemporalChart
      series={series}
      height={HEIGHT_SYMMETRICAL_CHART}
      title={title}
      startingTimeStamp={startingTimeStamp}
      yAxisType={'symmetrical'}
      yAxisTitle={yAxisTitle}
      // @ts-expect-error - FIXME when you are working on it
      isLoading={isLoading}
      isLegendHidden={false}
      unitRange={unitRange}
    />
  );
};

export default MetricSymmetricalChart;
