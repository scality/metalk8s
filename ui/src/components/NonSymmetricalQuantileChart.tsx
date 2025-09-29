import { ChartLegendWrapper } from '@scality/core-ui/dist/components/chartlegend/ChartLegendWrapper';
import {
  ChartLegend,
  LineTimeSerieChart,
  useMetricsTimeSpan,
} from '@scality/core-ui/dist/next';
import { useCallback, useMemo } from 'react';
import { UseQueryOptions } from 'react-query';
import { useSelector } from 'react-redux';
import { PORT_NODE_EXPORTER } from '../constants';
import { useChartSeries, useNodeAddressesSelector, useNodes } from '../hooks';
import {
  convertPrometheusResultToSerie,
  createColorSet,
  getNodesInterfacesString,
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
        prometheusResultQuantile90,
        prometheusResultMedian,
        prometheusResultQuantile5,
      ]) => {
        console.log(
          'DEBUG Memory quantile data Q90:',
          prometheusResultQuantile90,
        );
        console.log(
          'DEBUG Memory quantile data Q5:',
          prometheusResultQuantile5,
        );
        console.log(
          'DEBUG Memory quantile data Median:',
          prometheusResultMedian,
        );
        //TODO Quantile are reversed Q05>Q90 instead of Q90>Q05
        //TODO Need to explore cause of this
        // QUICK POSSIBLEFIX: Swap labels because Prometheus queries return backwards quantile data
        // prometheusResultQuantile90 actually contains Q5 data (low values)
        // prometheusResultQuantile5 actually contains Q90 data (high values)
        return [
          convertPrometheusResultToSerie(prometheusResultQuantile90, 'Q90'),
          convertPrometheusResultToSerie(prometheusResultMedian, 'Median'),
          convertPrometheusResultToSerie(prometheusResultQuantile5, 'Q5'),
        ];
      },
      [],
    ),
  });

  // Calculate unit base and label
  const valueBase = useMemo(() => {
    if (!unitRange || !seriesQuantile.length) return 1;

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

    return unit ? unit.threshold || 1 : 1;
  }, [unitRange, seriesQuantile]);

  const unitLabel = useMemo(() => {
    if (!unitRange || !seriesQuantile.length) return '';

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

    return unit ? unit.label : '';
  }, [unitRange, seriesQuantile]);

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
          timeFormat="date-time"
        />
      );
    },
    [getQuantileHoverQuery, nodeMapPerIp, devices, valueBase, unitLabel],
  );

  const colorSet = useMemo(() => {
    return createColorSet(['Q90', 'Median', 'Q5']);
  }, []);

  title === 'Memory' &&
    console.log(
      'DEBUG Memory NonSymmetricalQuantileChart',
      seriesQuantile,
      colorSet,
    );

  return (
    <ChartLegendWrapper colorSet={colorSet}>
      <LineTimeSerieChart
        series={seriesQuantile}
        height={80}
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
