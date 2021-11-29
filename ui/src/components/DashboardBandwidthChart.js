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
  getNodesPlanesBandwidthInAboveBelowThresholdQuery,
  getNodesPlanesBandwidthInQuantileQuery,
  getNodesPlanesBandwidthInQuery,
  getNodesPlanesBandwidthOutAboveBelowThresholdQuery,
  getNodesPlanesBandwidthOutQuantileQuery,
  getNodesPlanesBandwidthOutQuery,
} from '../services/platformlibrary/metrics';
import SymmetricalQuantileChart from './SymmetricalQuantileChart';

const DashboardBandwidthChartWithoutQuantile = ({
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
    getAboveQueries: (timeSpanProps) => [
      getNodesPlanesBandwidthInQuery(timeSpanProps, devices),
    ],
    getBelowQueries: (timeSpanProps) => [
      getNodesPlanesBandwidthOutQuery(timeSpanProps, devices),
    ],
    transformPrometheusDataToSeries: useCallback(
      (prometheusResultAbove, prometheusResultBelow) => {
        if (!prometheusResultAbove[0] || !prometheusResultBelow[0]) {
          return [];
        }
        return getMultipleSymmetricalSeries(
          prometheusResultAbove[0],
          prometheusResultBelow[0],
          'in',
          'out',
          nodeAddresses,
          nodesPlaneInterface,
        );
      },
      [JSON.stringify(nodeAddresses), JSON.stringify(nodesPlaneInterface)],
    ),
  });
  return (
    <LineTemporalChart
      series={series}
      height={150}
      title={title}
      startingTimeStamp={startingTimeStamp}
      yAxisType={'symmetrical'}
      yAxisTitle={'in(+) / out(-)'}
      isLegendHided={false}
      isLoading={isLoading}
      unitRange={UNIT_RANGE_BS}
    />
  );
};

const DashboardBandwidthChart = ({
  title,
  plane,
  isShowQuantileChart,
}: {
  title: string,
  plane: 'controlPlane' | 'workloadPlane',
  isShowQuantileChart: boolean,
}) => {
  return (
    <GraphWrapper>
      {isShowQuantileChart ? (
        <SymmetricalQuantileChart
          getAboveQuantileQuery={getNodesPlanesBandwidthInQuantileQuery}
          getBelowQuantileQuery={getNodesPlanesBandwidthOutQuantileQuery}
          getAboveQuantileHoverQuery={
            getNodesPlanesBandwidthInAboveBelowThresholdQuery
          }
          getBelowQuantileHoverQuery={
            getNodesPlanesBandwidthOutAboveBelowThresholdQuery
          }
          metricPrefixAbove={'in'}
          metricPrefixBelow={'out'}
          title={title}
          yAxisTitle={'in(+) / out(-)'}
        />
      ) : (
        <DashboardBandwidthChartWithoutQuantile title={title} plane={plane} />
      )}
    </GraphWrapper>
  );
};

export default DashboardBandwidthChart;
