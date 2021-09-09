import React, { useRef, useEffect } from 'react';
import { useQuery, type UseQueryOptions } from 'react-query';
import {
  LineTemporalChart,
  useMetricsTimeSpan,
} from '@scality/core-ui/dist/next';
import { useStartingTimeStamp } from '../containers/StartTimeProvider';
import { getSingleResourceSerie } from '../services/graphUtils';
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
  const seriesRef = useRef();
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
    if (!isMetricDataLoading && !showAvg) {
      // single node metrics
      chartStartTimeRef.current = startTimeRef.current;
      seriesRef.current = getSingleResourceSerie(
        metricQuery.data,
        nodeIPAddress,
      );
    } else if (!isMetricAvgDataLoading && !isMetricDataLoading && showAvg) {
      // show cluster average
      chartStartTimeRef.current = startTimeRef.current;
      seriesRef.current = getSingleResourceSerie(
        metricQuery.data,
        nodeIPAddress,
        metricAvgQuery.data,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMetricDataLoading, isMetricAvgDataLoading, showAvg]);

  return (
    <LineTemporalChart
      series={seriesRef.current || []}
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
