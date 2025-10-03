import React, { useCallback, useMemo } from 'react';
import type { UseQueryOptions } from 'react-query';
import 'react-query';
import {
  LineTimeSerieChart,
  useChartId,
  useMetricsTimeSpan,
} from '@scality/core-ui/dist/next';
import { convertPrometheusResultToSerieWithAverage } from '../services/graphUtils';
import {
  CLUSTER_AVERAGE,
  HEIGHT_DEFAULT_CHART,
  NODE_SYNC_ID,
} from '../constants';
import { useChartSeries } from '../hooks';
import { TimeSpanProps } from '../services/platformlibrary/metrics';
import { useChartLegendRegistration } from '../hooks/useChartLegendRegistration';

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
  console.log(
    'DEBUG MetricChart',
    title,
    yAxisType,
    nodeName,
    instanceIP,
    showAvg,
  );
  const chartId = useChartId();
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
  const additionalNames = useMemo(
    () => (showAvg ? [CLUSTER_AVERAGE] : []),
    [showAvg],
  );
  useChartLegendRegistration({
    chartId,
    series,
    isSymmetrical: false,
    additionalNames,
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

export default React.memo(MetricChart);
