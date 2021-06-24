import React from 'react';
import styled from 'styled-components';
import { useQuery } from 'react-query';
import { Button } from '@scality/core-ui';
import { padding } from '@scality/core-ui/dist/style/theme';
import { lighten, darken } from 'polished';
import { useIntl } from 'react-intl';

import { fetchConfig } from '../services/api';
import {
  useTypedSelector,
  useNodes,
  useMetricsTimeSpan,
  useNodeAddressesSelector,
} from '../hooks';
import {
  lineColor1,
  lineColor2,
  lineColor3,
  lineColor4,
  SAMPLE_DURATION_LAST_SEVEN_DAYS,
  REFRESH_METRICS_GRAPH,
} from '../constants';
import { getTooltipConfig } from './LinechartSpec';
import {
  GraphTitle as GraphTitleCommon,
  GraphWrapper as GraphWrapperCommon,
  PageSubtitle,
} from '../components/style/CommonLayoutStyle';
import { useDynamicChartSize } from '../services/utils';
import { expressionFunction } from 'vega';
import DashboardChartSystemLoad from './DashboardChartSystemLoad';
import DashboardChartThroughput from './DashboardChartThroughput';
import DashboardChartMemory from './DashboardChartMemory';
import DashboardChartCpuUsage from './DashboardChartCpuUsage';

// Custom formatter to display negative value as an absolute value in throughput chart
expressionFunction('throughputFormatter', function (datum) {
  return Math.abs(datum).toFixed(2);
});

const MetricsContainer = styled.div`
  padding: 2px ${padding.smaller};
  display: flex;
  flex-direction: column;
  flex-grow: 1;
`;

export const GraphWrapper = styled(GraphWrapperCommon)`
  position: relative;
  min-height: 90px;
  padding: 2px 0px;

  .sc-loader {
    background: none;
  }
`;

export const GraphTitle = styled(GraphTitleCommon)`
  padding-top: 0px;
  padding-left: ${padding.small};
`;

const GraphsWrapper = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  flex-grow: 1;
`;

const PanelActions = styled.div`
  display: flex;
  padding: ${padding.small};
  align-items: center;
  justify-content: space-between;
`;

// We use 4 main color from the palette and decline them (lighter/ darker) when we have more than 4 datasets
export const colorRange = [
  lineColor1,
  lineColor2,
  lineColor3,
  lineColor4,
  lighten(0.3, lineColor1),
  lighten(0.3, lineColor2),
  lighten(0.3, lineColor3),
  lighten(0.3, lineColor4),
  darken(0.2, lineColor1),
  darken(0.2, lineColor2),
  darken(0.2, lineColor3),
  darken(0.2, lineColor4),
];

const DashboardMetrics = () => {
  const theme = useTypedSelector((state) => state.config.theme);
  const nodeAddresses = useNodeAddressesSelector(useNodes());
  const [metricsTimeSpan] = useMetricsTimeSpan();
  const intl = useIntl();
  // Get dynamic chart size for 1 column, 4 rows
  const [graphWidth, graphHeight] = useDynamicChartSize(
    'dashboard-metrics-container',
    1,
    4,
  );

  const xAxis = {
    field: 'date',
    type: 'temporal',
    axis: {
      // Refer to all the available time format: https://github.com/d3/d3-time-format#locale_format
      format:
        metricsTimeSpan < SAMPLE_DURATION_LAST_SEVEN_DAYS
          ? '%m/%d %H:%M'
          : '%m/%d',
      ticks: true,
      tickCount: 4,
      labelColor: theme.textSecondary,
      labelFlush: 20,
    },
    title: null,
  };

  const perNodeColor = {
    field: 'type',
    type: 'nominal',
    scale: {
      range: colorRange,
    },
    legend: null,
  };

  const perNodeTooltip = getTooltipConfig(
    nodeAddresses.map((node) => ({
      field: node.name.replace('.', '\\.'),
      type: 'quantitative',
      title: node.name,
      format: '.2f',
    })),
  );

  const lineConfig = { strokeWidth: 1.5 };

  // App config, used to generated Advanced metrics button link
  const configQuery = useQuery('appConfig', fetchConfig);

  const chartsConfigProps = {
    metricsTimeSpan: metricsTimeSpan,
    xAxis: xAxis,
    perNodeColor: perNodeColor,
    graphWidth: graphWidth,
    graphHeight: graphHeight,
    lineConfig: lineConfig,
    perNodeTooltip: perNodeTooltip,
    reactQueryOptions: {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchInterval: REFRESH_METRICS_GRAPH,
      refetchIntervalInBackground: true,
    },
  };

  return (
    <MetricsContainer id="dashboard-metrics-container">
      <PanelActions>
        <PageSubtitle>{intl.formatMessage({ id: 'metrics' })}</PageSubtitle>
        {configQuery.isSuccess && configQuery.data.url_grafana && (
          <Button
            text={intl.formatMessage({ id: 'advanced_metrics' })}
            variant={'buttonSecondary'}
            icon={<i className="fas fa-external-link-alt" />}
            size={'small'}
            href={`${configQuery.data.url_grafana}/dashboard/db/nodes-detailed`}
            target="_blank"
            rel="noopener noreferrer"
            data-cy="advanced_metrics_node_detailed"
          />
        )}
      </PanelActions>
      <GraphsWrapper>
        {graphWidth !== 0 && (
          <>
            <DashboardChartCpuUsage {...chartsConfigProps} />
            <DashboardChartMemory {...chartsConfigProps} />
            <DashboardChartThroughput {...chartsConfigProps} />
            <DashboardChartSystemLoad {...chartsConfigProps} />
          </>
        )}
      </GraphsWrapper>
    </MetricsContainer>
  );
};

export default DashboardMetrics;
