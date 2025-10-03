import { ChartLegendWrapper } from '@scality/core-ui/dist/components/chartlegend/ChartLegendWrapper';
import {
  ChartLegend,
  LineTimeSerieChart,
  useMetricsTimeSpan,
} from '@scality/core-ui/dist/next';
import { useCallback, useMemo } from 'react';
import { UseQueryOptions } from 'react-query';
import { useSelector } from 'react-redux';
import { HEIGHT_DEFAULT_CHART, PORT_NODE_EXPORTER } from '../constants';
import { useChartSeries, useNodeAddressesSelector, useNodes } from '../hooks';
import {
  convertPrometheusResultToSerie,
  createColorSet,
  getNodesInterfacesString,
  getTimeFormatForInterval,
} from '../services/graphUtils';
import { QuantileTooltip } from './QuantileTooltip';

const NonSymmetricalQuantileChart = ({
  getQuantileQuery,
  getQuantileHoverQuery,
  title,
  yAxisType,
  helpText,
  unitRange,
}: {
  getQuantileQuery: (timeSpanProps: any, threshold: number) => UseQueryOptions;
  getQuantileHoverQuery: (
    timeSpanProps: any,
    threshold: number,
    operator?: '>' | '<',
    isOnHoverFetchingRequired?: boolean,
  ) => UseQueryOptions;
  title: string;
  yAxisType: 'default' | 'percentage';
  helpText?: string;
  unitRange?: {
    threshold: number;
    label: string;
  }[];
}) => {
  const { interval, duration } = useMetricsTimeSpan();

  const nodes = useNodes();
  const nodeAddresses = useNodeAddressesSelector(nodes);
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

  const nodeIPsInfo = useSelector((state: any) => state.app.nodes.IPsInfo);
  const devices = useMemo(() => {
    if (!nodeIPsInfo) {
      return []; // Return empty array if no nodeIPsInfo
    }
    return getNodesInterfacesString(nodeIPsInfo); // Keep as array for metrics functions
  }, [nodeIPsInfo]);
  const {
    isLoading: isLoadingQuantile,
    series: seriesQuantile,
    startingTimeStamp: startingTimeStampQuantile,
  } = useChartSeries({
    getQueries: (timeSpanProps) => [
      getQuantileQuery(timeSpanProps, 0.9),
      getQuantileQuery(timeSpanProps, 0.5),
      getQuantileQuery(timeSpanProps, 0.05),
    ],
    transformPrometheusDataToSeries: useCallback(
      ([
        prometheusResultQuantile5,
        prometheusResultMedian,
        prometheusResultQuantile90,
      ]) => {
        return [
          convertPrometheusResultToSerie(prometheusResultQuantile90, 'Q90'),
          convertPrometheusResultToSerie(prometheusResultMedian, 'Median'),
          convertPrometheusResultToSerie(prometheusResultQuantile5, 'Q5'),
        ];
      },
      [],
    ),
  });

  const { valueBase, unitLabel } = useMemo(() => {
    if (yAxisType === 'percentage') {
      return { valueBase: 1, unitLabel: '%' };
    }

    if (!unitRange || !seriesQuantile.length) {
      return { valueBase: 1, unitLabel: '' };
    }

    const allValues = seriesQuantile.flatMap((serie: any) =>
      serie.data
        .map(([_, value]: [number, any]) =>
          typeof value === 'string' ? parseFloat(value) : value,
        )
        .filter((v: any) => v !== null && !isNaN(v)),
    );

    const maxValue = Math.max(...allValues);
    const unit = unitRange
      .slice()
      .reverse()
      .find((range) => maxValue >= range.threshold);

    return {
      valueBase: unit ? unit.threshold || 1 : 1,
      unitLabel: unit ? unit.label : '',
    };
  }, [unitRange, seriesQuantile, yAxisType]);

  const timeFormat = useMemo(() => {
    return getTimeFormatForInterval(interval);
  }, [interval]);
  // Create custom tooltip renderer
  const renderTooltip = useCallback(
    (tooltipProps: any) => {
      return (
        <QuantileTooltip
          tooltipProps={tooltipProps}
          getQuantileHoverQuery={getQuantileHoverQuery as any}
          nodeMapPerIp={nodeMapPerIp}
          devices={devices}
          valueBase={valueBase}
          unitLabel={unitLabel}
          timeFormat={timeFormat}
        />
      );
    },
    [
      getQuantileHoverQuery,
      nodeMapPerIp,
      devices,
      valueBase,
      unitLabel,
      timeFormat,
    ],
  );

  const colorSet = useMemo(() => {
    return createColorSet(['Q90', 'Median', 'Q5']);
  }, []);

  return (
    <ChartLegendWrapper colorSet={colorSet}>
      <LineTimeSerieChart
        series={seriesQuantile}
        height={HEIGHT_DEFAULT_CHART}
        title={title}
        helpText={helpText}
        startingTimeStamp={startingTimeStampQuantile}
        interval={interval}
        duration={duration}
        yAxisType={yAxisType}
        isLoading={isLoadingQuantile}
        unitRange={unitRange}
        renderTooltip={renderTooltip}
      />
      <ChartLegend shape="line" legendSize="Smaller" />
    </ChartLegendWrapper>
  );
};

export default NonSymmetricalQuantileChart;
