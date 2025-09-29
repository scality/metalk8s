import React, { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { UNIT_RANGE_BS } from '@scality/core-ui/dist/components/linetemporalchart/LineTemporalChart.component';
import {
  LineTimeSerieChart,
  useMetricsTimeSpan,
  ChartLegend,
} from '@scality/core-ui/dist/next';
import { ChartLegendWrapper } from '@scality/core-ui/dist/components/chartlegend/ChartLegendWrapper';
import { PORT_NODE_EXPORTER } from '../constants';
import {
  useNodeAddressesSelector,
  useNodes,
  useSymetricalChartSeries,
} from '../hooks';
import {
  createColorSet,
  getNodesInterfacesString,
  getQuantileSymmetricalSeries,
} from '../services/graphUtils';
import { QuantileTooltip } from './QuantileTooltip';

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
  console.log('DEBUG SymmetricalQuantileChart');

  // Create node mappings
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

  // Calculate unit base (using first series data)
  const valueBase = useMemo(() => {
    if (!seriesQuantile.above?.length && !seriesQuantile.below?.length)
      return 1;

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

    return unit ? unit.threshold || 1 : 1;
  }, [seriesQuantile]);

  const unitLabel = useMemo(() => {
    if (!seriesQuantile.above?.length && !seriesQuantile.below?.length)
      return '';

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

    return unit ? unit.label : '';
  }, [seriesQuantile]);

  // Create separate tooltip renderers for above/below
  const renderAboveTooltip = useCallback(
    (tooltipProps: any) => {
      return (
        <QuantileTooltip
          tooltipProps={tooltipProps}
          getQuantileHoverQuery={getAboveQuantileHoverQuery as any}
          nodeMapPerIp={nodeMapPerIp}
          devices={devices}
          valueBase={valueBase}
          unitLabel={unitLabel}
          timeFormat="date-time"
        />
      );
    },
    [getAboveQuantileHoverQuery, nodeMapPerIp, devices, valueBase, unitLabel],
  );

  const renderBelowTooltip = useCallback(
    (tooltipProps: any) => {
      return (
        <QuantileTooltip
          tooltipProps={tooltipProps}
          getQuantileHoverQuery={getBelowQuantileHoverQuery as any}
          nodeMapPerIp={nodeMapPerIp}
          devices={devices}
          valueBase={valueBase}
          unitLabel={unitLabel}
          timeFormat="date-time"
        />
      );
    },
    [getBelowQuantileHoverQuery, nodeMapPerIp, devices, valueBase, unitLabel],
  );
  const colorSet = useMemo(() => {
    const allSeriesNames = [
      seriesQuantile.above.map((s: any) => s.resource || s.name),
      seriesQuantile.below.map((s: any) => s.resource || s.name),
    ];
    return createColorSet(allSeriesNames.flat());
  }, [seriesQuantile]);
  return (
    <ChartLegendWrapper colorSet={colorSet}>
      <ChartLegend shape="line" legendSize="Smaller" />
      <LineTimeSerieChart
        series={{
          above: seriesQuantile.above || [],
          below: seriesQuantile.below || [],
        }}
        height={150}
        title={title}
        startingTimeStamp={startingTimeStampQuantile}
        interval={interval}
        duration={duration}
        isLoading={isLoadingQuantile}
        yAxisType={'symmetrical'}
        yAxisTitle={yAxisTitle}
        unitRange={UNIT_RANGE_BS}
        renderTooltip={(tooltipProps) => {
          // Determine if this is above or below series based on the data
          const payload = tooltipProps.payload || [];
          const hasNegativeValues = payload.some(
            (entry: any) => entry.value && Number(entry.value) < 0,
          );

          return hasNegativeValues
            ? renderBelowTooltip(tooltipProps)
            : renderAboveTooltip(tooltipProps);
        }}
      />
      <ChartLegend shape="line" legendSize="Smaller" />
    </ChartLegendWrapper>
  );
};

export default SymmetricalQuantileChart;
