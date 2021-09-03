import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useQuery, UseQueryOptions } from 'react-query';
import { useStartingTimeStamp } from '../containers/StartTimeProvider';
import {
  queryControlPlaneInAllInstances,
  queryControlPlaneOutAllInstances,
} from '../services/prometheus/fetchMetrics';
import { useMetricsTimeSpan } from '@scality/core-ui/dist/next';
import { GraphWrapper } from './DashboardMetrics';
import { LineTemporalChart } from '@scality/core-ui/dist/next';
import { formatNodesControlPlanePromRangeForChart } from '../services/graphUtils';
import { YAXIS_TITLE_IN_OUT } from '../constants';
import { useNodeAddressesSelector, useNodes } from '../hooks';

const DashboardNetworkControlPlane = (props: UseQueryOptions) => {
  const nodeAddresses = useNodeAddressesSelector(useNodes());
  const nodesIPsInfo = useSelector((state) => state.app.nodes.IPsInfo);
  const { startingTimeISO, currentTimeISO } = useStartingTimeStamp();
  const startTimeRef = useRef(startingTimeISO);
  const { sampleFrequency } = useMetricsTimeSpan();
  const chartStartTimeRef = useRef(startingTimeISO);
  const seriesRef = useRef();

  const controlPlaneQuery = useQuery({
    queryKey: ['controlPlaneQuery', nodeAddresses, startingTimeISO],
    queryFn: () => {
      startTimeRef.current = startingTimeISO;
      return Promise.all([
        Promise.all(
          queryControlPlaneInAllInstances(
            sampleFrequency,
            startingTimeISO,
            currentTimeISO,
            nodesIPsInfo,
            nodeAddresses,
          ),
        ),
        Promise.all(
          queryControlPlaneOutAllInstances(
            sampleFrequency,
            startingTimeISO,
            currentTimeISO,
            nodesIPsInfo,
            nodeAddresses,
          ),
        ),
      ]).then((result) => {
        return formatNodesControlPlanePromRangeForChart(result);
      });
    },
  });

  const isDataLoading = controlPlaneQuery.status === 'loading';

  useEffect(() => {
    if (!isDataLoading) {
      chartStartTimeRef.current = startTimeRef.current;
      seriesRef.current = controlPlaneQuery.data;
    }
  }, [isDataLoading, nodeAddresses, controlPlaneQuery.data]);

  return (
    <div>
      <GraphWrapper>
        <LineTemporalChart
          series={seriesRef.current || []}
          height={80}
          title="Control Plane Bandwidth"
          startingTimeStamp={Date.parse(chartStartTimeRef.current) / 1000}
          yAxisType={'symmetrical'}
          unitRange={[
            { threshold: 0, label: 'B/s' },
            { threshold: 1024, label: 'KiB/s' },
            { threshold: 1024 * 1024, label: 'MiB/s' },
            { threshold: 1024 * 1024 * 1024, label: 'GiB/s' },
            { threshold: 1024 * 1024 * 1024 * 1024, label: 'TiB/s' },
          ]}
          yAxisTitle = {YAXIS_TITLE_IN_OUT}
          isLegendHided={false}
          isLoading={isDataLoading}
        />
      </GraphWrapper>
    </div>
  );
};

export default DashboardNetworkControlPlane;
