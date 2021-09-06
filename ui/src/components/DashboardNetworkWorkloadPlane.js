import { useEffect, useRef } from 'react';
import { useQuery, UseQueryOptions } from 'react-query';
import { useStartingTimeStamp } from '../containers/StartTimeProvider';
import {
  queryWorkloadPlaneInAllInstances,
  queryWorkloadPlaneOutAllInstances,
} from '../services/prometheus/fetchMetrics';
import { useMetricsTimeSpan } from '@scality/core-ui/dist/next';
import { GraphWrapper } from './DashboardMetrics';
import { LineTemporalChart } from '@scality/core-ui/dist/next';
import { formatNodesWorkloadPlanePromRangeForChart } from '../services/graphUtils';
import { spacing } from '@scality/core-ui/dist/style/theme';
import styled from 'styled-components';
import { YAXIS_TITLE_IN_OUT } from '../constants';
import {
  useNodeAddressesSelector,
  useNodes,
  useNodesIPsSelector,
} from '../hooks';

const SpacedGraphWrapper = styled(GraphWrapper)`
  margin-top: ${spacing.sp20};
`;

const DashboardNetworkWorkloadPlane = (props: UseQueryOptions) => {
  const nodeAddresses = useNodeAddressesSelector(useNodes());
  const nodesIPsInfo = useNodesIPsSelector();
  const { startingTimeISO, currentTimeISO } = useStartingTimeStamp();
  const startTimeRef = useRef(startingTimeISO);
  const { sampleFrequency } = useMetricsTimeSpan();
  const chartStartTimeRef = useRef(startingTimeISO);
  const seriesRef = useRef();

  const workloadPlaneQuery = useQuery({
    queryKey: ['workloadPlaneQuery', nodeAddresses, startingTimeISO],
    queryFn: () => {
      startTimeRef.current = startingTimeISO;
      return Promise.all([
        Promise.all(
          queryWorkloadPlaneInAllInstances(
            sampleFrequency,
            startingTimeISO,
            currentTimeISO,
            nodesIPsInfo,
            nodeAddresses,
          ),
        ),
        Promise.all(
          queryWorkloadPlaneOutAllInstances(
            sampleFrequency,
            startingTimeISO,
            currentTimeISO,
            nodesIPsInfo,
            nodeAddresses,
          ),
        ),
      ]).then((result) => {
        return formatNodesWorkloadPlanePromRangeForChart(result);
      });
    },
  });

  console.log({ workloadPlaneQuery });

  const isDataLoading =
    workloadPlaneQuery.status === 'loading' ||
    (workloadPlaneQuery.data.length === 0 &&
      workloadPlaneQuery.status === 'success');

  useEffect(() => {
    if (!isDataLoading) {
      chartStartTimeRef.current = startTimeRef.current;
      seriesRef.current = workloadPlaneQuery.data;
    }
  }, [isDataLoading, nodeAddresses, workloadPlaneQuery.data]);

  return (
    <div>
      <SpacedGraphWrapper>
        <LineTemporalChart
          series={seriesRef.current || []}
          height={80}
          title="Workload Plane Bandwidth"
          startingTimeStamp={Date.parse(chartStartTimeRef.current) / 1000}
          yAxisType={'symmetrical'}
          unitRange={[
            { threshold: 0, label: 'B/s' },
            { threshold: 1024, label: 'KiB/s' },
            { threshold: 1024 * 1024, label: 'MiB/s' },
            { threshold: 1024 * 1024 * 1024, label: 'GiB/s' },
            { threshold: 1024 * 1024 * 1024 * 1024, label: 'TiB/s' },
          ]}
          yAxisTitle={YAXIS_TITLE_IN_OUT}
          isLegendHided={false}
          isLoading={isDataLoading}
        />
      </SpacedGraphWrapper>
    </div>
  );
};

export default DashboardNetworkWorkloadPlane;
