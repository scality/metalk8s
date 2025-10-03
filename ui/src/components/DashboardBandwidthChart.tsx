import { Stack } from '@scality/core-ui';
import {
  ChartLegend,
  ChartLegendWrapper,
  LineTimeSerieChart,
  useMetricsTimeSpan,
} from '@scality/core-ui/dist/next';
import { fontSize } from '@scality/core-ui/dist/style/theme';
import { useCallback, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchNodesAction } from '../ducks/app/nodes';
import {
  useNodeAddressesSelector,
  useNodeColors,
  useNodes,
  useShowQuantileChart,
  useSymetricalChartSeries,
} from '../hooks';
import {
  getMultipleSymmetricalSeries,
  getNodesInterfacesString,
} from '../services/graphUtils';
import {
  getNodesPlanesBandwidthInOutpassingThresholdQuery,
  getNodesPlanesBandwidthInQuantileQuery,
  getNodesPlanesBandwidthInQuery,
  getNodesPlanesBandwidthOutOutpassingThresholdQuery,
  getNodesPlanesBandwidthOutQuantileQuery,
  getNodesPlanesBandwidthOutQuery,
} from '../services/platformlibrary/metrics';
import SymmetricalQuantileChart from './SymmetricalQuantileChart';
import { HEIGHT_SYMMETRICAL_CHART, UNIT_RANGE_BS } from '../constants';

const DashboardBandwidthChartWithoutQuantile = ({
  title,
  plane,
}: {
  title: string;
  plane: 'controlPlane' | 'workloadPlane';
}) => {
  const nodes = useNodes();
  const nodeAddresses = useNodeAddressesSelector(nodes);
  // @ts-expect-error - FIXME when you are working on it
  const nodeIPsInfo = useSelector((state) => state.app.nodes.IPsInfo);
  const devices = getNodesInterfacesString(nodeIPsInfo);
  const nodesPlaneInterface = useMemo(() => {
    const nodesPlaneInterface = {};
    for (const [key, value] of Object.entries(nodeIPsInfo)) {
      nodesPlaneInterface[key] =
        // @ts-expect-error - FIXME when you are working on it
        plane === 'controlPlane' ? value.controlPlane : value.workloadPlane;
    }
    return nodesPlaneInterface;
  }, [nodeIPsInfo, plane]);

  const { interval, duration } = useMetricsTimeSpan();

  const { isLoading, series, startingTimeStamp } = useSymetricalChartSeries({
    getAboveQueries: (timeSpanProps) => [
      getNodesPlanesBandwidthInQuery(timeSpanProps, devices),
    ],
    getBelowQueries: (timeSpanProps) => [
      getNodesPlanesBandwidthOutQuery(timeSpanProps, devices),
    ],
    // @ts-expect-error - FIXME when you are working on it
    transformPrometheusDataToSeries: useCallback(
      ([prometheusResultAbove], [prometheusResultBelow]) => {
        if (!prometheusResultAbove || !prometheusResultBelow) {
          return [];
        }

        const allSeries = getMultipleSymmetricalSeries(
          prometheusResultAbove,
          prometheusResultBelow,
          'in',
          'out',
          nodeAddresses,
          nodesPlaneInterface,
        );

        return allSeries;
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [JSON.stringify(nodeAddresses), JSON.stringify(nodesPlaneInterface)],
    ),
  });
  const colorSet = useNodeColors(nodes);

  return (
    <ChartLegendWrapper colorSet={colorSet}>
      <Stack direction="vertical" gap="r1" style={{ fontSize: fontSize.small }}>
        <LineTimeSerieChart
          series={{
            above: series.above,

            below: series.below,
          }}
          unitRange={UNIT_RANGE_BS}
          height={HEIGHT_SYMMETRICAL_CHART}
          interval={interval}
          duration={duration}
          title={title}
          startingTimeStamp={startingTimeStamp}
          yAxisType={'symmetrical'}
          yAxisTitle={'in(+) / out(-)'}
          isLoading={isLoading}
          syncId="dashboard"
        />

        <ChartLegend shape="line" legendSize={'Smaller'} />
      </Stack>
    </ChartLegendWrapper>
  );
};

const DashboardBandwidthChart = ({
  title,
  plane,
}: {
  title: string;
  plane: 'controlPlane' | 'workloadPlane';
}) => {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(fetchNodesAction());
  }, [dispatch]);
  const { isShowQuantileChart } = useShowQuantileChart();

  return (
    <>
      {isShowQuantileChart ? (
        <SymmetricalQuantileChart
          getAboveQuantileQuery={getNodesPlanesBandwidthInQuantileQuery}
          getBelowQuantileQuery={getNodesPlanesBandwidthOutQuantileQuery}
          getAboveQuantileHoverQuery={
            getNodesPlanesBandwidthInOutpassingThresholdQuery
          }
          getBelowQuantileHoverQuery={
            getNodesPlanesBandwidthOutOutpassingThresholdQuery
          }
          metricPrefixAbove={'in'}
          metricPrefixBelow={'out'}
          title={title}
          yAxisTitle={'in(+) / out(-)'}
        />
      ) : (
        <DashboardBandwidthChartWithoutQuantile title={title} plane={plane} />
      )}
    </>
  );
};

export default DashboardBandwidthChart;
