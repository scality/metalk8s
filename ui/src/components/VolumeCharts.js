import React, { useRef, useEffect } from 'react';
import { useQuery } from 'react-query';
import {
  LineTemporalChart,
  useMetricsTimeSpan,
} from '@scality/core-ui/dist/next';
import { useStartingTimeStamp } from '../containers/StartTimeProvider';
import {
  getSeriesForSymmetricalChart,
  getSingleResourceSerie,
} from '../services/graphUtils';
import {
  getVolumeIOPSReadQuery,
  getVolumeIOPSWriteQuery,
  getVolumeLatencyReadQuery,
  getVolumeLatencyWriteQuery,
  getVolumeThroughputReadQuery,
  getVolumeThroughputWriteQuery,
  getVolumeUsageQuery,
} from '../services/platformlibrary/metrics';
import type { UseQueryResult } from 'react-query';
import type { TimeSpanProps } from '../services/platformlibrary/metrics';
import {
  UNIT_RANGE_BS,
  YAXIS_TITLE_READ_WRITE,
} from '@scality/core-ui/dist/components/linetemporalchart/LineTemporalChart.component';

const useSingleChartSerie = ({
  getQuery,
  resourceName,
}: {
  getQuery: (timeSpanProps: TimeSpanProps) => UseQueryResult,
  resourceName: string,
}) => {
  const { startingTimeISO, currentTimeISO } = useStartingTimeStamp();
  const { frequency } = useMetricsTimeSpan();

  const startTimeRef = useRef(startingTimeISO);
  const chartStartTimeRef = useRef(startingTimeISO);
  const seriesRef = useRef();

  startTimeRef.current = startingTimeISO;

  const query = useQuery(
    getQuery({
      startingTimeISO,
      currentTimeISO,
      frequency,
    }),
  );

  const isLoading = query.isLoading;

  useEffect(() => {
    if (!isLoading) {
      chartStartTimeRef.current = startTimeRef.current;
      seriesRef.current = getSingleResourceSerie(query.data, resourceName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, resourceName]);

  return {
    series: seriesRef.current || [],
    startingTimeStamp: Date.parse(chartStartTimeRef.current) / 1000,
    isLoading,
  };
};

const useSymetricalChartSeries = ({
  getQueryAbove,
  getQueryBelow,
  aboveQueryPrefix,
  belowQueryPrefix,
  resourceName,
}: {
  getQueryAbove: (timeSpanProps: TimeSpanProps) => UseQueryResult,
  getQueryBelow: (timeSpanProps: TimeSpanProps) => UseQueryResult,
  resourceName: string,
  aboveQueryPrefix: string,
  belowQueryPrefix: string,
}) => {
  const { startingTimeISO, currentTimeISO } = useStartingTimeStamp();
  const { frequency } = useMetricsTimeSpan();

  const startTimeRef = useRef(startingTimeISO);
  const chartStartTimeRef = useRef(startingTimeISO);
  const seriesRef = useRef();

  startTimeRef.current = startingTimeISO;

  const aboveQuery = useQuery(
    getQueryAbove({
      startingTimeISO,
      currentTimeISO,
      frequency,
    }),
  );

  const belowQuery = useQuery(
    getQueryBelow({
      startingTimeISO,
      currentTimeISO,
      frequency,
    }),
  );

  const isLoading = aboveQuery.isLoading || belowQuery.isLoading;

  useEffect(() => {
    if (!isLoading) {
      chartStartTimeRef.current = startTimeRef.current;
      seriesRef.current = getSeriesForSymmetricalChart(
        belowQuery.data,
        aboveQuery.data,
        resourceName,
        aboveQueryPrefix,
        belowQueryPrefix,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, resourceName]);

  return {
    series: seriesRef.current || [],
    startingTimeStamp: Date.parse(chartStartTimeRef.current) / 1000,
    isLoading,
  };
};

export const VolumeThroughputChart = ({
  instanceIp,
  deviceName,
  volumeName,
}: {
  instanceIp: string,
  deviceName: string,
  volumeName: string,
}) => {
  const { series, startingTimeStamp, isLoading } = useSymetricalChartSeries({
    getQueryAbove: (timeSpanProps: TimeSpanProps) =>
      getVolumeThroughputWriteQuery(instanceIp, deviceName, timeSpanProps),
    getQueryBelow: (timeSpanProps: TimeSpanProps) =>
      getVolumeThroughputReadQuery(instanceIp, deviceName, timeSpanProps),
    aboveQueryPrefix: 'write',
    belowQueryPrefix: 'read',
    resourceName: volumeName,
  });

  return (
    <LineTemporalChart
      series={series}
      height={160}
      title="Disk Throughput"
      startingTimeStamp={startingTimeStamp}
      yAxisType={'symmetrical'}
      yAxisTitle={YAXIS_TITLE_READ_WRITE}
      unitRange={UNIT_RANGE_BS}
      isLoading={isLoading}
      isLegendHided={false}
    />
  );
};

export const VolumeLatencyChart = ({
  instanceIp,
  deviceName,
  volumeName,
}: {
  instanceIp: string,
  deviceName: string,
  volumeName: string,
}) => {
  const { series, startingTimeStamp, isLoading } = useSymetricalChartSeries({
    getQueryAbove: (timeSpanProps: TimeSpanProps) =>
      getVolumeLatencyWriteQuery(instanceIp, deviceName, timeSpanProps),
    getQueryBelow: (timeSpanProps: TimeSpanProps) =>
      getVolumeLatencyReadQuery(instanceIp, deviceName, timeSpanProps),
    aboveQueryPrefix: 'write',
    belowQueryPrefix: 'read',
    resourceName: volumeName,
  });

  return (
    <LineTemporalChart
      series={series}
      height={160}
      title="Disk Latency"
      startingTimeStamp={startingTimeStamp}
      yAxisType={'symmetrical'}
      yAxisTitle={YAXIS_TITLE_READ_WRITE}
      unitRange={[
        { threshold: 0, label: 'µs' },
        { threshold: 1000, label: 'ms' },
        { threshold: 1000 * 1000, label: 's' },
        { threshold: 60 * 1000 * 1000, label: 'm' },
      ]}
      isLoading={isLoading}
      isLegendHided={false}
    />
  );
};

export const VolumeIOPSChart = ({
  instanceIp,
  deviceName,
  volumeName,
}: {
  instanceIp: string,
  deviceName: string,
  volumeName: string,
}) => {
  const { series, startingTimeStamp, isLoading } = useSymetricalChartSeries({
    getQueryAbove: (timeSpanProps: TimeSpanProps) =>
      getVolumeIOPSWriteQuery(instanceIp, deviceName, timeSpanProps),
    getQueryBelow: (timeSpanProps: TimeSpanProps) =>
      getVolumeIOPSReadQuery(instanceIp, deviceName, timeSpanProps),
    aboveQueryPrefix: 'write',
    belowQueryPrefix: 'read',
    resourceName: volumeName,
  });

  return (
    <LineTemporalChart
      series={series}
      height={160}
      title="IOPS"
      startingTimeStamp={startingTimeStamp}
      yAxisType={'symmetrical'}
      yAxisTitle={YAXIS_TITLE_READ_WRITE}
      isLoading={isLoading}
      isLegendHided={false}
    />
  );
};

export const VolumeUsageChart = ({
  pvcName,
  namespace,
  volumeName,
}: {
  pvcName: string,
  namespace: string,
  volumeName: string,
}) => {
  const { series, startingTimeStamp, isLoading } = useSingleChartSerie({
    getQuery: (timeSpanProps: TimeSpanProps) =>
      getVolumeUsageQuery(pvcName, namespace, timeSpanProps),
    resourceName: volumeName,
  });

  return (
    <LineTemporalChart
      series={series}
      height={160}
      title="Usage"
      startingTimeStamp={startingTimeStamp}
      yAxisType={'percentage'}
      isLoading={isLoading}
      isLegendHided={false}
    />
  );
};
