import { useCallback } from 'react';
import type { UseQueryOptions } from 'react-query';
import 'react-query';
import {
  LineTimeSerieChart,
  useMetricsTimeSpan,
} from '@scality/core-ui/dist/next';
import { convertPrometheusResultToSerieWithAverage } from '../services/graphUtils';
import { HEIGHT_DEFAULT_CHART, NODE_SYNC_ID } from '../constants';
import { useChartSeries } from '../hooks';
import { TimeSpanProps } from '../services/platformlibrary/metrics';

const MetricChart = ({
  title,
  yAxisType,
  nodeName,
  instanceIP,
  showAvg,
  getMetricQuery,
  getMetricAvgQuery,
  unitRange,
}: {
  title: string;
  yAxisType: 'default' | 'percentage';
  nodeName: string;
  instanceIP: string;
  showAvg: boolean;
  getMetricQuery: (
    instanceIP: string,
    timeSpanProps: TimeSpanProps,
  ) => UseQueryOptions;
  getMetricAvgQuery: (
    timeSpanProps: TimeSpanProps,
    showAvg: boolean,
  ) => UseQueryOptions;
  unitRange?: {
    threshold: number;
    label: string;
  }[];
}) => {
  const { interval, duration } = useMetricsTimeSpan();
  const { isLoading, series, startingTimeStamp } = useChartSeries({
    getQueries: useCallback(
      (timeSpanProps) => {
        if (showAvg) {
          return [
            getMetricQuery(instanceIP, timeSpanProps),
            getMetricAvgQuery(timeSpanProps, showAvg),
          ];
        } else {
          return [getMetricQuery(instanceIP, timeSpanProps)];
        }
      },
      [instanceIP, showAvg, getMetricQuery, getMetricAvgQuery],
    ),
    transformPrometheusDataToSeries: useCallback(
      ([result, resultAvg]) => {
        if (showAvg) {
          return convertPrometheusResultToSerieWithAverage(
            result,
            nodeName,
            resultAvg,
          );
        } else {
          return convertPrometheusResultToSerieWithAverage(result, nodeName);
        }
      },
      [nodeName, showAvg],
    ),
  });
  return (
    <LineTimeSerieChart
      series={series}
      height={HEIGHT_DEFAULT_CHART}
      interval={interval}
      duration={duration}
      title={title}
      startingTimeStamp={startingTimeStamp}
      yAxisType={yAxisType}
      isLoading={isLoading}
      unitRange={unitRange}
      syncId={NODE_SYNC_ID}
    />
  );
};

export default MetricChart;
