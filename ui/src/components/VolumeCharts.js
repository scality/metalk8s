import React, { useCallback } from 'react';
import { LineTemporalChart } from '@scality/core-ui/dist/next';
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
import type { TimeSpanProps } from '../services/platformlibrary/metrics';
import {
  UNIT_RANGE_BS,
  YAXIS_TITLE_READ_WRITE,
} from '@scality/core-ui/dist/components/linetemporalchart/LineTemporalChart.component';
import { useSingleChartSerie, useSymetricalChartSeries } from '../hooks';

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
    transformPrometheusDataToSeries: useCallback(
      (prometheusResultAbove, prometheusResultBelow) =>
        getSeriesForSymmetricalChart(
          prometheusResultAbove,
          prometheusResultBelow,
          volumeName,
          'write',
          'read',
        ),
      [volumeName],
    ),
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
    transformPrometheusDataToSeries: useCallback(
      (prometheusResultAbove, prometheusResultBelow) =>
        getSeriesForSymmetricalChart(
          prometheusResultAbove,
          prometheusResultBelow,
          volumeName,
          'write',
          'read',
        ),
      [volumeName],
    ),
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
    transformPrometheusDataToSeries: useCallback(
      (prometheusResultAbove, prometheusResultBelow) =>
        getSeriesForSymmetricalChart(
          prometheusResultAbove,
          prometheusResultBelow,
          volumeName,
          'write',
          'read',
        ),
      [volumeName],
    ),
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
    transformPrometheusDataToSeries: useCallback(
      (prometheusResult) =>
        getSingleResourceSerie(prometheusResult, volumeName),
      [volumeName],
    ),
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
