import React, { useEffect, useRef } from 'react';
import { UseQueryOptions } from 'react-query';
import { GraphWrapper } from './DashboardMetrics';
import {
  LineTemporalChart,
  useMetricsTimeSpan,
} from '@scality/core-ui/dist/next';
import { useTypedSelector } from '../hooks';
import { formatNodesControlPlanePromRangeForChart } from '../services/graphUtils';

const DashboardNetworkControlPlane = (props: UseQueryOptions) => {
  const { startingTimeISO, currentTimeISO } = useStartingTimeStamp();
  const { sampleFrequency } = useMetricsTimeSpan();
  const startTimeRef = useRef(startingTimeISO);
  const chartStartTimeRef = useRef(startingTimeISO); //IMPORTANT: the ref of the previous start time
  const seriesRef = useRef();
  const nodeStats = useTypedSelector(
    (state) => state.app.monitoring.nodeStats.metrics,
  );

  console.log(nodeStats);

  return (
    <GraphWrapper>
      <LineTemporalChart
        series={formatNodesControlPlanePromRangeForChart([
          ...nodeStats.controlPlaneNetworkBandwidthIn,
          ...nodeStats.controlPlaneNetworkBandwidthOut,
        ])}
        title="Control Plane"
        height={150}
        yAxisType={'symmetrical'}
        unitRange={[
          { threshold: 0, label: 'B/s' },
          { threshold: 1024, label: 'KiB/s' },
          { threshold: 1024 * 1024, label: 'MiB/s' },
          { threshold: 1024 * 1024 * 1024, label: 'GiB/s' },
          { threshold: 1024 * 1024 * 1024 * 1024, label: 'TiB/s' },
        ]}
        startingTimeStamp={Date.parse(chartStartTimeRef.current) / 1000}
        isLegendHided={false}
        yAxisTitle={'write(+) / read(-)'}
        isLoading={false}
      />
    </GraphWrapper>
  );
};

export default DashboardNetworkControlPlane;
