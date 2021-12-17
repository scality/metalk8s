import { useCallback } from 'react';
import { type UseQueryOptions } from 'react-query';
import { LineTemporalChart } from '@scality/core-ui/dist/next';
import { convertPrometheusResultToSerieWithAverage } from '../services/graphUtils';
import { HEIGHT_DEFAULT_CHART } from '../constants';
import { useChartSeries } from '../hooks';

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
  title: string,
  yAxisType: 'default' | 'percentage',
  nodeName: string,
  instanceIP: string,
  showAvg: boolean,
  getMetricQuery: UseQueryOptions,
  getMetricAvgQuery: UseQueryOptions,
  unitRange?: { threshold: number, label: string }[],
}) => {
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
      [instanceIP, showAvg],
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
    <LineTemporalChart
      series={series}
      height={HEIGHT_DEFAULT_CHART}
      title={title}
      startingTimeStamp={startingTimeStamp}
      yAxisType={yAxisType}
      isLoading={isLoading}
      unitRange={unitRange}
    />
  );
};

export default MetricChart;
