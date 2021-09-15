import React, { useRef, useEffect } from 'react';
import { useQuery, type UseQueryOptions } from 'react-query';
import {
  LineTemporalChart,
  useMetricsTimeSpan,
} from '@scality/core-ui/dist/next';
import { useStartingTimeStamp } from '../containers/StartTimeProvider';
import { getSeriesForSymmetricalChart } from '../services/graphUtils';
import { HEIGHT_SYMMETRICAL_CHART } from '../constants';
import type { NodesState } from '../ducks/app/nodes';

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
}: {
  title: string,
  yAxisTitle: string,
  nodeName: string,
  instanceIP: string,
  showAvg: boolean,
  nodesIPsInfo: $PropertyType<NodesState, 'IPsInfo'>,
  getMetricAboveQuery: UseQueryOptions,
  getMetricBelowQuery: UseQueryOptions,
  getMetricAboveAvgQuery: UseQueryOptions,
  getMetricBelowAvgQuery: UseQueryOptions,
  metricPrefixAbove: string,
  metricPrefixBelow: string,
  unitRange?: { threshold: number, label: string }[],
  planeInterface?: string,
}) => {
  const { startingTimeISO, currentTimeISO } = useStartingTimeStamp();
  const { frequency } = useMetricsTimeSpan();

  const startTimeRef = useRef(startingTimeISO);
  const chartStartTimeRef = useRef(startingTimeISO);
  const seriesRef = useRef();

  startTimeRef.current = startingTimeISO;

  const metricAboveQuery = useQuery(
    getMetricAboveQuery(
      instanceIP,
      {
        startingTimeISO,
        currentTimeISO,
        frequency,
      },
      planeInterface,
    ),
  );
  const metricBelowQuery = useQuery(
    getMetricBelowQuery(
      instanceIP,
      {
        startingTimeISO,
        currentTimeISO,
        frequency,
      },
      planeInterface,
    ),
  );

  const metricAboveAvgQuery = useQuery(
    getMetricAboveAvgQuery(
      {
        startingTimeISO,
        currentTimeISO,
        frequency,
      },
      showAvg,
      instanceIP,
      nodesIPsInfo,
    ),
  );

  const metricBelowAvgQuery = useQuery(
    getMetricBelowAvgQuery(
      {
        startingTimeISO,
        currentTimeISO,
        frequency,
      },
      showAvg,
      instanceIP,
      nodesIPsInfo,
    ),
  );

  const nodeIPAddress = { internalIP: instanceIP, name: nodeName };

  const isMetricsDataLoading =
    metricAboveQuery.isLoading || metricBelowQuery.isLoading;
  const isMetricsAvgDataLoading =
    metricAboveQuery.isLoading ||
    metricBelowQuery.isLoading ||
    metricAboveAvgQuery.isLoading ||
    metricBelowAvgQuery.isLoading;

  useEffect(() => {
    if (!isMetricsDataLoading && !showAvg) {
      // disable avg
      chartStartTimeRef.current = startTimeRef.current;
      seriesRef.current = getSeriesForSymmetricalChart(
        metricAboveQuery.data,
        metricBelowQuery.data,
        nodeIPAddress.name,
        metricPrefixAbove,
        metricPrefixBelow,
      );
    } else if (!isMetricsAvgDataLoading && !isMetricsDataLoading && showAvg) {
      // enable cluster avg
      chartStartTimeRef.current = startTimeRef.current;
      seriesRef.current = getSeriesForSymmetricalChart(
        metricAboveQuery.data,
        metricBelowQuery.data,
        nodeIPAddress.name,
        metricPrefixAbove,
        metricPrefixBelow,
        metricAboveAvgQuery.data,
        metricBelowAvgQuery.data,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMetricsDataLoading, isMetricsAvgDataLoading, showAvg]);

  return (
    <LineTemporalChart
      series={seriesRef.current || []}
      height={HEIGHT_SYMMETRICAL_CHART}
      title={title}
      startingTimeStamp={Date.parse(chartStartTimeRef.current) / 1000}
      yAxisType={'symmetrical'}
      yAxisTitle={yAxisTitle}
      isLoading={showAvg ? isMetricsAvgDataLoading : isMetricsDataLoading}
      isLegendHided={false}
      unitRange={unitRange}
    />
  );
};

export default MetricSymmetricalChart;
