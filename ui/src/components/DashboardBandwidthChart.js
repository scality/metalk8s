//@flow
import React, { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { LineTemporalChart } from '@scality/core-ui/dist/next';
import { UNIT_RANGE_BS } from '@scality/core-ui/dist/components/linetemporalchart/LineTemporalChart.component';
import { GraphWrapper } from './DashboardMetrics';
import {
  getMultipleSymmetricalSeries,
  getNodesInterfacesString,
} from '../services/graphUtils';
import { fetchNodesAction } from '../ducks/app/nodes';
import {
  useNodeAddressesSelector,
  useNodes,
  useSymetricalChartSeries,
} from '../hooks';
import {
  getNodesPlanesBandwidthInQuery,
  getNodesPlanesBandwidthOutQuery,
} from '../services/platformlibrary/metrics';

const DashboardBandwidthChart = ({
  title,
  plane,
}: {
  title: string,
  plane: 'controlPlane' | 'workloadPlane',
}) => {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(fetchNodesAction());
  }, [dispatch]);

  const nodeAddresses = useNodeAddressesSelector(useNodes());
  const nodeIPsInfo = useSelector((state) => state.app.nodes.IPsInfo);
  const devices = getNodesInterfacesString(nodeIPsInfo);

  const nodesPlaneInterface = {};
  for (const [key, value] of Object.entries(nodeIPsInfo)) {
    nodesPlaneInterface[key] =
      plane === 'controlPlane' ? value.controlPlane : value.workloadPlane;
  }

  const { isLoading, series, startingTimeStamp } = useSymetricalChartSeries({
    getQueryAbove: (timeSpanProps) =>
      getNodesPlanesBandwidthInQuery(timeSpanProps, devices),
    getQueryBelow: (timeSpanProps) =>
      getNodesPlanesBandwidthOutQuery(timeSpanProps, devices),
    transformPrometheusDataToSeries: useCallback(
      (prometheusResultAbove, prometheusResultBelow) => {
        return getMultipleSymmetricalSeries(
          prometheusResultAbove,
          prometheusResultBelow,
          'write',
          'read',
          nodeAddresses,
          nodesPlaneInterface,
        );
      },
      [JSON.stringify(nodeAddresses), JSON.stringify(nodesPlaneInterface)],
    ),
  });
  return (
    <GraphWrapper>
      <LineTemporalChart
        series={series}
        height={150}
        title={title}
        startingTimeStamp={startingTimeStamp}
        yAxisType={'symmetrical'}
        isLegendHided={false}
        isLoading={isLoading}
        unitRange={UNIT_RANGE_BS}
      />
    </GraphWrapper>
  );
};
export default DashboardBandwidthChart;
