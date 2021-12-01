import React, { useRef, useEffect, useState } from 'react';
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
  const [series, setSeries] = useState([]);

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
    if (!planeInterface) {
      setSeries([]);
    } else if (
      !isMetricsDataLoading &&
      !showAvg &&
      //solve the graph doesn't get updated
      metricAboveQuery.data &&
      metricBelowQuery.data
    ) {
      // disable avg
      chartStartTimeRef.current = startTimeRef.current;
      setSeries(
        getSeriesForSymmetricalChart(
          metricAboveQuery.data,
          metricBelowQuery.data,
          nodeIPAddress.name,
          metricPrefixAbove,
          metricPrefixBelow,
        ),
      );
    } else if (
      !isMetricsAvgDataLoading &&
      !isMetricsDataLoading &&
      showAvg &&
      metricAboveQuery.data &&
      metricBelowQuery.data &&
      metricAboveAvgQuery.data &&
      metricBelowAvgQuery.data
    ) {
      // enable cluster avg
      chartStartTimeRef.current = startTimeRef.current;
      setSeries(
        getSeriesForSymmetricalChart(
          metricAboveQuery.data,
          metricBelowQuery.data,
          nodeIPAddress.name,
          metricPrefixAbove,
          metricPrefixBelow,
          metricAboveAvgQuery.data,
          metricBelowAvgQuery.data,
        ),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isMetricsDataLoading,
    isMetricsAvgDataLoading,
    showAvg,
    //solve the graph doesn't get updated
    JSON.stringify(metricAboveQuery.data),
    JSON.stringify(metricBelowQuery.data),
    JSON.stringify(metricAboveAvgQuery.data),
    JSON.stringify(metricBelowAvgQuery.data),
  ]);

  return (
    <LineTemporalChart
      series={series}
      height={HEIGHT_SYMMETRICAL_CHART}
      title={title}
      startingTimeStamp={Date.parse(chartStartTimeRef.current) / 1000}
      yAxisType={'symmetrical'}
      yAxisTitle={yAxisTitle}
      isLoading={showAvg ? isMetricsAvgDataLoading : isMetricsDataLoading}
      isLegendHidden={false}
      unitRange={unitRange}
    />
  );
};

export default MetricSymmetricalChart;
