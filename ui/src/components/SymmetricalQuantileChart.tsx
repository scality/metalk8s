import { ChartLegendWrapper } from '@scality/core-ui/dist/components/chartlegend/ChartLegendWrapper';
import { UNIT_RANGE_BS } from '@scality/core-ui/dist/components/linetemporalchart/LineTemporalChart.component';
import {
  ChartLegend,
  LineTimeSerieChart,
  useMetricsTimeSpan,
} from '@scality/core-ui/dist/next';
import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { HEIGHT_SYMMETRICAL_CHART, PORT_NODE_EXPORTER } from '../constants';
import {
  useNodeAddressesSelector,
  useNodes,
  useSymetricalChartSeries,
} from '../hooks';
import {
  createSymmetricalQuantileColorSet,
  getNodesInterfacesString,
  getQuantileSymmetricalSeries,
  getTimeFormatForInterval,
} from '../services/graphUtils';
import { SymmetricalQuantileTooltip } from './SymmetricalQuantileTooltip';

const SymmetricalQuantileChart = ({
  getAboveQuantileQuery,
  getBelowQuantileQuery,
  getAboveQuantileHoverQuery,
  getBelowQuantileHoverQuery,
  metricPrefixAbove,
  metricPrefixBelow,
  title,
  yAxisTitle,
}: {
  getAboveQuantileQuery;
  getBelowQuantileQuery;
  getAboveQuantileHoverQuery;
  getBelowQuantileHoverQuery;
  metricPrefixAbove: string;
  metricPrefixBelow: string;
  title: string;
  yAxisTitle: string;
}) => {
  const { interval, duration } = useMetricsTimeSpan();

  // Get nodeIPsInfo for devices (still needed for quantile queries)
  const nodes = useNodes();
  const nodeAddresses = useNodeAddressesSelector(nodes);
  const nodeIPsInfo = useSelector((state: any) => state.app.nodes.IPsInfo);
  const devices = useMemo(() => {
    if (!nodeIPsInfo) {
      return []; // Return empty array if no nodeIPsInfo
    }
    return getNodesInterfacesString(nodeIPsInfo); // Keep as array for metrics functions
  }, [nodeIPsInfo]);
  const nodeMapPerIp = useMemo(
    () =>
      nodeAddresses.reduce(
        (agg, current) => ({
          ...agg,
          [current.internalIP + `:${PORT_NODE_EXPORTER}`]: current.name,
        }),
        {},
      ),
    [nodeAddresses],
  );
  const {
    isLoading: isLoadingQuantile,
    series: seriesQuantile,
    startingTimeStamp: startingTimeStampQuantile,
  } = useSymetricalChartSeries({
    getAboveQueries: (timeSpanProps) => [
      getAboveQuantileQuery(timeSpanProps, 0.05, devices),
      getAboveQuantileQuery(timeSpanProps, 0.5, devices),
      getAboveQuantileQuery(timeSpanProps, 0.9, devices),
    ],
    getBelowQueries: (timeSpanProps) => [
      getBelowQuantileQuery(timeSpanProps, 0.05, devices),
      getBelowQuantileQuery(timeSpanProps, 0.5, devices),
      getBelowQuantileQuery(timeSpanProps, 0.9, devices),
    ],
    // @ts-expect-error - FIXME when you are working on it
    transformPrometheusDataToSeries: useCallback(
      (prometheusResultAbove, prometheusResultBelow) => {
        if (!prometheusResultAbove || !prometheusResultBelow) {
          return [];
        }

        if (prometheusResultAbove && prometheusResultBelow) {
          return getQuantileSymmetricalSeries(
            prometheusResultAbove,
            prometheusResultBelow,
            metricPrefixAbove,
            metricPrefixBelow,
          );
        }

        return [];
      },
      [metricPrefixAbove, metricPrefixBelow],
    ),
  });

  const { valueBase, unitLabel } = useMemo(() => {
    if (!seriesQuantile.above?.length && !seriesQuantile.below?.length) {
      return { valueBase: 1, unitLabel: '' };
    }

    const allSeries = [
      ...(seriesQuantile.above || []),
      ...(seriesQuantile.below || []),
    ];
    const allValues = allSeries.flatMap((serie: any) =>
      serie.data
        .map(([_, value]: [number, any]) =>
          typeof value === 'string' ? parseFloat(value) : Math.abs(value),
        )
        .filter((v: any) => v !== null && !isNaN(v)),
    );

    const maxValue = Math.max(...allValues);
    const unit = UNIT_RANGE_BS.slice()
      .reverse()
      .find((range: any) => maxValue >= range.threshold);

    return {
      valueBase: unit ? unit.threshold || 1 : 1,
      unitLabel: unit ? unit.label : '',
    };
  }, [seriesQuantile]);

  const colorSet = useMemo(() => {
    return createSymmetricalQuantileColorSet(
      seriesQuantile.above || [],
      seriesQuantile.below || [],
    );
  }, [seriesQuantile]);

  const timeFormat = useMemo(() => {
    return getTimeFormatForInterval(interval);
  }, [interval]);
  return (
    <ChartLegendWrapper colorSet={colorSet}>
      <LineTimeSerieChart
        series={{
          above: seriesQuantile.above || [],
          below: seriesQuantile.below || [],
        }}
        height={HEIGHT_SYMMETRICAL_CHART}
        title={title}
        startingTimeStamp={startingTimeStampQuantile}
        interval={interval}
        duration={duration}
        isLoading={isLoadingQuantile}
        yAxisType={'symmetrical'}
        yAxisTitle={yAxisTitle}
        unitRange={UNIT_RANGE_BS}
        renderTooltip={(tooltipProps) => {
          return (
            <SymmetricalQuantileTooltip
              tooltipProps={tooltipProps}
              metricPrefixAbove={metricPrefixAbove}
              metricPrefixBelow={metricPrefixBelow}
              valueBase={valueBase}
              unitLabel={unitLabel}
              timeFormat={timeFormat}
              getAboveQuantileHoverQuery={getAboveQuantileHoverQuery}
              getBelowQuantileHoverQuery={getBelowQuantileHoverQuery}
              nodeMapPerIp={nodeMapPerIp}
              devices={devices}
            />
          );
        }}
      />
      <ChartLegend shape="line" legendSize="Smaller" />
    </ChartLegendWrapper>
  );
};

export default SymmetricalQuantileChart;
