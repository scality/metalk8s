import React, { useRef, useEffect, useState } from 'react';
import { useQuery, type UseQueryOptions } from 'react-query';
import {
  LineTemporalChart,
  useMetricsTimeSpan,
} from '@scality/core-ui/dist/next';
import { useStartingTimeStamp } from '../containers/StartTimeProvider';
import { convertPrometheusResultToSerieWithAverage } from '../services/graphUtils';
import { HEIGHT_DEFAULT_CHART } from '../constants';

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
  const { startingTimeISO, currentTimeISO } = useStartingTimeStamp();
  const { frequency } = useMetricsTimeSpan();

  const startTimeRef = useRef(startingTimeISO);
  const chartStartTimeRef = useRef(startingTimeISO); //IMPORTANT: the ref of the previous start time
  const [series, setSeries] = useState([]);

  startTimeRef.current = startingTimeISO;

  const metricQuery = useQuery(
    getMetricQuery(instanceIP, {
      startingTimeISO,
      currentTimeISO,
      frequency,
    }),
  );

  const metricAvgQuery = useQuery(
    getMetricAvgQuery(
      {
        startingTimeISO,
        currentTimeISO,
        frequency,
      },
      showAvg,
    ),
  );

  const nodeIPAddress = { internalIP: instanceIP, name: nodeName };

  const isMetricDataLoading = metricQuery.isLoading;
  const isMetricAvgDataLoading = metricAvgQuery.isLoading;

  useEffect(() => {
    if (!isMetricDataLoading && !showAvg && metricQuery.data) {
      // single node metrics
      chartStartTimeRef.current = startTimeRef.current;
      setSeries(
        convertPrometheusResultToSerieWithAverage(
          metricQuery.data,
          nodeIPAddress.name,
        ),
      );
    } else if (
      !isMetricAvgDataLoading &&
      !isMetricDataLoading &&
      showAvg &&
      metricQuery.data &&
      metricAvgQuery.data
    ) {
      // show cluster average
      chartStartTimeRef.current = startTimeRef.current;
      setSeries(
        convertPrometheusResultToSerieWithAverage(
          metricQuery.data,
          nodeIPAddress.name,
          metricAvgQuery.data,
        ),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isMetricDataLoading,
    isMetricAvgDataLoading,
    showAvg,
    JSON.stringify(metricQuery.data),
    JSON.stringify(metricAvgQuery.data),
  ]);

  return (
    <LineTemporalChart
      series={series}
      height={HEIGHT_DEFAULT_CHART}
      title={title}
      startingTimeStamp={Date.parse(chartStartTimeRef.current) / 1000}
      yAxisType={yAxisType}
      isLoading={
        showAvg
          ? isMetricAvgDataLoading && isMetricDataLoading
          : isMetricDataLoading
      }
      unitRange={unitRange}
    />
  );
};

export default MetricChart;
