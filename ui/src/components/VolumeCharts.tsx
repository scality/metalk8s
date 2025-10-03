import {
  LineTimeSerieChart,
  useMetricsTimeSpan,
  useChartId,
} from '@scality/core-ui/dist/next';
import { useCallback } from 'react';
import {
  HEIGHT_DEFAULT_CHART,
  UNIT_RANGE_BS,
  UNIT_RANGE_SECONDS,
  YAXIS_TITLE_READ_WRITE,
} from '../constants';
import { useSingleChartSerie, useSymetricalChartSeries } from '../hooks';
import {
  convertPrometheusResultToSerieWithAverage,
  getSeriesForSymmetricalChart,
} from '../services/graphUtils';
import type { TimeSpanProps } from '../services/platformlibrary/metrics';
import {
  getVolumeIOPSReadQuery,
  getVolumeIOPSWriteQuery,
  getVolumeLatencyReadQuery,
  getVolumeLatencyWriteQuery,
  getVolumeThroughputReadQuery,
  getVolumeThroughputWriteQuery,
  getVolumeUsageQuery,
} from '../services/platformlibrary/metrics';
import { useChartLegendRegistration } from '../hooks/useChartLegendRegistration';

const VOLUME_SYNC_ID = 'volume';

export const VolumeThroughputChart = ({
  instanceIp,
  deviceName,
  volumeName,
}: {
  instanceIp: string;
  deviceName: string;
  volumeName: string;
}) => {
  const chartId = useChartId();
  const { interval, duration } = useMetricsTimeSpan();
  const { series, startingTimeStamp, isLoading } = useSymetricalChartSeries({
    getAboveQueries: (timeSpanProps: TimeSpanProps) => [
      getVolumeThroughputWriteQuery(instanceIp, deviceName, timeSpanProps),
    ],
    getBelowQueries: (timeSpanProps: TimeSpanProps) => [
      getVolumeThroughputReadQuery(instanceIp, deviceName, timeSpanProps),
    ],
    transformPrometheusDataToSeries: useCallback(
      ([prometheusResultAbove], [prometheusResultBelow]) => {
        const allSeries = getSeriesForSymmetricalChart(
          prometheusResultAbove,
          prometheusResultBelow,
          volumeName,
          'write',
          'read',
        );

        return allSeries;
      },
      [volumeName],
    ),
  });

  useChartLegendRegistration({ chartId, series, isSymmetrical: true });

  return (
    <LineTimeSerieChart
      series={series}
      height={160}
      interval={interval}
      duration={duration}
      title="Disk Throughput"
      startingTimeStamp={startingTimeStamp}
      yAxisType={'symmetrical'}
      yAxisTitle={YAXIS_TITLE_READ_WRITE}
      unitRange={UNIT_RANGE_BS}
      isLoading={isLoading}
      syncId={VOLUME_SYNC_ID}
    />
  );
};
export const VolumeLatencyChart = ({
  instanceIp,
  deviceName,
  volumeName,
}: {
  instanceIp: string;
  deviceName: string;
  volumeName: string;
}) => {
  const chartId = useChartId();
  const { interval, duration } = useMetricsTimeSpan();
  const { series, startingTimeStamp, isLoading } = useSymetricalChartSeries({
    getAboveQueries: (timeSpanProps: TimeSpanProps) => [
      getVolumeLatencyWriteQuery(instanceIp, deviceName, timeSpanProps),
    ],
    getBelowQueries: (timeSpanProps: TimeSpanProps) => [
      getVolumeLatencyReadQuery(instanceIp, deviceName, timeSpanProps),
    ],
    transformPrometheusDataToSeries: useCallback(
      ([prometheusResultAbove], [prometheusResultBelow]) => {
        const allSeries = getSeriesForSymmetricalChart(
          prometheusResultAbove,
          prometheusResultBelow,
          volumeName,
          'write',
          'read',
        );

        return allSeries;
      },
      [volumeName],
    ),
  });

  useChartLegendRegistration({ chartId, series, isSymmetrical: true });

  return (
    <LineTimeSerieChart
      series={series}
      height={160}
      interval={interval}
      duration={duration}
      title="Disk Latency"
      startingTimeStamp={startingTimeStamp}
      yAxisType={'symmetrical'}
      yAxisTitle={YAXIS_TITLE_READ_WRITE}
      unitRange={UNIT_RANGE_SECONDS}
      isLoading={isLoading}
      syncId={VOLUME_SYNC_ID}
    />
  );
};
export const VolumeIOPSChart = ({
  instanceIp,
  deviceName,
  volumeName,
}: {
  instanceIp: string;
  deviceName: string;
  volumeName: string;
}) => {
  const chartId = useChartId();
  const { interval, duration } = useMetricsTimeSpan();
  const { series, startingTimeStamp, isLoading } = useSymetricalChartSeries({
    getAboveQueries: (timeSpanProps: TimeSpanProps) => [
      getVolumeIOPSWriteQuery(instanceIp, deviceName, timeSpanProps),
    ],
    getBelowQueries: (timeSpanProps: TimeSpanProps) => [
      getVolumeIOPSReadQuery(instanceIp, deviceName, timeSpanProps),
    ],
    transformPrometheusDataToSeries: useCallback(
      ([prometheusResultAbove], [prometheusResultBelow]) => {
        const allSeries = getSeriesForSymmetricalChart(
          prometheusResultAbove,
          prometheusResultBelow,
          volumeName,
          'write',
          'read',
        );

        return allSeries;
      },
      [volumeName],
    ),
  });

  useChartLegendRegistration({ chartId, series, isSymmetrical: true });

  return (
    <LineTimeSerieChart
      series={series}
      height={160}
      interval={interval}
      duration={duration}
      title="IOPS"
      startingTimeStamp={startingTimeStamp}
      yAxisType={'symmetrical'}
      yAxisTitle={YAXIS_TITLE_READ_WRITE}
      isLoading={isLoading}
      syncId={VOLUME_SYNC_ID}
    />
  );
};
export const VolumeUsageChart = ({
  pvcName,
  namespace,
  volumeName,
}: {
  pvcName: string;
  namespace: string;
  volumeName: string;
}) => {
  const chartId = useChartId();
  const { interval, duration } = useMetricsTimeSpan();
  const { series, startingTimeStamp, isLoading } = useSingleChartSerie({
    getQuery: (timeSpanProps: TimeSpanProps) =>
      getVolumeUsageQuery(pvcName, namespace, timeSpanProps),
    transformPrometheusDataToSeries: useCallback(
      (prometheusResult) =>
        convertPrometheusResultToSerieWithAverage(prometheusResult, volumeName),
      [volumeName],
    ),
  });

  useChartLegendRegistration({ chartId, series, isSymmetrical: false });

  return (
    <LineTimeSerieChart
      series={series}
      height={HEIGHT_DEFAULT_CHART}
      interval={interval}
      duration={duration}
      title="Usage"
      startingTimeStamp={startingTimeStamp}
      yAxisType={'percentage'}
      isLoading={isLoading}
      syncId={VOLUME_SYNC_ID}
    />
  );
};
