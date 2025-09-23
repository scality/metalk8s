import {
  LineTimeSerieChart,
  useMetricsTimeSpan,
  useChartId,
} from '@scality/core-ui/dist/next';
import { useChartLegend } from '@scality/core-ui/dist/components/chartlegend/ChartLegendWrapper';

import { useCallback, useEffect } from 'react';
import {
  useNodeAddressesSelector,
  useNodes,
  useShowQuantileChart,
  useSymetricalChartSeries,
} from '../hooks';
import {
  getNodesThroughputOutpassingThresholdQuery,
  getNodesThroughputReadQuantileQuery,
  getNodesThroughputReadQuery,
  getNodesThroughputWriteOutpassingThresholdQuery,
  getNodesThroughputWriteQuantileQuery,
  getNodesThroughputWriteQuery,
} from '../services/platformlibrary/metrics';
import { getMultipleSymmetricalSeries } from '../services/graphUtils';
import SymmetricalQuantileChart from './SymmetricalQuantileChart';
import { UNIT_RANGE_BS, YAXIS_TITLE_READ_WRITE } from '../constants';

const DashboardChartThroughput = () => {
  const { isShowQuantileChart } = useShowQuantileChart();
  return (
    <>
      {isShowQuantileChart ? (
        <SymmetricalQuantileChart
          getAboveQuantileQuery={getNodesThroughputWriteQuantileQuery}
          getBelowQuantileQuery={getNodesThroughputReadQuantileQuery}
          getAboveQuantileHoverQuery={
            getNodesThroughputWriteOutpassingThresholdQuery
          }
          getBelowQuantileHoverQuery={
            getNodesThroughputOutpassingThresholdQuery
          }
          metricPrefixAbove={'write'}
          metricPrefixBelow={'read'}
          title={'Disk Throughput'}
          yAxisTitle={YAXIS_TITLE_READ_WRITE}
        />
      ) : (
        <DashboardChartThroughputWithoutQuantile />
      )}
    </>
  );
};

const DashboardChartThroughputWithoutQuantile = () => {
  const chartId = useChartId();
  const { register } = useChartLegend();
  const nodes = useNodes();
  const nodeAddresses = useNodeAddressesSelector(nodes);

  const { interval, duration } = useMetricsTimeSpan();
  const { isLoading, series, startingTimeStamp } = useSymetricalChartSeries({
    getAboveQueries: (timeSpanProps) => [
      // @ts-expect-error - FIXME when you are working on it
      getNodesThroughputWriteQuery(timeSpanProps),
    ],
    getBelowQueries: (timeSpanProps) => [
      // @ts-expect-error - FIXME when you are working on it
      getNodesThroughputReadQuery(timeSpanProps),
    ],
    transformPrometheusDataToSeries: useCallback(
      ([prometheusResultAbove], [prometheusResultBelow]) => {
        if (!prometheusResultAbove || !prometheusResultBelow) {
          return {
            above: [],
            below: [],
          };
        }

        const allSeries = getMultipleSymmetricalSeries(
          prometheusResultAbove,
          prometheusResultBelow,
          'write',
          'read',
          nodeAddresses,
        );

        const aboveSeries = allSeries.filter(
          (serie) => serie.metricPrefix === 'write',
        );

        const belowSeries = allSeries.filter(
          (serie) => serie.metricPrefix === 'read',
        );
        return {
          above: aboveSeries,
          below: belowSeries,
        };
      },
      //Expect warning because of complex dependency
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [JSON.stringify(nodeAddresses)],
    ),
  });

  // Register series names for symmetrical chart (above + below series)
  useEffect(() => {
    if (series && (series.above?.length > 0 || series.below?.length > 0)) {
      const aboveNames = series.above?.map((s) => s.resource) || [];
      const belowNames = series.below?.map((s) => s.resource) || [];
      const allSeriesNames = [...aboveNames, ...belowNames];
      register(chartId, allSeriesNames);
    }
  }, [chartId, register, series]);

  return (
    <LineTimeSerieChart
      series={{
        above: series.above,
        below: series.below,
      }}
      height={150}
      unitRange={UNIT_RANGE_BS}
      interval={interval}
      duration={duration}
      title="Disk Throughput"
      startingTimeStamp={startingTimeStamp}
      yAxisType={'symmetrical'}
      yAxisTitle={YAXIS_TITLE_READ_WRITE}
      isLoading={isLoading}
      syncId="dashboard"
    />
  );
};

export default DashboardChartThroughput;
